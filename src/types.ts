/**
 * 存储在 KV 中的加密数据结构
 */
export interface EncryptedPayload {
  /** 版本号，为将来迁移算法留后路 */
  v: number;
  /** 被 KEK 加密后的 DEK (Base64) */
  dekEnc: string;
  /** AES-GCM 的随机 Nonce (Base64) */
  iv: string;
  /** 被 DEK 加密后的客户密钥 (Base64) */
  payloadEnc: string;
}

/**
 * 服务注册响应
 */
export interface ServiceRegistration {
  /** 服务 ID */
  serviceId: string;
  /** 环境变量中的密钥分片 (Part A) */
  partA: string;
  /** 请求头中传递的密钥分片 (Part B) */
  partB: string;
}

/**
 * 环境变量类型扩展
 */
export interface HsmEnv {
  KV: KVNamespace;
  /** HMAC 混淆用的密钥 */
  INDEX_SECRET: string;
  /** 环境变量中的密钥分片 */
  CF_SECRET_PART: string;
}

/**
 * 存储密钥请求体
 */
export interface StoreKeyRequest {
  /** 客户的密钥值 */
  value: string;
}

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
