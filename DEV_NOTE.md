# HSM 开发笔记（给 3 个月后加入的新人）

记录“为什么是这样”，而非“是什么”。API 契约看 `README.md`，AI 接入看 `SKILL.md`。

## 架构决策

- **Hono 而非原生 fetch 路由**（2026-02-20 迁移）：需要 CORS 中间件与带通配符的
  `/keys/*` 路由。注意 `src/index.ts` 用 `new URL(url).pathname` 手工提参，
  而不是 Hono 的 `c.req.param()`——因为 key path 本身含 `/`（如 `app/uid/token`），
  通配符 param 在不同版本行为不一致，手工切 `^\/keys\/` 最稳。改这里时务必跑
  `test/index.spec.ts` 的多级路径用例。
- **双轨部署**：`pnpm deploy` 恒等于 `wrangler deploy --env production`，绑定既有
  生产 KV。模板/体验用默认环境，`staging` 单独配 secret。不要把生产 KV id 换成
  占位符，否则一键部署的新用户与生产共用命名空间。
- **`compatibility_date` 不要随手升级**：它决定 workerd 的行为快照。测试链
  （`@cloudflare/vitest-pool-workers` pin 的 miniflare alpha）自带的 workerd
  必须 >= 该日期，否则测试直接起不来（见下“测试链版本约束”）。

## 安全设计（实现侧的 why）

- **覆盖/删除先验所有权**：`handleKeyStore` 与 `handleKeyDelete` 在写/KV.delete 之前，
  都用请求头里的 `X-HSM-Secret` 派生 old KEK 并试解密存量 envelope，失败即 403。
  这是“无登录鉴权”下的唯一归属证明，不可删除该前置检查。
- **path 参与 AAD**：envelope 加解密把 key path 作为附加认证数据，防“把 A 的密文
  拷到 B 路径下冒充”。改加密参数时保持 encrypt/decrypt 两侧的 AAD 一致。
- **索引 HMAC 混淆**：KV key = `"key:" + HMAC(INDEX_SECRET, path)`，KV 里看不到
  业务路径。轮换 `INDEX_SECRET` 会导致全量 key 失联，等同数据丢失——该值只能丢弃式
  轮换（双写迁移），没有原地升级路径。
- **长度上限 8192**：`src/handlers/keys.ts` 与 `scripts/hsm-mcp-stdio.mjs` 各有一份
  校验（Worker 侧是强制的，MCP 侧是提前失败省一次往返）。改上限时两处一起改，
  见 `MAX_VALUE_LENGTH` / `MAX_SECRET_LENGTH`。

## 测试链版本约束（2026-09 维护轮确认）

- `@cloudflare/vitest-pool-workers@0.22` **仅官方支持 vitest ^4**，vitest 5 会导致
  pool worker 起不来。本轮曾升到 vitest 5.0.0 验证失败，已回退到 `vitest@4.1.11`。
  下次想升 vitest 大版本前，先看该包的 release note 是否声明支持。
- 该包不再导出 `./config`（`defineWorkersConfig` 已移除），当前写法是
  `vitest/config` 的 `defineConfig` + `cloudflareTest({...})` 插件
  （见 `vitest.config.mts`），插件内部自注册 pool，不要再手写 `poolOptions`。
- pool 把 `miniflare` 精确 pin 在旧 alpha，其 workerd 会落后于我们的
  `compatibility_date`。`pnpm-workspace.yaml` 里有 `overrides: miniflare`，
  取的是“支持该日期的最小 newer alpha”，减少与 pool 的内部 API 漂移。
  升级任一侧后若出现 `requires compatibility date ... newest date supported`，
  先对齐这两处。
- **v8 coverage 被 pool 显式拒绝**（缺 `node:inspector`）：`--coverage` 必须用
  istanbul provider。CI 默认不跑覆盖率，所以 `@vitest/coverage-v8` 只是占位依赖；
  真要开覆盖率时换 `@vitest/coverage-istanbul`。
- `@types/node@26` 收紧了 `Buffer`/`Uint8Array.buffer` 类型（`ArrayBufferLike`），
  `src/utils/encoding.ts` 因此加了 `as ArrayBuffer` 断言。后续遇到同类报错优先
  收窄类型而非降级 `@types/node`。

## 手写代码保留清单（2026-09 维护轮评估结论）

- MCP stdio 桥的手写 JSON-RPC 分帧（`hsm-mcp-stdio.mjs`）：官方 MCP SDK 会显著
  增大该单文件桥接脚本的依赖体重，且当前帧解析已有子进程黑盒测试覆盖，不换。
- `src/utils/encoding.ts` 的 base64/UTF-8 转换：无 bug、有单测，`es-toolkit` 等
  通用库省不了几行且 Worker 内 `btoa/atob` 零依赖，不换。
- `340 行` 的 MCP 桥与 `321 行` 的 `site-template.mjs` 刚过 300 行线但内聚，
  暂不拆分；若任一超过 500 行再按“传输/工具调用/HSM 客户端”切分。

## 构建与静态站

- `pnpm build`（`scripts/build.mjs`）把 `README*.md` 渲染成 `public/` 双语站，
  并复制 `llms.txt / SKILL.md / mcp.json` 到站根 + `/.well-known/mcp.json`。
  `public/*` 默认不进 git（见 `.gitignore`），所以**文档只改根目录版本**，
  改完跑一次 `pnpm build` 自检，不要手改 `public/`。
- 品牌头/样式来自 `meathill-brand` 包（`site-template.mjs` + `site-styles.mjs`），
  首页 JSON-LD 固定为 WebPage：本站无真实商品评分，用 SoftwareApplication 会被
  富结果校验报错（2026-09-03 教训），不要“升级”回去。
