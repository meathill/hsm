/**
 * HSM - 密钥管理系统
 *
 * 提供安全的密钥存储和检索服务
 */

import { handleKeyDelete, handleKeyGet, handleKeyStore } from './handlers';
import type { ApiResponse, HsmEnv } from './types';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

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
