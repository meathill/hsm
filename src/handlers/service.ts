/**
 * 服务注册处理器
 * 生成 partA 和 partB 供内部服务使用
 */

import type { ServiceRegistration, ApiResponse, HsmEnv } from '../types';
import { arrayBufferToBase64 } from '../utils/encoding';

const SERVICE_PREFIX = 'service:';

/**
 * 生成随机密钥分片
 * @param length 长度（字节）
 * @returns Base64 编码的随机字符串
 */
function generateSecretPart(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return arrayBufferToBase64(bytes.buffer);
}

/**
 * 生成服务 ID
 * @returns UUID v4
 */
function generateServiceId(): string {
  return crypto.randomUUID();
}

/**
 * 注册新服务
 */
export async function handleServiceRegister(
  request: Request,
  env: HsmEnv
): Promise<Response> {
  try {
    const body = await request.json<{ name?: string }>();
    const serviceName = body.name || 'unnamed';

    const serviceId = generateServiceId();
    const partA = generateSecretPart();
    const partB = generateSecretPart();

    // 存储服务信息（只存储 partA，partB 由服务自己保管）
    const storageKey = `${SERVICE_PREFIX}${serviceId}`;
    await env.KV.put(storageKey, JSON.stringify({
      name: serviceName,
      partA,
      createdAt: new Date().toISOString(),
    }));

    const registration: ServiceRegistration = {
      serviceId,
      partA,
      partB,
    };

    const response: ApiResponse<ServiceRegistration> = {
      success: true,
      data: registration,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 获取服务的 partA（仅限内部管理使用）
 */
export async function handleServiceGet(
  serviceId: string,
  env: HsmEnv
): Promise<Response> {
  const storageKey = `${SERVICE_PREFIX}${serviceId}`;
  const data = await env.KV.get(storageKey);

  if (!data) {
    const response: ApiResponse = {
      success: false,
      error: 'Service not found',
    };
    return new Response(JSON.stringify(response), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const serviceInfo = JSON.parse(data);
  const response: ApiResponse = {
    success: true,
    data: {
      serviceId,
      name: serviceInfo.name,
      partA: serviceInfo.partA,
      createdAt: serviceInfo.createdAt,
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
