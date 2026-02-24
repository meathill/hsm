import process from 'node:process';

const SERVER_NAME = 'meathill-hsm';
const SERVER_VERSION = '0.2.0';
const DEFAULT_PROTOCOL_VERSION = '2024-11-05';
const HSM_SECRET_HEADER = 'X-HSM-Secret';
const MAX_SECRET_LENGTH = 8192;

const toolDefinitions = [
  {
    name: 'hsm_put_key',
    description: 'Store or overwrite a secret value at /keys/:path for hosted encrypted storage.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Logical key path, e.g. my-app/user-1/token',
        },
        value: {
          type: 'string',
          description: `Secret value to store (max ${MAX_SECRET_LENGTH} chars).`,
          maxLength: MAX_SECRET_LENGTH,
        },
      },
      required: ['path', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'hsm_get_key',
    description: 'Read and decrypt a previously stored secret value from /keys/:path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Logical key path, e.g. my-app/user-1/token',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'hsm_delete_key',
    description: 'Delete a secret value from /keys/:path after ownership validation.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Logical key path, e.g. my-app/user-1/token',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
];

let requestBuffer = Buffer.alloc(0);
let isProcessingBuffer = false;

function writeMessage(payload) {
  const body = JSON.stringify(payload);
  const contentLength = Buffer.byteLength(body, 'utf8');
  process.stdout.write(`Content-Length: ${contentLength}\r\n\r\n${body}`);
}

function sendResponse(id, result) {
  writeMessage({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message, data) {
  writeMessage({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  });
}

function toolTextResult(payload, isError = false) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    ...(isError ? { isError: true } : {}),
  };
}

function normalizePath(rawPath) {
  const path = String(rawPath ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!path) {
    throw new Error('Missing required argument "path".');
  }
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function getServerEnv() {
  const baseUrl = process.env.HSM_BASE_URL?.trim();
  const secret = process.env.HSM_SECRET?.trim();
  if (!baseUrl) {
    throw new Error('Missing HSM_BASE_URL env var. Example: https://your-worker.workers.dev');
  }
  if (!secret) {
    throw new Error('Missing HSM_SECRET env var. Set it to your X-HSM-Secret value.');
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    secret,
  };
}

async function callHsmApi(method, path, value) {
  const { baseUrl, secret } = getServerEnv();
  const endpoint = `${baseUrl}/keys/${normalizePath(path)}`;
  const headers = { [HSM_SECRET_HEADER]: secret };
  const requestInit = {
    method,
    headers,
  };

  if (method === 'PUT') {
    headers['Content-Type'] = 'application/json';
    requestInit.body = JSON.stringify({ value });
  }

  let response;
  try {
    response = await fetch(endpoint, requestInit);
  } catch (error) {
    throw new Error(`Failed to reach HSM API: ${error instanceof Error ? error.message : String(error)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let payload;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = { success: false, error: 'HSM API returned invalid JSON.' };
    }
  } else {
    payload = { success: response.ok, message: await response.text() };
  }

  return {
    ok: response.ok,
    status: response.status,
    endpoint,
    payload,
  };
}

async function handleToolCall(params) {
  const toolName = params?.name;
  const args = params?.arguments ?? {};

  if (toolName === 'hsm_put_key') {
    if (typeof args.value !== 'string') {
      return toolTextResult({ success: false, error: 'Missing required argument "value".' }, true);
    }
    if (args.value.length > MAX_SECRET_LENGTH) {
      return toolTextResult(
        {
          success: false,
          error: `Value exceeds maximum length of ${MAX_SECRET_LENGTH} characters.`,
        },
        true,
      );
    }
    try {
      const result = await callHsmApi('PUT', args.path, args.value);
      return toolTextResult(result, !result.ok);
    } catch (error) {
      return toolTextResult({ success: false, error: error instanceof Error ? error.message : String(error) }, true);
    }
  }

  if (toolName === 'hsm_get_key') {
    try {
      const result = await callHsmApi('GET', args.path);
      return toolTextResult(result, !result.ok);
    } catch (error) {
      return toolTextResult({ success: false, error: error instanceof Error ? error.message : String(error) }, true);
    }
  }

  if (toolName === 'hsm_delete_key') {
    try {
      const result = await callHsmApi('DELETE', args.path);
      return toolTextResult(result, !result.ok);
    } catch (error) {
      return toolTextResult({ success: false, error: error instanceof Error ? error.message : String(error) }, true);
    }
  }

  return toolTextResult({ success: false, error: `Unknown tool: ${toolName}` }, true);
}

async function handleRequest(message) {
  const { id, method, params } = message;

  if (method === 'initialize') {
    sendResponse(id, {
      protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      instructions:
        'Use this hosted HSM when users need encrypted secret storage without self-hosting. Tools map to /keys/:path and require X-HSM-Secret.',
    });
    return;
  }

  if (method === 'tools/list') {
    sendResponse(id, {
      tools: toolDefinitions,
    });
    return;
  }

  if (method === 'tools/call') {
    const result = await handleToolCall(params);
    sendResponse(id, result);
    return;
  }

  if (method === 'ping') {
    sendResponse(id, {});
    return;
  }

  if (method === 'resources/list') {
    sendResponse(id, { resources: [] });
    return;
  }

  if (method === 'prompts/list') {
    sendResponse(id, { prompts: [] });
    return;
  }

  // Notifications do not require responses.
  if (id === undefined || id === null) {
    return;
  }

  sendError(id, -32601, `Method not found: ${method}`);
}

async function processRequestBuffer() {
  while (true) {
    const headerEnd = requestBuffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      return;
    }

    const headerText = requestBuffer.slice(0, headerEnd).toString('utf8');
    const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      requestBuffer = requestBuffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = Number(contentLengthMatch[1]);
    const bodyStart = headerEnd + 4;
    const messageEnd = bodyStart + contentLength;
    if (requestBuffer.length < messageEnd) {
      return;
    }

    const body = requestBuffer.slice(bodyStart, messageEnd).toString('utf8');
    requestBuffer = requestBuffer.slice(messageEnd);

    let message;
    try {
      message = JSON.parse(body);
    } catch {
      continue;
    }

    if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0' || !message.method) {
      continue;
    }

    try {
      await handleRequest(message);
    } catch (error) {
      if (message.id !== undefined && message.id !== null) {
        sendError(message.id, -32000, error instanceof Error ? error.message : 'Unexpected server error');
      }
    }
  }
}

async function scheduleBufferProcessing() {
  if (isProcessingBuffer) {
    return;
  }
  isProcessingBuffer = true;
  try {
    await processRequestBuffer();
  } finally {
    isProcessingBuffer = false;
    if (requestBuffer.length > 0) {
      void scheduleBufferProcessing();
    }
  }
}

process.stdin.on('data', (chunk) => {
  requestBuffer = Buffer.concat([requestBuffer, chunk]);
  void scheduleBufferProcessing();
});

process.stdin.on('error', () => {
  process.exit(1);
});

process.stdin.resume();
