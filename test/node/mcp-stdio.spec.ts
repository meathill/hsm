import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const BRIDGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/hsm-mcp-stdio.mjs');

interface RpcMessage {
  jsonrpc: '2.0';
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

function frame(payload: object): Buffer {
  const body = JSON.stringify(payload);
  return Buffer.from(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`, 'utf8');
}

function stripEnv(env: NodeJS.ProcessEnv, ...keys: string[]): NodeJS.ProcessEnv {
  const next = { ...env };
  for (const k of keys) delete next[k];
  return next;
}

/** 起一个桥进程，发一批消息，按 id 收响应。notification（无 id）不产生响应。 */
async function talk(
  messages: object[],
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 8000,
): Promise<{ child: ChildProcess; responses: Map<number | string, RpcMessage> }> {
  const child = spawn('node', [BRIDGE], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  const responses = new Map<number | string, RpcMessage>();
  let buf = Buffer.alloc(0);

  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MCP bridge response timeout')), timeoutMs);
    child.stdout!.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const end = buf.indexOf('\r\n\r\n');
        if (end === -1) break;
        const m = buf
          .slice(0, end)
          .toString('utf8')
          .match(/Content-Length:\s*(\d+)/i);
        if (!m) {
          buf = buf.slice(end + 4);
          continue;
        }
        const len = Number(m[1]);
        if (buf.length < end + 4 + len) break;
        const msg = JSON.parse(buf.slice(end + 4, end + 4 + len).toString('utf8')) as RpcMessage;
        buf = buf.slice(end + 4 + len);
        if (msg.id !== undefined && msg.id !== null) {
          responses.set(msg.id, msg);
          const want = messages.filter(
            (x) => (x as RpcMessage).id !== undefined && (x as RpcMessage).id !== null,
          ).length;
          if (responses.size >= want) {
            clearTimeout(timer);
            resolve();
          }
        }
      }
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (responses.size === 0) reject(new Error(`bridge exited early: ${code}`));
      else {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  for (const msg of messages) child.stdin!.write(frame(msg));
  await done;
  return { child, responses };
}

let current: ChildProcess | undefined;
afterEach(() => {
  current?.kill('SIGKILL');
  current = undefined;
});

describe('hsm-mcp-stdio 握手与工具表', () => {
  it('initialize 返回协议版本与 serverInfo', async () => {
    const { child, responses } = await talk([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
    ]);
    current = child;
    const res = responses.get(1)?.result as Record<string, unknown>;
    expect(res.protocolVersion).toBe('2024-11-05');
    expect(res.capabilities).toEqual({ tools: {} });
    expect(res.serverInfo).toMatchObject({ name: 'meathill-hsm' });
  });

  it('tools/list 返回 put/get/delete 三个工具', async () => {
    const { child, responses } = await talk([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]);
    current = child;
    const tools = (responses.get(1)?.result as { tools: { name: string }[] }).tools;
    expect(tools.map((t) => t.name).sort()).toEqual(['hsm_delete_key', 'hsm_get_key', 'hsm_put_key']);
  });

  it('ping 与空列表方法正常应答，未知方法返回 -32601', async () => {
    const { child, responses } = await talk([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', id: 2, method: 'resources/list' },
      { jsonrpc: '2.0', id: 3, method: 'prompts/list' },
      { jsonrpc: '2.0', id: 4, method: 'nope/unknown' },
    ]);
    current = child;
    expect(responses.get(1)?.result).toEqual({});
    expect(responses.get(2)?.result).toEqual({ resources: [] });
    expect(responses.get(3)?.result).toEqual({ prompts: [] });
    expect(responses.get(4)?.error?.code).toBe(-32601);
  });

  it('notification（无 id）不产生响应，后续 ping 仍正常', async () => {
    const { child, responses } = await talk([
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 7, method: 'ping' },
    ]);
    current = child;
    expect(responses.size).toBe(1);
    expect(responses.get(7)?.result).toEqual({});
  });
});

describe('hsm-mcp-stdio 工具调用校验', () => {
  it('未知工具名返回 isError', async () => {
    const { child, responses } = await talk([
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'nope', arguments: {} } },
    ]);
    current = child;
    const result = responses.get(1)?.result as { isError: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('超长 value 在本地拦截，不发网络', async () => {
    const { child, responses } = await talk(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'hsm_put_key', arguments: { path: 'a/b', value: 'x'.repeat(8193) } },
        },
      ],
      // 即使给了不可达地址也应走不到 fetch（断言靠文案而非耗时）
      { ...process.env, HSM_BASE_URL: 'http://127.0.0.1:9', HSM_SECRET: 's' },
    );
    current = child;
    const result = responses.get(1)?.result as { isError: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('maximum length');
  });

  it('缺 path 参数返回明确错误', async () => {
    const { child, responses } = await talk(
      [{ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'hsm_get_key', arguments: {} } }],
      { ...process.env, HSM_BASE_URL: 'http://127.0.0.1:9', HSM_SECRET: 's' },
    );
    current = child;
    const result = responses.get(1)?.result as { isError: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required argument');
  });

  it('缺 HSM_BASE_URL 时报错指引环境变量', async () => {
    const { child, responses } = await talk(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'hsm_get_key', arguments: { path: 'a/b' } },
        },
      ],
      stripEnv(process.env, 'HSM_BASE_URL'),
    );
    current = child;
    const result = responses.get(1)?.result as { isError: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('HSM_BASE_URL');
  });

  it('不可达服务返回 Failed to reach HSM API', async () => {
    const { child, responses } = await talk(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'hsm_get_key', arguments: { path: 'a/b' } },
        },
      ],
      { ...process.env, HSM_BASE_URL: 'http://127.0.0.1:9', HSM_SECRET: 's' },
    );
    current = child;
    const result = responses.get(1)?.result as { isError: boolean; content: { text: string }[] };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to reach HSM API');
  }, 15000);
});
