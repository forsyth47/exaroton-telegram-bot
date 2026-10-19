export type BillingSource =
  | { type: 'pool'; poolId: string }
  | { type: 'profile' };

export interface GroupConfig {
  chatId: string;
  tenantId: string;
  serverId?: string;
  serverName?: string;
  billing?: BillingSource;
  configuredBy?: number;
  updatedAt: number;
  
  // Notification preferences
  notifyEnabled?: boolean;
  notifyStart?: boolean;
  notifyStop?: boolean;
  notifyJoin?: boolean;
  notifyLeave?: boolean;
}

export interface Tenant {
  id: string;
  exarotonToken: string; // TODO: encrypt at rest
  createdAt: number;
  updatedAt: number;
}

export interface ExarotonServer {
  id: string;
  name: string;
  address: string;
  status: number;
  motd?: string;
  host?: string | null;
  port?: number | null;
  players: { max: number; count: number; list?: string[] };
  software?: { id: string; name: string; version: string } | null;
  shared?: boolean;
}

export interface ExarotonPool {
  id: string;
  name: string;
  credits: number;
  servers?: number;
  owner?: string;
  isOwner?: boolean;
  members?: number;
  ownShare?: number;
  ownCredits?: number;
}

export interface ExarotonAccount {
  name: string;
  email: string;
  credits: number;
  verified?: boolean;
}

/** WebSocket `stats` stream payload. */
export interface ServerStats {
  memory: { percent: number; usage: number };
}

export interface MonitoringState {
  tenantId: string;
  serverId: string;
  lastStatus: number;
  lastPlayers: string[];
  lastEventAt: number;
}

export interface ServerSession {
  id: string;
  tenantId: string;
  chatId: string;
  serverId: string;
  creditsBefore: number;
  creditsAfter: number | null;
  creditsUsed: number | null;
  startedAt: number;
  stoppedAt: number | null;
}

/** Read-only view used by /status. Never mutates monitoring state. */
export interface ServerSnapshot {
  server: ExarotonServer | null;
  stats: ServerStats | null;
  statsAt: number | null;
  updatedAt: number;
  transport: 'websocket' | 'polling' | 'unknown';
  sessionStartedAt: number | null;
}