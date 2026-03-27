import TcpSocket from 'react-native-tcp-socket';

import type {ClashProxy, TcpPingResult} from './types';

type TcpPingOptions = {
  timeoutMs?: number;
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const DEFAULT_INTER_PROBE_DELAY_MS = 250;

function buildResultBase(proxy: ClashProxy) {
  return {
    id: `${proxy.name}-${proxy.server}-${proxy.port}`,
    name: proxy.name,
    server: proxy.server,
    port: proxy.port,
    type: proxy.type,
  };
}

function isRetriableError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('econnaborted') ||
    normalized.includes('enetunreach') ||
    normalized.includes('ehostunreach')
  );
}

export function tcpPingProxy(
  proxy: ClashProxy,
  options: TcpPingOptions = {},
): Promise<TcpPingResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise(resolve => {
    const startedAt = Date.now();
    let settled = false;
    let pendingResult: TcpPingResult | null = null;
    let resolveFallback: ReturnType<typeof setTimeout> | undefined;

    const resolveNow = (result: TcpPingResult) => {
      if (settled) {
        return;
      }

      settled = true;
      if (resolveFallback) {
        clearTimeout(resolveFallback);
      }
      resolve(result);
    };

    const finish = (result: TcpPingResult) => {
      if (settled) {
        return;
      }

      pendingResult = result;
      socket.destroy();

      // On some mobile networks the native close event can lag behind destroy().
      // Keep a short fallback so one stuck close does not block the whole batch.
      resolveFallback = setTimeout(() => {
        if (pendingResult) {
          resolveNow(pendingResult);
        }
      }, 300);
    };

    const socket = TcpSocket.createConnection(
      {
        host: proxy.server,
        port: proxy.port,
        connectTimeout: timeoutMs,
      },
      () => {
        finish({
          ...buildResultBase(proxy),
          latencyMs: Date.now() - startedAt,
          timeoutMs,
          remoteFamily: socket.remoteFamily,
          success: true,
        });
      },
    );

    socket.setTimeout(timeoutMs);

    socket.on('error', error => {
      finish({
        ...buildResultBase(proxy),
        timeoutMs,
        remoteFamily: socket.remoteFamily,
        success: false,
        error: error.message,
      });
    });

    socket.on('timeout', () => {
      finish({
        ...buildResultBase(proxy),
        timeoutMs,
        remoteFamily: socket.remoteFamily,
        success: false,
        error: `Connection timeout (${timeoutMs}ms)`,
      });
    });

    socket.on('close', () => {
      if (pendingResult) {
        resolveNow(pendingResult);
      }
    });
  });
}

export async function tcpPingProxyWithRetry(
  proxy: ClashProxy,
  options: TcpPingOptions = {},
): Promise<TcpPingResult> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastResult = await tcpPingProxy(proxy, {timeoutMs});
  if (lastResult.success || retries <= 0 || !isRetriableError(lastResult.error)) {
    return {
      ...lastResult,
      attempts: 1,
    };
  }

  const retryResult = await tcpPingProxy(proxy, {
    timeoutMs: timeoutMs + 4000,
  });

  return {
    ...(retryResult.success ? retryResult : lastResult),
    attempts: 2,
    timeoutMs: retryResult.timeoutMs ?? timeoutMs + 4000,
    error:
      retryResult.success
        ? retryResult.error
        : `${lastResult.error ?? 'First attempt failed'}; retry: ${retryResult.error ?? 'failed'}`,
  };
}

export async function runLimitedTcpPings(
  proxies: ClashProxy[],
  concurrency = 1,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<TcpPingResult[]> {
  const results: TcpPingResult[] = [];
  const queue = [...proxies];

  const workers = Array.from({length: Math.max(1, concurrency)}, async () => {
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        return;
      }

      const result = await tcpPingProxyWithRetry(current, {timeoutMs, retries: DEFAULT_RETRIES});
      results.push(result);

      if (queue.length > 0) {
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), DEFAULT_INTER_PROBE_DELAY_MS);
        });
      }
    }
  });

  await Promise.all(workers);

  return results.sort((a, b) => {
    if (a.success && b.success) {
      return (a.latencyMs ?? Number.MAX_SAFE_INTEGER) - (b.latencyMs ?? Number.MAX_SAFE_INTEGER);
    }

    if (a.success) {
      return -1;
    }

    if (b.success) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });
}
