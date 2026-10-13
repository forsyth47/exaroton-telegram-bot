import { GroupConfig, MonitoringState, ServerSession, Tenant } from '../core/types.js';

export interface Storage {
  init(): Promise<void>;
  close(): void;

  getTenant(id: string): Promise<Tenant | null>;
  saveTenant(tenant: Tenant): Promise<void>;

  getGroupConfig(chatId: string): Promise<GroupConfig | null>;
  saveGroupConfig(config: GroupConfig): Promise<void>;
  deleteGroupConfig(chatId: string): Promise<void>;
  getAllGroupConfigs(): Promise<GroupConfig[]>;

  createSession(tenantId: string, chatId: string, serverId: string, creditsBefore: number): Promise<string>;
  closeSession(sessionId: string, creditsAfter: number, creditsUsed: number): Promise<void>;
  getOpenSession(tenantId: string, serverId: string): Promise<ServerSession | null>;

  getMonitoringState(tenantId: string, serverId: string): Promise<MonitoringState | null>;
  saveMonitoringState(state: MonitoringState): Promise<void>;
}