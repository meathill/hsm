/**
 * HSM - 密钥管理系统
 *
 * 提供安全的密钥存储和检索服务
 */

import { handleKeyDelete, handleKeyGet, handleKeyStore } from './handlers';
import type { ApiResponse, HsmEnv } from './types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-HSM-Secret',
};

function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 密钥操作 API
    const keysMatch = path.match(/^\/keys\/(.+)$/);
    if (keysMatch) {
      const keyPath = keysMatch[1];
      let response: Response | undefined;

      switch (method) {
        case 'PUT':
          response = await handleKeyStore(request, env as HsmEnv, keyPath);
          break;
        case 'GET':
          response = await handleKeyGet(request, env as HsmEnv, keyPath);
          break;
        case 'DELETE':
          response = await handleKeyDelete(request, env as HsmEnv, keyPath);
          break;
      }

      if (response) {
        return withCors(response);
      }
    }

    // 404 Not Found
    const notFoundResponse: ApiResponse = {
      success: false,
      error: 'Not found',
    };
    return withCors(
      new Response(JSON.stringify(notFoundResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  },
} satisfies ExportedHandler<Env>;
