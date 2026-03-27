export type ClashProxy = {
  name: string;
  type?: string;
  server: string;
  port: number;
};

export type ClashConfig = {
  proxies?: ClashProxy[];
};

export type TcpPingResult = {
  id: string;
  name: string;
  server: string;
  port: number;
  type?: string;
  latencyMs?: number;
  success: boolean;
  error?: string;
};
