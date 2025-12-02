# Mizu HSM

软件定义的密钥管理系统 (Hardware Security Module)，基于 Cloudflare Worker + KV 实现。

## 功能特性

- 安全存储客户密钥
- 信封加密 (Envelope Encryption)
- 密钥分片设计，增强安全性
- HMAC-SHA256 存储索引混淆
- AES-GCM-256 AEAD 加密

## 运行环境

- Cloudflare Worker + KV

## API 接口

### 服务注册

```http
POST /services
Content-Type: application/json

{
  "name": "my-service"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "serviceId": "uuid",
    "partA": "base64-encoded-secret",
    "partB": "base64-encoded-secret"
  }
}
```

- `partA`：配置到 Cloudflare Worker 环境变量 `CF_SECRET_PART`
- `partB`：由调用方保管，每次请求时通过 `X-HSM-Secret` 头传递

### 获取服务信息

```http
GET /services/:serviceId
```

### 存储密钥

```http
PUT /keys/:path
Content-Type: application/json
X-HSM-Secret: <partB>

{
  "value": "my-secret-key-value"
}
```

### 获取密钥

```http
GET /keys/:path
X-HSM-Secret: <partB>
```

### 删除密钥

```http
DELETE /keys/:path
X-HSM-Secret: <partB>
```

## 安全设计

### 密钥分片

KEK（Key Encryption Key）通过 HKDF 从以下部分派生：
- `partA`：存储在 Cloudflare Worker 环境变量
- `partB`：由调用方通过 `X-HSM-Secret` 请求头传递
- `salt`：每次加密随机生成

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
| `CF_SECRET_PART` | 密钥分片 Part A |

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
