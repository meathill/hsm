import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

// 主路径已由 test/index.spec.ts 覆盖，这里只补边角输入。
describe('HSM API 边角输入', () => {
  it('PUT 非法 JSON 返回 400', async () => {
    const response = await SELF.fetch('https://example.com/keys/edge/bad-json', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-HSM-Secret': 'test-part-b',
      },
      body: '{not-json',
    });

    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
  });

  it('GET 缺少 X-HSM-Secret 返回 400', async () => {
    const response = await SELF.fetch('https://example.com/keys/edge/no-header');
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('X-HSM-Secret');
  });

  it('DELETE 缺少 X-HSM-Secret 返回 400', async () => {
    const response = await SELF.fetch('https://example.com/keys/edge/no-header', {
      method: 'DELETE',
    });
    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
  });

  it('PUT 空 value 视同缺失返回 400', async () => {
    const response = await SELF.fetch('https://example.com/keys/edge/empty-value', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-HSM-Secret': 'test-part-b',
      },
      body: JSON.stringify({ value: '' }),
    });

    expect(response.status).toBe(400);
  });
});
