/**
 * AES-GCM-256 加解密
 * 使用 AEAD 确保数据完整性
 */

import { AesGcmParams } from '../types';
import { arrayBufferToBase64, arrayBufferToString, base64ToArrayBuffer, stringToArrayBuffer } from '../utils/encoding';

/**
 * 生成随机 DEK
 * @returns AES-GCM-256 密钥
 */
export async function generateDEK(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return key as CryptoKey;
}

/**
 * 生成随机 IV/Nonce
 * @returns 12 字节的随机 IV
 */
export function generateIV(): ArrayBuffer {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv.buffer;
}

/**
 * 使用 AES-GCM 加密数据
 * @param key 加密密钥
 * @param plaintext 明文
 * @param iv IV/Nonce
 * @param aad 附加认证数据
 * @returns Base64 编码的密文
 */
export async function encryptAesGcm(key: CryptoKey, plaintext: string, iv: ArrayBuffer, aad?: string): Promise<string> {
  const plaintextBuffer = stringToArrayBuffer(plaintext);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv,
  };
  if (aad) {
    algorithm.additionalData = stringToArrayBuffer(aad);
  }

  const ciphertext = await crypto.subtle.encrypt(algorithm, key, plaintextBuffer);
  return arrayBufferToBase64(ciphertext);
}

/**
 * 使用 AES-GCM 解密数据
 * @param key 解密密钥
 * @param ciphertextBase64 Base64 编码的密文
 * @param iv IV/Nonce
 * @param aad 附加认证数据
 * @returns 明文
 */
export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextBase64: string,
  iv: ArrayBuffer,
  aad?: string,
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv,
  };
  if (aad) {
    algorithm.additionalData = stringToArrayBuffer(aad);
  }

  const plaintext = await crypto.subtle.decrypt(algorithm, key, ciphertext);
  return arrayBufferToString(plaintext);
}

/**
 * 导出密钥为 Base64
 * @param key CryptoKey
 * @returns Base64 编码的密钥
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(rawKey as ArrayBuffer);
}

/**
 * 从 Base64 导入 AES-GCM 密钥
 * @param keyBase64 Base64 编码的密钥
 * @returns CryptoKey
 */
export async function importAesKey(keyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
