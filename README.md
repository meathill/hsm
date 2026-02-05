# Meathill HSM

[![CI](https://github.com/meathill/hsm/actions/workflows/ci.yml/badge.svg)](https://github.com/meathill/hsm/actions/workflows/ci.yml)

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
