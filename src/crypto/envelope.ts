/**
 * 信封加密 (Envelope Encryption) 实现
 * KEK 加密 DEK，DEK 加密实际数据
 */

import type { EncryptedPayload } from '../types';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils/encoding';
import { decryptAesGcm, encryptAesGcm, exportKey, generateDEK, generateIV, importAesKey } from './aes-gcm';

const CURRENT_VERSION = 1;

/**
 * 使用信封加密加密数据
 * @param kek KEK (Key Encryption Key)
 * @param plaintext 明文数据
 * @param aad 附加认证数据（如路径）
 * @returns 加密后的数据结构
 */
export async function envelopeEncrypt(kek: CryptoKey, plaintext: string, aad: string): Promise<EncryptedPayload> {
  // 1. 生成随机 DEK
  const dek = await generateDEK();

  // 2. 生成 IV
  const iv = generateIV();

  // 3. 用 DEK 加密数据
  const payloadEnc = await encryptAesGcm(dek, plaintext, iv, aad);

  // 4. 导出 DEK 并用 KEK 加密
  const dekRaw = await exportKey(dek);
  const dekIv = generateIV();
  const dekEnc = await encryptAesGcm(kek, dekRaw, dekIv, aad);

  return {
    v: CURRENT_VERSION,
    dekEnc: arrayBufferToBase64(dekIv) + '.' + dekEnc,
    iv: arrayBufferToBase64(iv),
    payloadEnc,
  };
}

/**
 * 使用信封加密解密数据
 * @param kek KEK (Key Encryption Key)
 * @param payload 加密后的数据结构
 * @param aad 附加认证数据（如路径）
 * @returns 明文数据
 */
export async function envelopeDecrypt(kek: CryptoKey, payload: EncryptedPayload, aad: string): Promise<string> {
  if (payload.v !== CURRENT_VERSION) {
    throw new Error(`Unsupported payload version: ${payload.v}`);
  }

  // 1. 解密 DEK
  const [dekIvBase64, dekEncBase64] = payload.dekEnc.split('.');
  const dekIv = base64ToArrayBuffer(dekIvBase64);
  const dekRaw = await decryptAesGcm(kek, dekEncBase64, dekIv, aad);

  // 2. 导入 DEK
  const dek = await importAesKey(dekRaw);

  // 3. 用 DEK 解密数据
  const iv = base64ToArrayBuffer(payload.iv);
  return decryptAesGcm(dek, payload.payloadEnc, iv, aad);
}
