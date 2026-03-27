import TcpSocket from 'react-native-tcp-socket';

import type {ClashProxy, TcpPingResult} from './types';

type TcpPingOptions = {
  timeoutMs?: number;
};

export function tcpPingProxy(
  proxy: ClashProxy,
  options: TcpPingOptions = {},
): Promise<TcpPingResult> {
  const timeoutMs = options.timeoutMs ?? 4000;

  return new Promise(resolve => {
    const startedAt = Date.now();
    let settled = false;

    const finish = (result: TcpPingResult) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    };

    const socket = TcpSocket.createConnection(
      {
        host: proxy.server,
        port: proxy.port,
      },
      () => {
        finish({
          id: `${proxy.name}-${proxy.server}-${proxy.port}`,
          name: proxy.name,
          server: proxy.server,
          port: proxy.port,
          type: proxy.type,
          latencyMs: Date.now() - startedAt,
          success: true,
        });
      },
    );

    socket.setTimeout(timeoutMs);

    socket.on('error', error => {
      finish({
        id: `${proxy.name}-${proxy.server}-${proxy.port}`,
        name: proxy.name,
        server: proxy.server,
        port: proxy.port,
        type: proxy.type,
        success: false,
        error: error.message,
      });
    });

    socket.on('timeout', () => {
      finish({
        id: `${proxy.name}-${proxy.server}-${proxy.port}`,
        name: proxy.name,
        server: proxy.server,
        port: proxy.port,
        type: proxy.type,
        success: false,
        error: `Connection timeout (${timeoutMs}ms)`,
      });
    });
  });
}

export async function runLimitedTcpPings(
  proxies: ClashProxy[],
  concurrency = 5,
  timeoutMs = 4000,
): Promise<TcpPingResult[]> {
  const results: TcpPingResult[] = [];
  const queue = [...proxies];

  const workers = Array.from({length: Math.max(1, concurrency)}, async () => {
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        return;
      }

      const result = await tcpPingProxy(current, {timeoutMs});
      results.push(result);
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
