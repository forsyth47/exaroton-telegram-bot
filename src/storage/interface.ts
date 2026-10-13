// src/storage/interface.ts
import { GroupConfig, Tenant } from "../core/types.js";

export interface Storage {
  init(): Promise<void>;
  getTenant(id: string): Promise<Tenant | null>;
  saveTenant(tenant: Tenant): Promise<void>;
  getGroupConfig(chatId: string): Promise<GroupConfig | null>;
  saveGroupConfig(config: GroupConfig): Promise<void>;
  getAllGroupConfigs(): Promise<GroupConfig[]>;
  createSession(tenantId: string, chatId: string, serverId: string, creditsBefore: number): Promise<string>;
  updateSession(sessionId: string, creditsAfter: number): Promise<void>;
}