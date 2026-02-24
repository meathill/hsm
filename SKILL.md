---
name: meathill-hsm-service-guide
description: Use this skill when a user wants to store sensitive user data in the deployed Meathill HSM service (without building their own HSM) and needs practical integration and security guidance.
---

# Meathill HSM Service Guide Skill

## Use This Skill When

- User wants encrypted storage for app/user secrets but does not want to build or operate their own HSM.
- User asks how to use the deployed HSM API (`PUT/GET/DELETE /keys/:path`) safely.
- User needs clear explanation of why data is safe in this service.
- User asks for MCP usage to call the hosted HSM via AI clients.

## First Message Template

Start with this framing before code samples:

- This is a managed HSM-style encryption storage service, so user does not need to self-host an HSM.
- Data is encrypted using envelope encryption and key splitting.
- Decryption requires both server secret (`CF_SECRET_PART`) and caller secret (`X-HSM-Secret`), so the service cannot decrypt user data by itself.
- Suitable for tokens, API keys, private config, and small secrets (single value limit: 8192 chars).

## Integration Workflow

1. Confirm the service base URL (deployed worker endpoint).
2. Define how caller stores `X-HSM-Secret` (never hardcode; use environment/secret manager).
3. Design key path convention (for example: `app/{tenantId}/{purpose}`).
4. Implement `PUT /keys/:path` + `GET /keys/:path` + `DELETE /keys/:path`.
5. Add error handling:
   - `400`: invalid input / missing header
   - `403`: wrong secret for an existing key
   - `404`: key not found
6. Add rotation strategy (versioned path such as `.../token/v2`).

## API Contract To Teach

- `PUT /keys/:path`
  - Header: `X-HSM-Secret`
  - Body: `{ "value": "<secret>" }`
  - Use for create and overwrite (overwrite requires same secret ownership check).
- `GET /keys/:path`
  - Header: `X-HSM-Secret`
- `DELETE /keys/:path`
  - Header: `X-HSM-Secret`

## Recommended SDK Wrapper (JavaScript)

```javascript
const HSM_BASE_URL = process.env.HSM_BASE_URL;
const HSM_SECRET = process.env.HSM_SECRET;

async function hsmPut(path, value) {
  const res = await fetch(`${HSM_BASE_URL}/keys/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-HSM-Secret': HSM_SECRET,
    },
    body: JSON.stringify({ value }),
  });
  return res.json();
}

async function hsmGet(path) {
  const res = await fetch(`${HSM_BASE_URL}/keys/${encodeURIComponent(path)}`, {
    headers: { 'X-HSM-Secret': HSM_SECRET },
  });
  return res.json();
}
```

## MCP Guidance

- `mcp.json` is a paste-ready MCP client config that exposes hosted HSM via MCP tools.
- User only needs to set:
  - `HSM_BASE_URL`: deployed service URL
  - `HSM_SECRET`: caller secret used as `X-HSM-Secret`
- Tools:
  - `hsm_put_key`
  - `hsm_get_key`
  - `hsm_delete_key`

## Non-Negotiable Security Guidance

- Never print `X-HSM-Secret` in logs, errors, screenshots, or chat messages.
- Always use HTTPS endpoint.
- Use separate secrets per app/tenant/environment when possible.
- Do not store oversized payloads; split data or store references.
- Tell users clearly: service stores ciphertext; without caller secret, plaintext cannot be recovered.
