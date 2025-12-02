import { describe, expect, it } from 'vitest';
import { generateStorageKey } from '../../src/crypto/hmac';

describe('HMAC-SHA256', () => {
  it('生成一致的存储 Key', async () => {
    const path = 'user/123/api-key';
    const secret = 'test-secret';

    const key1 = await generateStorageKey(path, secret);
    const key2 = await generateStorageKey(path, secret);

    expect(key1).toBe(key2);
  });

  it('不同路径生成不同的 Key', async () => {
    const secret = 'test-secret';

    const key1 = await generateStorageKey('path/a', secret);
    const key2 = await generateStorageKey('path/b', secret);

    expect(key1).not.toBe(key2);
  });

  it('不同密钥生成不同的 Key', async () => {
    const path = 'same/path';

    const key1 = await generateStorageKey(path, 'secret-a');
    const key2 = await generateStorageKey(path, 'secret-b');

    expect(key1).not.toBe(key2);
  });

  it('生成的 Key 是 Base64 格式', async () => {
    const key = await generateStorageKey('test', 'secret');

    // Base64 只包含 A-Z, a-z, 0-9, +, /, =
    expect(key).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('生成的 Key 长度固定（SHA-256 输出 32 字节 = 44 字符 Base64）', async () => {
    const key = await generateStorageKey('test', 'secret');

    // 32 bytes -> 44 characters in Base64 (with padding)
    expect(key.length).toBe(44);
  });
});
