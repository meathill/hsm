/**
 * 密钥存储和检索处理器
 */

import { deriveKEK, envelopeDecrypt, envelopeEncrypt, generateSalt, generateStorageKey } from '../crypto';
import type { ApiResponse, EncryptedPayload, HsmEnv, StoreKeyRequest } from '../types';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils/encoding';

const KEY_PREFIX = 'key:';
const HSM_SECRET_HEADER = 'X-HSM-Secret';
/** 单次存储的值长度上限（字符）。MCP 桥 `scripts/hsm-mcp-stdio.mjs` 有镜像校验，改动需同步。 */
export const MAX_VALUE_LENGTH = 8192;

type StoredEnvelope = { salt: string } & EncryptedPayload;

function toPayload(stored: StoredEnvelope): EncryptedPayload {
  return { v: stored.v, dekEnc: stored.dekEnc, iv: stored.iv, payloadEnc: stored.payloadEnc };
}

/** 生成 KV 存储 key（HMAC-SHA256 混淆业务路径）。 */
export function getStorageKey(path: string, indexSecret: string): Promise<string> {
  return generateStorageKey(path, indexSecret).then((digest) => KEY_PREFIX + digest);
}

/**
 * 用调用方密钥试解密存量 envelope，验证其对该 key 的所有权。
 * 成功则静默返回，失败抛 `Forbidden` 开头的错误（调用方转为 403）。
 */
export async function verifyKeyOwnership(
  partA: string,
  partB: string,
  stored: StoredEnvelope,
  path: string,
): Promise<void> {
  try {
    const oldKek = await deriveKEK(partA, partB, base64ToArrayBuffer(stored.salt));
    await envelopeDecrypt(oldKek, toPayload(stored), path);
  } catch {
    throw new Error('Forbidden: Incorrect secret for existing key');
  }
}

/** 统一错误响应体（调用方按 `Forbidden` 前缀区分 403/400）。 */
export function errorResponse(error: unknown): Response {
  const isForbidden = error instanceof Error && error.message.startsWith('Forbidden');
  const response: ApiResponse = {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
  return new Response(JSON.stringify(response), {
    status: isForbidden ? 403 : 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function consumeRequestBodySilently(request: Request): Promise<void> {
  if (request.bodyUsed) {
    return;
  }
  try {
    await request.arrayBuffer();
  } catch {
    // Ignore body read failures in best-effort cleanup path.
  }
}

/**
 * 从请求中提取密钥分片
 */
function getSecretParts(request: Request, env: HsmEnv): { partA: string; partB: string } {
  const partB = request.headers.get(HSM_SECRET_HEADER);
  if (!partB) {
    throw new Error(`Missing ${HSM_SECRET_HEADER} header`);
  }
  return {
    partA: env.CF_SECRET_PART,
    partB,
  };
}

/**
 * 存储密钥
 */
export async function handleKeyStore(request: Request, env: HsmEnv, path: string): Promise<Response> {
  try {
    const partB = request.headers.get(HSM_SECRET_HEADER);
    if (!partB) {
      // Drain body before early return to avoid workerd stream warnings.
      await consumeRequestBodySilently(request);
      throw new Error(`Missing ${HSM_SECRET_HEADER} header`);
    }
    const partA = env.CF_SECRET_PART;
    const body = await request.json<StoreKeyRequest>();

    if (!body.value) {
      throw new Error('Missing "value" in request body');
    }
    if (body.value.length > MAX_VALUE_LENGTH) {
      throw new Error(`Value exceeds maximum length of ${MAX_VALUE_LENGTH} characters`);
    }

    // 1. 生成存储 Key (HMAC-SHA256 混淆)
    const storageKey = await getStorageKey(path, env.INDEX_SECRET);

    // 验证原所有权 (覆盖保护)
    const existingData = await env.KV.get(storageKey);
    if (existingData) {
      const stored = JSON.parse(existingData) as StoredEnvelope;
      await verifyKeyOwnership(partA, partB, stored, path);
    }

    // 2. 生成盐值并派生 KEK
    const salt = generateSalt();
    const kek = await deriveKEK(partA, partB, salt);

    // 3. 使用信封加密加密数据
    const payload = await envelopeEncrypt(kek, body.value, path);

    // 4. 存储数据（包含盐值）
    const dataToStore = {
      salt: arrayBufferToBase64(salt),
      ...payload,
    };
    await env.KV.put(storageKey, JSON.stringify(dataToStore));

    const response: ApiResponse = {
      success: true,
      data: { path },
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * 获取密钥
 */
export async function handleKeyGet(request: Request, env: HsmEnv, path: string): Promise<Response> {
  try {
    const { partA, partB } = getSecretParts(request, env);

    // 1. 生成存储 Key
    const storageKey = await getStorageKey(path, env.INDEX_SECRET);

    // 2. 获取存储的数据
    const data = await env.KV.get(storageKey);
    if (!data) {
      const response: ApiResponse = {
        success: false,
        error: 'Key not found',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. 解析数据
    const stored = JSON.parse(data) as StoredEnvelope;
    const salt = base64ToArrayBuffer(stored.salt);

    // 4. 派生 KEK
    const kek = await deriveKEK(partA, partB, salt);

    // 5. 解密数据
    const value = await envelopeDecrypt(kek, toPayload(stored), path);

    const response: ApiResponse = {
      success: true,
      data: { path, value },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * 删除密钥
 */
export async function handleKeyDelete(request: Request, env: HsmEnv, path: string): Promise<Response> {
  try {
    // 验证请求头（确保有权限）
    const { partA, partB } = getSecretParts(request, env);

    // 1. 生成存储 Key
    const storageKey = await getStorageKey(path, env.INDEX_SECRET);

    // 2. 检查是否存在
    const data = await env.KV.get(storageKey);
    if (!data) {
      const response: ApiResponse = {
        success: false,
        error: 'Key not found',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证所有权 (删除保护)
    const stored = JSON.parse(data) as StoredEnvelope;
    await verifyKeyOwnership(partA, partB, stored, path);

    // 3. 删除
    await env.KV.delete(storageKey);

    const response: ApiResponse = {
      success: true,
      data: { path },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
