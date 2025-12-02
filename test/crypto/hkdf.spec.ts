import { describe, expect, it } from 'vitest';
import { deriveKEK, generateSalt } from '../../src/crypto/hkdf';

describe('HKDF 密钥派生', () => {
  describe('generateSalt', () => {
    it('生成指定长度的盐值', () => {
      const salt = generateSalt(16);
      expect(new Uint8Array(salt).length).toBe(16);
    });

    it('生成的盐值是随机的', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      const arr1 = new Uint8Array(salt1);
      const arr2 = new Uint8Array(salt2);

      // 两次生成的盐值应该不同（极小概率相同）
      let same = true;
      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
          same = false;
          break;
        }
      }
      expect(same).toBe(false);
    });
  });

  describe('deriveKEK', () => {
    it('派生有效的 AES-GCM 密钥', async () => {
      const salt = generateSalt();
      const kek = await deriveKEK('partA', 'partB', salt);

      expect(kek.type).toBe('secret');
      expect(kek.algorithm.name).toBe('AES-GCM');
      expect((kek.algorithm as AesKeyAlgorithm).length).toBe(256);
    });

    it('相同输入产生相同密钥（通过加解密验证）', async () => {
      const salt = generateSalt();
      const kek1 = await deriveKEK('partA', 'partB', salt);
      const kek2 = await deriveKEK('partA', 'partB', salt);

      // 使用 kek1 加密，kek2 解密，验证两者等价
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode('test-data');
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek1, plaintext);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek2, ciphertext);

      expect(new Uint8Array(decrypted)).toEqual(plaintext);
    });

    it('不同 partA 产生不同密钥（通过加解密验证）', async () => {
      const salt = generateSalt();
      const kek1 = await deriveKEK('partA-1', 'partB', salt);
      const kek2 = await deriveKEK('partA-2', 'partB', salt);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode('test-data');
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek1, plaintext);

      // 用不同的密钥解密应该失败
      await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek2, ciphertext)).rejects.toThrow();
    });

    it('不同 partB 产生不同密钥（通过加解密验证）', async () => {
      const salt = generateSalt();
      const kek1 = await deriveKEK('partA', 'partB-1', salt);
      const kek2 = await deriveKEK('partA', 'partB-2', salt);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode('test-data');
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek1, plaintext);

      await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek2, ciphertext)).rejects.toThrow();
    });

    it('不同盐值产生不同密钥（通过加解密验证）', async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const kek1 = await deriveKEK('partA', 'partB', salt1);
      const kek2 = await deriveKEK('partA', 'partB', salt2);

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode('test-data');
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek1, plaintext);

      await expect(crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek2, ciphertext)).rejects.toThrow();
    });
  });
});
