import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    inspect: false,
    inspectBrk: false,
    poolOptions: {
      workers: {
        miniflare: {
          bindings: {
            CF_SECRET_PART: 'test-server-secret-part',
            INDEX_SECRET: 'test-index-secret',
          },
        },
        wrangler: { configPath: './wrangler.jsonc', environment: 'dev' },
      },
    },
  },
});
