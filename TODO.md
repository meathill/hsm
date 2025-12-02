Project background
---

我现在要开发一个系统，用来实现客户某些关键系的加密存储和解密输出。
我的计划是：
1. 客户生成密钥，他们要妥善保存
2. 把客户的密钥加密存储到我们的 KV 数据库
3. 需要的时候，取出并解密，返回给客户
4. 这是一个内部系统，只有内部服务能访问，内部服务用 Cloudflare Zero Trust 鉴权；开发阶段用测试实例
我计划使用 Cloudflare Worker+KV来实现这个功能。我希望我们在很大程度上应该可以替代工业标准的HSM。如果将来有必要，我们再想办法迁移到工业标准的平台，比如 AWS。
我想跟你讨论的是，关于存储有没有什么办法能够让我们的加密更稳固。我能想到的是，针对一个密钥，通过它的路径构建一个存储Key，然后对Key进行一次不可逆的加密，比如 sha256，然后再存储可以双向加解密的密钥。这样用户即使拿到了存储的数据他也不知道这个数据是干嘛的。而且他通过存储Key也没有办法来猜测这个密钥是什么。

Design
----

这是一个非常经典且高风险的工程挑战。首先，必须先泼一盆冷水（为了安全）：**Cloudflare Worker + KV 不能完全替代硬件 HSM (Hardware Security Module)。**

HSM 的核心价值在于**私钥永远不出硬件**，所有的加密操作都在那个黑盒子里完成。而使用 Worker，密钥在解密的那一瞬间，必须以明文形式存在于 Worker 的**内存**中。如果 Cloudflare 的底层基础设施被攻破，或者你的 Worker 运行时被恶意注入，内存中的密钥是有泄露风险的。

但是，对于初创公司和内部系统，**“软件定义的 KMS（密钥管理系统）”** 是一个非常务实且高性价比的选择。只要设计得当，其安全性足以防御绝大多数常规攻击。

针对你的方案，我有一些具体的优化建议，从“存储安全”提升到“架构安全”。

### 1\. 针对你提出的“存储 Key 混淆”的优化

你提到的方案是：`SHA256(Path/ID) -> KV_Key`。这是一个很好的\*\*“数据隔离”\*\*（Obfuscation）手段，防止攻击者通过 KV 的 Listing 猜测数据归属。

**改进建议：使用 HMAC 而不是简单的 Hash。**

* **问题**：如果攻击者知道你们的 Path 规则（例如 `user_123`），他可以在本地算出 `SHA256('user_123')`，然后去 KV 数据库里碰撞，这被称为“彩虹表攻击”或“字典攻击”。
* **对策**：使用 HMAC-SHA256。
  * 你需要在这个 Worker 的环境变量（Secrets）里存一个 `INDEX_SECRET`。
  * 存储 Key = `HMAC(Path/ID, INDEX_SECRET)`。
  * 这样，即使攻击者拿到了全量的 KV 数据，如果没有这个 `INDEX_SECRET`，他连这行数据属于哪个用户都算不出来。

### 2\. 核心架构升级：信封加密 (Envelope Encryption)

不要直接用一个全局的主密钥（Master Key）去加密所有客户的密钥。如果这个主密钥泄露（比如 Cloudflare 环境变量泄露），所有数据瞬间“裸奔”。

**建议采用“信封加密”模型：**

1.  **KEK (Key Encryption Key)**: 主密钥，存储在 Cloudflare Secrets 中，或者通过下文第3点的方式动态构建。
2.  **DEK (Data Encryption Key)**: 数据密钥。为每一个客户（甚至每一个存储项）随机生成一个独立的 AES-256 密钥。
3.  **流程**：
  * 生成随机的 DEK。
  * 用 DEK 加密客户的 Payload（客户密钥）。
  * 用 KEK 加密 DEK。
  * **存储在 KV 中的内容** = `加密后的DEK` + `加密后的Payload` + `IV/Nonce`。

这样，即使某个特定的 DEK 泄露，也只影响那一条数据。

### 3\. 最关键的提升：密钥分片 (Key Splitting) / 密钥派生

