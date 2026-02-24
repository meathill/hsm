import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    inspect: false,
    inspectBrk: false,
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc', environment: 'dev' },
      },
    },
  },
});
