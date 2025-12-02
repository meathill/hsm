/**
 * HKDF 密钥派生
 * 用于从密钥分片构建 KEK
 */

import { stringToArrayBuffer } from '../utils/encoding';

/**
 * 使用 HKDF 派生 KEK
 * @param partA 环境变量中的密钥分片
 * @param partB 请求头中的密钥分片
 * @param salt 盐值
 * @returns 用于 AES-GCM 的 CryptoKey
 */
export async function deriveKEK(partA: string, partB: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const combined = partA + partB;
  const keyMaterial = await crypto.subtle.importKey('raw', stringToArrayBuffer(combined), 'HKDF', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt,
      info: stringToArrayBuffer('hsm-kek'),
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 生成随机盐值
 * @param length 盐值长度（字节）
 * @returns 随机盐值
 */
export function generateSalt(length = 16): ArrayBuffer {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return salt.buffer;
}
