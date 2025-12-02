import { describe, it, expect } from 'vitest';
import {
  generateDEK,
  generateIV,
  encryptAesGcm,
  decryptAesGcm,
  exportKey,
  importAesKey,
} from '../../src/crypto/aes-gcm';

describe('AES-GCM-256', () => {
  describe('generateDEK', () => {
    it('生成有效的 AES-GCM-256 密钥', async () => {
      const dek = await generateDEK();

      expect(dek.type).toBe('secret');
      expect(dek.algorithm.name).toBe('AES-GCM');
      expect((dek.algorithm as AesKeyAlgorithm).length).toBe(256);
      expect(dek.extractable).toBe(true);
    });
  });

  describe('generateIV', () => {
    it('生成 12 字节的 IV', () => {
      const iv = generateIV();
      expect(new Uint8Array(iv).length).toBe(12);
    });

    it('生成随机 IV', () => {
      const iv1 = generateIV();
      const iv2 = generateIV();

      expect(new Uint8Array(iv1)).not.toEqual(new Uint8Array(iv2));
    });
  });

  describe('encryptAesGcm / decryptAesGcm', () => {
    it('正确加解密文本', async () => {
      const dek = await generateDEK();
      const iv = generateIV();
      const plaintext = 'Hello, World!';

      const ciphertext = await encryptAesGcm(dek, plaintext, iv);
      const decrypted = await decryptAesGcm(dek, ciphertext, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('正确加解密中文', async () => {
      const dek = await generateDEK();
      const iv = generateIV();
      const plaintext = '你好，世界！';

      const ciphertext = await encryptAesGcm(dek, plaintext, iv);
      const decrypted = await decryptAesGcm(dek, ciphertext, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('使用 AAD 正确加解密', async () => {
      const dek = await generateDEK();
      const iv = generateIV();
      const plaintext = 'secret-data';
      const aad = 'user/123/api-key';

      const ciphertext = await encryptAesGcm(dek, plaintext, iv, aad);
      const decrypted = await decryptAesGcm(dek, ciphertext, iv, aad);

      expect(decrypted).toBe(plaintext);
    });

    it('AAD 不匹配时解密失败', async () => {
      const dek = await generateDEK();
      const iv = generateIV();
      const plaintext = 'secret-data';

      const ciphertext = await encryptAesGcm(dek, plaintext, iv, 'correct-aad');

      await expect(
        decryptAesGcm(dek, ciphertext, iv, 'wrong-aad')
      ).rejects.toThrow();
    });

    it('密钥不匹配时解密失败', async () => {
      const dek1 = await generateDEK();
      const dek2 = await generateDEK();
      const iv = generateIV();
      const plaintext = 'secret-data';

      const ciphertext = await encryptAesGcm(dek1, plaintext, iv);

      await expect(
        decryptAesGcm(dek2, ciphertext, iv)
      ).rejects.toThrow();
    });

    it('IV 不匹配时解密失败', async () => {
      const dek = await generateDEK();
      const iv1 = generateIV();
      const iv2 = generateIV();
      const plaintext = 'secret-data';

      const ciphertext = await encryptAesGcm(dek, plaintext, iv1);

      await expect(
        decryptAesGcm(dek, ciphertext, iv2)
      ).rejects.toThrow();
    });
  });

  describe('exportKey / importAesKey', () => {
    it('正确导出和导入密钥', async () => {
      const originalDek = await generateDEK();
      const iv = generateIV();
      const plaintext = 'test-message';

      // 导出密钥
      const exported = await exportKey(originalDek);

      // 使用原始密钥加密
      const ciphertext = await encryptAesGcm(originalDek, plaintext, iv);

      // 导入密钥
      const importedDek = await importAesKey(exported);

      // 使用导入的密钥解密
      const decrypted = await decryptAesGcm(importedDek, ciphertext, iv);

      expect(decrypted).toBe(plaintext);
    });

    it('导出的密钥是 Base64 格式', async () => {
      const dek = await generateDEK();
      const exported = await exportKey(dek);

      // Base64 只包含 A-Z, a-z, 0-9, +, /, =
      expect(exported).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('导出的密钥长度正确（256 位 = 32 字节 = 44 字符 Base64）', async () => {
      const dek = await generateDEK();
      const exported = await exportKey(dek);

      expect(exported.length).toBe(44);
    });
  });
});
