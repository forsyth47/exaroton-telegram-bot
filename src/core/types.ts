export type BillingSource =
  | { type: "pool"; poolId: string }
  | { type: "profile" };

export interface GroupConfig {
  chatId: string;
  tenantId: string;
  serverId?: string;
  billing?: BillingSource;
  configuredBy?: number;
  updatedAt: number;
}

export interface Tenant {
  id: string;
  exarotonToken: string; // TODO: Encrypt in production
  createdAt: number;
  updatedAt: number;
}

export interface ExarotonServer {
  id: string;
  name: string;
  address: string;
  status: number;
  players: { max: number; count: number; list: string[] };
}

export interface ExarotonPool {
  id: string;
  name: string;
  credits: number;
}

export interface ExarotonAccount {
  name: string;
  email: string;
  credits: number;
}