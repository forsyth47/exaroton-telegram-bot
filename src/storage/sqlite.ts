// src/storage/sqlite.ts
import Database from "better-sqlite3";
import { Storage } from "./interface.js";
import { GroupConfig, Tenant } from "../core/types.js";

export class SqliteStorage implements Storage {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  async init(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        exaroton_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS groups (
        chat_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        server_id TEXT,
        billing_type TEXT,
        pool_id TEXT,
        configured_by INTEGER,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(tenant_id) REFERENCES tenants(id)
      );
    `);
  }

  async getTenant(id: string): Promise<Tenant | null> {
    const row = this.db.prepare("SELECT * FROM tenants WHERE id = ?").get(id) as any;
    if (!row) return null;
    return { id: row.id, exarotonToken: row.exaroton_token, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  async saveTenant(tenant: Tenant): Promise<void> {
    this.db.prepare(`
      INSERT INTO tenants (id, exaroton_token, created_at, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET exaroton_token = excluded.exaroton_token, updated_at = excluded.updated_at
    `).run(tenant.id, tenant.exarotonToken, tenant.createdAt, tenant.updatedAt);
  }

  async getGroupConfig(chatId: string): Promise<GroupConfig | null> {
    const row = this.db.prepare("SELECT * FROM groups WHERE chat_id = ?").get(chatId) as any;
    if (!row) return null;
    return {
      chatId: row.chat_id, tenantId: row.tenant_id, serverId: row.server_id,
      billing: row.billing_type === "pool" ? { type: "pool", poolId: row.pool_id } : (row.billing_type === "profile" ? { type: "profile" } : undefined),
      configuredBy: row.configured_by, updatedAt: row.updated_at,
    };
  }

  async saveGroupConfig(config: GroupConfig): Promise<void> {
    this.db.prepare(`
      INSERT INTO groups (chat_id, tenant_id, server_id, billing_type, pool_id, configured_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET tenant_id = excluded.tenant_id, server_id = excluded.server_id, 
      billing_type = excluded.billing_type, pool_id = excluded.pool_id, configured_by = excluded.configured_by, updated_at = excluded.updated_at
    `).run(
      config.chatId, config.tenantId, config.serverId || null, 
      config.billing?.type || null, config.billing?.type === "pool" ? config.billing.poolId : null, 
      config.configuredBy || null, config.updatedAt
    );
  }
}