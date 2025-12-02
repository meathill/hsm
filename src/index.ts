/**
 * HSM - 密钥管理系统
 *
 * 提供安全的密钥存储和检索服务
 */

import type { HsmEnv, ApiResponse } from './types';
import {
  handleServiceRegister,
  handleServiceGet,
  handleKeyStore,
  handleKeyGet,
  handleKeyDelete,
} from './handlers';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // 服务注册 API
    if (path === '/services' && method === 'POST') {
      return handleServiceRegister(request, env as HsmEnv);
    }

    // 获取服务信息
    const serviceMatch = path.match(/^\/services\/([^/]+)$/);
    if (serviceMatch && method === 'GET') {
      return handleServiceGet(serviceMatch[1], env as HsmEnv);
    }

    // 密钥操作 API
    const keysMatch = path.match(/^\/keys\/(.+)$/);
    if (keysMatch) {
      const keyPath = keysMatch[1];

      switch (method) {
        case 'PUT':
          return handleKeyStore(request, env as HsmEnv, keyPath);
        case 'GET':
          return handleKeyGet(request, env as HsmEnv, keyPath);
        case 'DELETE':
          return handleKeyDelete(request, env as HsmEnv, keyPath);
      }
    }

    // 404 Not Found
    const response: ApiResponse = {
      success: false,
      error: 'Not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
} satisfies ExportedHandler<Env>;
