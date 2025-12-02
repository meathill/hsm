/**
 * HMAC-SHA256 实现
 * 用于存储 Key 混淆，防止彩虹表攻击
 */

import { arrayBufferToBase64, stringToArrayBuffer } from '../utils/encoding';

/**
 * 使用 HMAC-SHA256 生成存储 Key
 * @param path 原始路径
 * @param secret HMAC 密钥
 * @returns Base64 编码的 HMAC 值
 */
export async function generateStorageKey(path: string, secret: string): Promise<string> {
  const keyData = stringToArrayBuffer(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = stringToArrayBuffer(path);
  const signature = await crypto.subtle.sign('HMAC', key, data);

  return arrayBufferToBase64(signature);
}
