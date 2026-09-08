import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const workersOptions = {
  miniflare: {
    bindings: {
      CF_SECRET_PART: 'test-server-secret-part',
      INDEX_SECRET: 'test-index-secret',
    },
  },
  wrangler: { configPath: './wrangler.jsonc', environment: 'dev' },
};

export default defineConfig({
  test: {
    projects: [
      {
        // Worker 侧：API 与加解密单测跑在 miniflare 运行时里。
        plugins: [cloudflareTest(workersOptions)],
        test: {
          name: 'workers',
          inspect: false,
          inspectBrk: false,
          include: ['test/**/*.spec.ts'],
          exclude: ['test/node/**', '**/node_modules/**'],
        },
      },
      {
        // Node 侧：scripts/*.mjs 工具脚本（MCP stdio 桥、构建函数）跑在原生 Node 里，
        // 可用 child_process 做 stdio 黑盒测试，workers 运行时做不到。
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/node/**/*.spec.ts'],
        },
      },
    ],
  },
});