这是我能提供的最有价值的建议。为了防止 Cloudflare 内部人员或者拥有 Cloudflare 账号权限的人作恶，你应该引入\*\*“由于缺乏完整上下文而无法解密”\*\*的机制。

**不要把 KEK（主密钥）完整地放在 Cloudflare Secrets 里。**

* **方案**：
  * **Part A**: 存在 Cloudflare Worker Secrets 里的环境变量（例如 `CF_SECRET_PART`）。
  * **Part B**: 每次请求内部服务时，由调用方（你的内部服务）在 HTTP Header 中通过 HTTPS 传输过来的一个固定密钥（例如 `REQUEST_HEADER_SECRET`）。
* **运行时构建 KEK**：
  * Worker 收到请求后，将 `Part A` 和 `Part B` 拼接。
  * 通过 HKDF (HMAC-based Key Derivation Function) 算法计算出最终的 KEK。
  * `KEK = HKDF(CF_SECRET_PART + REQUEST_HEADER_SECRET + Salt)`
  * 使用这个临时的 KEK 去解密 KV 中的数据。
* **效果**：
  * 如果有人黑进了你的 Cloudflare 后台，看到了 KV 数据和环境变量，**他解不开数据**，因为他缺少调用方传来的那个 Header。
  * 如果有人截获了网络请求，看到了 Header，但他没有 Cloudflare 的环境变量，**他也解不开数据**。
  * 这实现了**多方安全计算**的雏形。

### 4\. 加密算法的选择：必须使用 AEAD

在 Worker 中使用 Web Crypto API (`crypto.subtle`) 时，**严禁使用 ECB 模式，不建议使用 CBC 模式**。

* **必须使用**：**AES-GCM** (Galois/Counter Mode) 或 **ChaCha20-Poly1305**。
* **原因**：这些是 **AEAD** (Authenticated Encryption with Associated Data) 算法。它们不仅加密数据，还验证数据的**完整性**。
* **场景**：如果有人恶意篡改了 KV 里的加密字符串（比如改了几个字节），如果用普通的 AES 解密，可能会解出一堆乱码甚至导致系统崩溃；而用 AES-GCM，解密函数会直接抛出“认证失败”错误，保证你不会吐出错误的密钥给客户。

### 5\. 防重放与上下文绑定 (AAD)

AES-GCM 允许你传入 `Additional Data` (AAD)。这部分数据不加密，但是参与签名验证。

* **利用点**：在加密时，把“客户ID”或“Key的路径”作为 AAD 传入。
* **效果**：如果攻击者把 A 用户的加密数据，复制粘贴覆盖到了 B 用户的 KV 记录里。
  * 当你读取 B 用户的记录试图解密时。
  * 程序以为这是 B 用户，用 B 的 ID 去做校验。
  * AES-GCM 会发现数据的签名是基于 A 用户的 ID 生成的，从而**拒绝解密**。
  * 这防止了\*\*“密钥互换攻击”\*\*。

### 6\. 最终的 KV 数据结构设计

建议存入 KV 的 Value 是一个 JSON 序列化后的结构（或者 Protobuf）：

```json
{
  "v": 1,                 // 版本号，为了将来迁移算法留后路
  "dek_enc": "...",       // 被 KEK 加密后的 DEK (Base64)
  "iv": "...",            // AES-GCM 的随机 Nonce (Base64)
  "payload_enc": "...",   // 被 DEK 加密后的客户密钥 (Base64)
  "aad_hash": "..."       // 用于验证上下文的 hash (可选，如果用了AEAD其实不需要存)
}
```

### 总结建议的 Action Plan：

1.  **传输层**：利用 Cloudflare Access (Zero Trust) 锁死调用方 IP 和身份。
2.  **存储层**：KV Key 使用 **HMAC-SHA256** 混淆。
3.  **加密层**：使用 **AES-GCM-256**。
4.  **密钥管理**：实施 **Split Key 策略**（一部分在 Env，一部分在 Request Header），并在运行时使用 HKDF 合成。
5.  **完整性**：将 Key 的 Path/ID 作为 **AAD** 传入加密算法，防止被挪用。
