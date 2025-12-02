import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('HSM API', () => {
  describe('PUT /keys/:path - 存储密钥', () => {
    it('成功存储密钥', async () => {
      const response = await SELF.fetch('https://example.com/keys/user/123/api-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-HSM-Secret': 'test-part-b',
        },
        body: JSON.stringify({ value: 'my-secret-api-key' }),
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.path).toBe('user/123/api-key');
    });

    it('缺少 X-HSM-Secret 头返回错误', async () => {
      const response = await SELF.fetch('https://example.com/keys/user/123/api-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'my-secret-api-key' }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('X-HSM-Secret');
    });

    it('缺少 value 返回错误', async () => {
      const response = await SELF.fetch('https://example.com/keys/user/123/api-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-HSM-Secret': 'test-part-b',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('value');
    });
  });

  describe('GET /keys/:path - 获取密钥', () => {
    it('成功获取已存储的密钥', async () => {
      const path = 'user/456/secret';
      const value = 'super-secret-value';

      // 先存储
      await SELF.fetch(`https://example.com/keys/${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-HSM-Secret': 'test-part-b',
        },
        body: JSON.stringify({ value }),
      });

      // 获取
      const response = await SELF.fetch(`https://example.com/keys/${path}`, {
        headers: { 'X-HSM-Secret': 'test-part-b' },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.path).toBe(path);
      expect(json.data.value).toBe(value);
    });

    it('获取不存在的密钥返回 404', async () => {
      const response = await SELF.fetch('https://example.com/keys/non/existent/path', {
        headers: { 'X-HSM-Secret': 'test-part-b' },
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Key not found');
    });

    it('错误的 partB 无法解密', async () => {
      const path = 'user/789/key';
      const value = 'cannot-decrypt-without-correct-key';

      // 使用正确的 partB 存储
      await SELF.fetch(`https://example.com/keys/${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-HSM-Secret': 'correct-part-b',
        },
        body: JSON.stringify({ value }),
      });

      // 使用错误的 partB 获取
      const response = await SELF.fetch(`https://example.com/keys/${path}`, {
        headers: { 'X-HSM-Secret': 'wrong-part-b' },
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });

  describe('DELETE /keys/:path - 删除密钥', () => {
    it('成功删除已存储的密钥', async () => {
      const path = 'to-be-deleted/key';

      // 先存储
      await SELF.fetch(`https://example.com/keys/${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-HSM-Secret': 'test-part-b',
        },
        body: JSON.stringify({ value: 'to-delete' }),
      });

      // 删除
      const response = await SELF.fetch(`https://example.com/keys/${path}`, {
        method: 'DELETE',
        headers: { 'X-HSM-Secret': 'test-part-b' },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);

      // 确认已删除
      const getResponse = await SELF.fetch(`https://example.com/keys/${path}`, {
        headers: { 'X-HSM-Secret': 'test-part-b' },
      });
      expect(getResponse.status).toBe(404);
    });

    it('删除不存在的密钥返回 404', async () => {
      const response = await SELF.fetch('https://example.com/keys/non/existent', {
        method: 'DELETE',
        headers: { 'X-HSM-Secret': 'test-part-b' },
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Key not found');
    });
  });

  describe('404 处理', () => {
    it('未知路径返回 404', async () => {
      const response = await SELF.fetch('https://example.com/unknown/path');

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Not found');
    });
  });
});
