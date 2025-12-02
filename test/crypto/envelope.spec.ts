import { describe, it, expect } from 'vitest';
import { envelopeEncrypt, envelopeDecrypt } from '../../src/crypto/envelope';
import { deriveKEK, generateSalt } from '../../src/crypto/hkdf';

describe('信封加密 (Envelope Encryption)', () => {
  async function createKEK() {
    const salt = generateSalt();
    return deriveKEK('partA', 'partB', salt);
  }

  describe('envelopeEncrypt', () => {
    it('生成正确结构的加密数据', async () => {
      const kek = await createKEK();
      const plaintext = 'my-secret-key';
      const aad = 'user/123/api-key';

      const payload = await envelopeEncrypt(kek, plaintext, aad);

      expect(payload.v).toBe(1);
      expect(payload.dekEnc).toBeTruthy();
      expect(payload.iv).toBeTruthy();
      expect(payload.payloadEnc).toBeTruthy();
    });

    it('每次加密生成不同的密文', async () => {
      const kek = await createKEK();
      const plaintext = 'my-secret-key';
      const aad = 'user/123/api-key';

      const payload1 = await envelopeEncrypt(kek, plaintext, aad);
      const payload2 = await envelopeEncrypt(kek, plaintext, aad);

      // DEK 和 IV 应该不同
      expect(payload1.dekEnc).not.toBe(payload2.dekEnc);
      expect(payload1.iv).not.toBe(payload2.iv);
      expect(payload1.payloadEnc).not.toBe(payload2.payloadEnc);
    });
  });

  describe('envelopeDecrypt', () => {
    it('正确解密数据', async () => {
      const kek = await createKEK();
      const plaintext = 'my-secret-key-value';
      const aad = 'user/123/api-key';

      const payload = await envelopeEncrypt(kek, plaintext, aad);
      const decrypted = await envelopeDecrypt(kek, payload, aad);

      expect(decrypted).toBe(plaintext);
    });

    it('正确解密中文数据', async () => {
      const kek = await createKEK();
      const plaintext = '这是一个很长的中文密钥！';
      const aad = 'service/config/secret';

      const payload = await envelopeEncrypt(kek, plaintext, aad);
      const decrypted = await envelopeDecrypt(kek, payload, aad);

      expect(decrypted).toBe(plaintext);
    });

    it('正确解密较长数据', async () => {
      const kek = await createKEK();
      const plaintext = 'a'.repeat(10000);
      const aad = 'large/data/test';

      const payload = await envelopeEncrypt(kek, plaintext, aad);
      const decrypted = await envelopeDecrypt(kek, payload, aad);

      expect(decrypted).toBe(plaintext);
    });

    it('AAD 不匹配时解密失败', async () => {
      const kek = await createKEK();
      const plaintext = 'secret';
      const aad = 'correct/path';

      const payload = await envelopeEncrypt(kek, plaintext, aad);

      await expect(
        envelopeDecrypt(kek, payload, 'wrong/path')
      ).rejects.toThrow();
    });

    it('KEK 不匹配时解密失败', async () => {
      const kek1 = await createKEK();
      const kek2 = await createKEK();
      const plaintext = 'secret';
      const aad = 'test/path';

      const payload = await envelopeEncrypt(kek1, plaintext, aad);

      await expect(
        envelopeDecrypt(kek2, payload, aad)
      ).rejects.toThrow();
    });

    it('不支持的版本号时抛出错误', async () => {
      const kek = await createKEK();
      const plaintext = 'secret';
      const aad = 'test/path';

      const payload = await envelopeEncrypt(kek, plaintext, aad);
      payload.v = 999; // 不支持的版本

      await expect(
        envelopeDecrypt(kek, payload, aad)
      ).rejects.toThrow('Unsupported payload version: 999');
    });
  });
});
