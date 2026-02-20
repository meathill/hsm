# Meathill HSM

[![CI](https://github.com/meathill/hsm/actions/workflows/ci.yml/badge.svg)](https://github.com/meathill/hsm/actions/workflows/ci.yml)

[English](./README_EN.md) | 中文

软件定义的密钥管理系统 (Hardware Security Module)，基于 Cloudflare Worker + KV 实现。

## 功能特性

- 安全存储客户密钥
- 信封加密 (Envelope Encryption)
- 密钥分片设计，增强安全性
- HMAC-SHA256 存储索引混淆
- AES-GCM-256 AEAD 加密防篡改
- **零信任设计 (Zero-Trust)**：服务端无法解密用户数据
- **无感跨域直连**：原生支持 CORS，前端直传直取，彻底摆脱后端中转

## 为什么你的数据在这里绝对安全？

传统的存储方案常常需要你信任服务提供商不偷看你的数据。但 Meathill HSM 采用 **“零信任” (Zero-Trust)** 的密码学设计，从数学上保证了即使服务端被攻破，或者服务提供商存在主观恶意，你的数据也完全无法被解密或篡改：

1. **拿不到完整的钥匙**：你的数据受 KEK 加密，而 KEK 由服务端的 `CF_SECRET_PART` (Part A) 和你自己在客户端持有的 `X-HSM-Secret` (Part B) 共同派生生成。服务端不保存 Part B，因此服务端**永远**凑不齐完整的解密钥匙。
2. **拿走了数据也没用**：就算有人黑进了 Cloudflare KV 数据库并拖库，里面存的只是一堆完全随机的乱码数据，在没有你的 `X-HSM-Secret` 的情况下，这些加密数据几乎不可能被暴力破解。
3. **想篡改/覆盖/删除你的数据？做梦**：系统使用 AES-GCM-256 AEAD 进行底层加密，这不仅保证内容的保密，还会验证数据的“完整性”。任何人试图覆盖或者删除你的数据时，系统都会先用请求中附带的密钥进行一次后台解密尝试。如果解密失败（身份/密钥不符），请求直接报错 403 被拦截。
4. **连你存了什么键名都不知道**：你存的路径（`path`）在数据库里被 HMAC-SHA256 混淆处理了。即便查看数据库，也只能看到一长串哈希值，无法逆向推测出你原本存的是什么路径业务名。

## 如何在前端（Web 环境）直接使用？

为了让全流程更加安全透明，HSM 服务原生放开了所有 **CORS 跨域限制** 并支持 `OPTIONS` 预检请求。这意味着你可以直接在浏览器的前端代码中（如 React, Vue, Vanilla JS）向 HSM 发起请求存取数据，**无需经过你自己的后端服务器中转**，从而杜绝了因为中间商泄露 `X-HSM-Secret` 的可能性。

### 前端直连示例 (Fetch API)

**存储数据**
```javascript
async function saveMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-HSM-Secret': 'my-super-secret-client-key' // 唯有你知道的秘密
    },
    body: JSON.stringify({ value: 'the-data-i-want-to-protect' })
  });

  if (response.ok) {
    console.log('数据安全入库！');
  }
}
```

**获取数据**
```javascript
async function getMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'GET',
    headers: {
      'X-HSM-Secret': 'my-super-secret-client-key' // 用同一把钥匙解密
    }
  });

  const result = await response.json();
  if (result.success) {
    console.log('取得解密后的数据：', result.data.value);
  }
}
```

**修改/覆盖数据**
修改数据和“存储数据”调用的是同一个 `PUT` 接口，但安全机制要求你必须提供**之前存入时相同的 `X-HSM-Secret`**，否则覆盖操作会被直接拒绝（403 Forbidden）。

```javascript
async function updateMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-HSM-Secret': 'my-super-secret-client-key' // 必须与原先存储时的密钥相同
    },
    body: JSON.stringify({ value: 'my-new-updated-data' })
  });

  if (response.ok) {
    console.log('数据成功更新！');
  } else {
    console.error('更新失败，可能是密钥错误（无权修改）');
  }
}
```

**删除数据**
同样，删除操作也需要你提交正确的 `X-HSM-Secret`。

```javascript
async function deleteMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'DELETE',
    headers: {
      'X-HSM-Secret': 'my-super-secret-client-key' // 必须与原先存储时的密钥相同
    }
  });

  if (response.ok) {
    console.log('数据已安全销毁！');
  }
}
```

由于我们限制了单次存储的值长度不得超过 **8192** 字符，您可以放心地将各种 Token、隐私配置、或是小型的加密通信秘钥直接存入。

## 运行环境

- Cloudflare Worker + KV

## API 接口

### 存储密钥

```http
PUT /keys/:path
Content-Type: application/json
X-HSM-Secret: <调用方密钥>

{
  "value": "my-secret-key-value"
}
```

### 获取密钥

```http
GET /keys/:path
X-HSM-Secret: <调用方密钥>
```

### 删除密钥

```http
DELETE /keys/:path
X-HSM-Secret: <调用方密钥>
```

## 安全设计

### 密钥分片

KEK（Key Encryption Key）通过 HKDF 从以下部分派生：
- **Part A**：HSM 服务的密钥，存储在 Cloudflare Worker 环境变量 `CF_SECRET_PART`
- **Part B**：调用方的密钥，通过 `X-HSM-Secret` 请求头传递
- **Salt**：每次加密随机生成

**安全保证**：
- HSM 服务不知道调用方的密钥 → 无法单独解密
- 调用方不知道 HSM 服务的密钥 → 拿到 KV 数据也无法解密
- 只有通过 HSM 服务，且提供正确的 `X-HSM-Secret`，才能解密

### 信封加密

1. 生成随机 DEK（Data Encryption Key）
2. 使用 DEK + AES-GCM-256 加密数据
3. 使用 KEK + AES-GCM-256 加密 DEK
4. 存储加密后的 DEK 和数据

### AAD（附加认证数据）

使用密钥路径作为 AAD，防止密钥互换攻击。

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `INDEX_SECRET` | HMAC 索引混淆密钥 |
| `CF_SECRET_PART` | HSM 服务密钥（Part A） |

## 请求头

| 请求头 | 说明 |
|--------|------|
| `X-HSM-Secret` | 调用方密钥（Part B） |

## 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 本地开发
pnpm dev

# 部署
pnpm deploy
```

## 测试覆盖

当前测试覆盖包括：
- 编码工具 (Base64, UTF-8)
- HMAC-SHA256 索引生成
- HKDF 密钥派生
- AES-GCM 加解密
- 信封加密完整流程
- API 端点集成测试
