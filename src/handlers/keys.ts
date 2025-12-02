/**
 * 密钥存储和检索处理器
 */

import { deriveKEK, envelopeDecrypt, envelopeEncrypt, generateSalt, generateStorageKey } from '../crypto';
import type { ApiResponse, EncryptedPayload, HsmEnv, StoreKeyRequest } from '../types';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils/encoding';

const KEY_PREFIX = 'key:';
const HSM_SECRET_HEADER = 'X-HSM-Secret';

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
    const { partA, partB } = getSecretParts(request, env);
    const body = await request.json<StoreKeyRequest>();

    if (!body.value) {
      throw new Error('Missing "value" in request body');
    }

    // 1. 生成存储 Key (HMAC-SHA256 混淆)
    const storageKey = KEY_PREFIX + (await generateStorageKey(path, env.INDEX_SECRET));

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
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 获取密钥
 */
export async function handleKeyGet(request: Request, env: HsmEnv, path: string): Promise<Response> {
  try {
    const { partA, partB } = getSecretParts(request, env);

    // 1. 生成存储 Key
    const storageKey = KEY_PREFIX + (await generateStorageKey(path, env.INDEX_SECRET));

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
    const stored = JSON.parse(data) as { salt: string } & EncryptedPayload;
    const salt = base64ToArrayBuffer(stored.salt);

    // 4. 派生 KEK
    const kek = await deriveKEK(partA, partB, salt);

    // 5. 解密数据
    const payload: EncryptedPayload = {
      v: stored.v,
      dekEnc: stored.dekEnc,
      iv: stored.iv,
      payloadEnc: stored.payloadEnc,
    };
    const value = await envelopeDecrypt(kek, payload, path);

    const response: ApiResponse = {
      success: true,
      data: { path, value },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 删除密钥
 */
export async function handleKeyDelete(request: Request, env: HsmEnv, path: string): Promise<Response> {
  try {
    // 验证请求头（确保有权限）
    getSecretParts(request, env);

    // 1. 生成存储 Key
    const storageKey = KEY_PREFIX + (await generateStorageKey(path, env.INDEX_SECRET));

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
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
