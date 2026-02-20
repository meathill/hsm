/**
 * HSM - 密钥管理系统
 *
 * 提供安全的密钥存储和检索服务
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleKeyDelete, handleKeyGet, handleKeyStore } from './handlers';
import type { ApiResponse, HsmEnv } from './types';

const app = new Hono<{ Bindings: HsmEnv }>();

// 注入官方 CORS 中间件，自动处理 OPTIONS 及响应头
app.use(
  '/keys/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-HSM-Secret'],
  }),
);

// 辅助方法，提取具有多级目录结构的路径参数
const getKeyPath = (url: string) => {
  return new URL(url).pathname.replace(/^\/keys\//, '');
};

// 密钥操作 API 注入
app.put('/keys/*', async (c) => {
  const keyPath = getKeyPath(c.req.url);
  return handleKeyStore(c.req.raw, c.env, keyPath);
});

app.get('/keys/*', async (c) => {
  const keyPath = getKeyPath(c.req.url);
  return handleKeyGet(c.req.raw, c.env, keyPath);
});

app.delete('/keys/*', async (c) => {
  const keyPath = getKeyPath(c.req.url);
  return handleKeyDelete(c.req.raw, c.env, keyPath);
});

// 404 处理 (保持原有数据结构兼容遗留测试)
app.notFound((c) => {
  const notFoundResponse: ApiResponse = {
    success: false,
    error: 'Not found',
  };
  return c.json(notFoundResponse, 404);
});

export default app;
