# Meathill HSM

[![CI](https://github.com/meathill/hsm/actions/workflows/ci.yml/badge.svg)](https://github.com/meathill/hsm/actions/workflows/ci.yml)

English | [中文](./README.md)

A software-defined Hardware Security Module (HSM) built on Cloudflare Worker + KV.

## Features

- Secure storage for client secrets
- Envelope Encryption
- Key splitting design for enhanced security
- HMAC-SHA256 storage index obfuscation
- AES-GCM-256 AEAD encryption with tamper-proofing
- **Zero-Trust Design**: The server cannot decrypt user data
- **Seamless Cross-Origin Access**: Native CORS support for direct frontend communication

## Why Is Your Data Absolutely Safe Here?

Traditional storage solutions require you to trust the service provider not to peek at your data. Meathill HSM adopts a **Zero-Trust** cryptographic design that mathematically guarantees your data cannot be decrypted or tampered with, even if the server is compromised or the provider acts maliciously:

1. **No one holds the complete key**: Your data is encrypted by a KEK, which is derived from both the server's `CF_SECRET_PART` (Part A) and your client-side `X-HSM-Secret` (Part B). The server never stores Part B, so it can **never** assemble the full decryption key.
2. **Stolen data is useless**: Even if someone hacks into the Cloudflare KV database and dumps everything, it's just random encrypted noise. Without your `X-HSM-Secret`, brute-forcing the encryption is practically impossible.
3. **Tampering, overwriting, or deleting your data? No way**: The system uses AES-GCM-256 AEAD for encryption, which ensures both confidentiality and data integrity. Any attempt to overwrite or delete your data triggers a background decryption check. If it fails (wrong identity/key), the request is rejected with a 403 error.
4. **Even your key paths are hidden**: The paths you store are obfuscated with HMAC-SHA256 in the database. Even browsing the database only reveals hash values — the original path names cannot be reversed.

## How to Use Directly from the Frontend (Web)?

For maximum security transparency, the HSM service natively enables full **CORS cross-origin access** and supports `OPTIONS` preflight requests. This means you can send requests directly from your browser-side code (React, Vue, Vanilla JS) to store and retrieve data, **without going through your own backend server**, eliminating the risk of `X-HSM-Secret` leakage through intermediaries.

### Frontend Direct Access Examples (Fetch API)

**Store Data**
```javascript
async function saveMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-HSM-Secret': 'my-super-secret-client-key' // Only you know this secret
    },
    body: JSON.stringify({ value: 'the-data-i-want-to-protect' })
  });

  if (response.ok) {
    console.log('Data stored securely!');
  }
}
```

**Retrieve Data**
```javascript
async function getMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'GET',
    headers: {
      'X-HSM-Secret': 'my-super-secret-client-key' // Use the same key to decrypt
    }
  });

  const result = await response.json();
  if (result.success) {
    console.log('Decrypted data:', result.data.value);
  }
}
```

**Update/Overwrite Data**
Updating data uses the same `PUT` endpoint as storing, but the security mechanism requires you to provide **the same `X-HSM-Secret` used during initial storage**. Otherwise, the overwrite is rejected (403 Forbidden).

```javascript
async function updateMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-HSM-Secret': 'my-super-secret-client-key' // Must match the original key
    },
    body: JSON.stringify({ value: 'my-new-updated-data' })
  });

  if (response.ok) {
    console.log('Data updated successfully!');
  } else {
    console.error('Update failed — possibly wrong key (unauthorized)');
  }
}
```

**Delete Data**
Similarly, deleting requires the correct `X-HSM-Secret`.

```javascript
async function deleteMySecret() {
  const response = await fetch('https://<your-hsm-worker-url>/keys/my-app/user-1/token', {
    method: 'DELETE',
    headers: {
      'X-HSM-Secret': 'my-super-secret-client-key' // Must match the original key
    }
  });

  if (response.ok) {
    console.log('Data securely destroyed!');
  }
}
```

The maximum value length per storage is **8192** characters. You can safely store various tokens, private configurations, or small encryption keys.

## Runtime Environment

- Cloudflare Worker + KV

## API Endpoints

### Store Secret

```http
PUT /keys/:path
Content-Type: application/json
X-HSM-Secret: <client-secret>

{
  "value": "my-secret-key-value"
}
```

### Retrieve Secret

```http
GET /keys/:path
X-HSM-Secret: <client-secret>
```

### Delete Secret

```http
DELETE /keys/:path
X-HSM-Secret: <client-secret>
```

## Security Design

### Key Splitting

KEK (Key Encryption Key) is derived via HKDF from:
- **Part A**: HSM service secret, stored in Cloudflare Worker environment variable `CF_SECRET_PART`
- **Part B**: Client secret, passed via `X-HSM-Secret` request header
- **Salt**: Randomly generated for each encryption

**Security Guarantees**:
- The HSM service doesn't know the client secret → cannot decrypt alone
- The client doesn't know the HSM service secret → cannot decrypt raw KV data
- Only through the HSM service with the correct `X-HSM-Secret` can data be decrypted

### Envelope Encryption

1. Generate a random DEK (Data Encryption Key)
2. Encrypt data with DEK + AES-GCM-256
3. Encrypt DEK with KEK + AES-GCM-256
4. Store the encrypted DEK and data

### AAD (Additional Authenticated Data)

The key path is used as AAD to prevent key-swap attacks.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `INDEX_SECRET` | HMAC index obfuscation key |
| `CF_SECRET_PART` | HSM service secret (Part A) |

## Request Headers

| Header | Description |
|--------|-------------|
| `X-HSM-Secret` | Client secret (Part B) |

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Local development
pnpm dev

# Deploy
pnpm deploy
```

## Test Coverage

Current test coverage includes:
- Encoding utilities (Base64, UTF-8)
- HMAC-SHA256 index generation
- HKDF key derivation
- AES-GCM encryption/decryption
- Full envelope encryption flow
- API endpoint integration tests
