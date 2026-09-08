import { describe, expect, it } from 'vitest';
import { deriveKEK, envelopeEncrypt, generateSalt } from '../../src/crypto';
import { errorResponse, getStorageKey, MAX_VALUE_LENGTH, verifyKeyOwnership } from '../../src/handlers/keys';
import { arrayBufferToBase64 } from '../../src/utils/encoding';

const PART_A = 'test-part-a';
const PART_B = 'test-part-b';

async function makeStored(path: string, partB: string = PART_B) {
  const salt = generateSalt();
  const kek = await deriveKEK(PART_A, partB, salt);
  const payload = await envelopeEncrypt(kek, 'secret-value', path);
  return { salt: arrayBufferToBase64(salt), ...payload };
}

describe('getStorageKey', () => {
  it('带 key: 前缀且对同一输入稳定', async () => {
    const a = await getStorageKey('app/uid/token', 'idx');
    const b = await getStorageKey('app/uid/token', 'idx');
    expect(a.startsWith('key:')).toBe(true);
    expect(a).toBe(b);
  });

  it('不同 path 或不同 INDEX_SECRET 得到不同 key', async () => {
    const a = await getStorageKey('app/a', 'idx');
    const b = await getStorageKey('app/b', 'idx');
    const c = await getStorageKey('app/a', 'other-idx');
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('verifyKeyOwnership', () => {
  it('正确密钥静默通过', async () => {
    const stored = await makeStored('app/uid/token');
    await expect(verifyKeyOwnership(PART_A, PART_B, stored, 'app/uid/token')).resolves.toBeUndefined();
  });

  it('错误密钥抛 Forbidden', async () => {
    const stored = await makeStored('app/uid/token');
    await expect(verifyKeyOwnership(PART_A, 'wrong-secret', stored, 'app/uid/token')).rejects.toThrow(/^Forbidden/);
  });

  it('path 被调换时抛 Forbidden（AAD 绑定）', async () => {
    const stored = await makeStored('app/uid/token');
    await expect(verifyKeyOwnership(PART_A, PART_B, stored, 'app/other/token')).rejects.toThrow(/^Forbidden/);
  });
});

describe('errorResponse', () => {
  it('Forbidden 开头映射为 403', async () => {
    const res = errorResponse(new Error('Forbidden: Incorrect secret for existing key'));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it('普通错误映射为 400', async () => {
    const res = errorResponse(new Error('Missing "value" in request body'));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toContain('value');
  });

  it('非 Error 输入兜底为 Unknown error', async () => {
    const res = errorResponse('boom');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('Unknown error');
  });
});

describe('MAX_VALUE_LENGTH', () => {
  it('与文档声明的 8192 一致', () => {
    expect(MAX_VALUE_LENGTH).toBe(8192);
  });
});
