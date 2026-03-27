import yaml from 'js-yaml';

import type {ClashConfig, ClashProxy} from './types';

function normalizeProxy(input: unknown): ClashProxy | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const server = typeof candidate.server === 'string' ? candidate.server.trim() : '';
  const portValue = candidate.port;
  const port =
    typeof portValue === 'number'
      ? portValue
      : typeof portValue === 'string'
        ? Number(portValue)
        : NaN;

  if (!server || !Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    name: typeof candidate.name === 'string' ? candidate.name : `${server}:${port}`,
    type: typeof candidate.type === 'string' ? candidate.type : undefined,
    server,
    port,
  };
}

export async function fetchClashConfigText(url: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'text/plain, application/x-yaml, text/yaml, */*',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(
      `Request failed before receiving a response. If you are using an http:// URL on Android, make sure cleartext HTTP is allowed. Original error: ${message}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to download config: HTTP ${response.status}`);
  }

  return response.text();
}

export function parseClashProxies(rawText: string): ClashProxy[] {
  const parsed = yaml.load(rawText) as ClashConfig | undefined;
  const proxies = Array.isArray(parsed?.proxies) ? parsed.proxies : [];

  return proxies
    .map(normalizeProxy)
    .filter((item): item is ClashProxy => item !== null)
    .map((item, index) => ({
      ...item,
      name: item.name || `proxy-${index + 1}`,
    }));
}
