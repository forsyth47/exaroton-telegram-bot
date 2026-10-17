import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Storage } from './interface.js';
import { GroupConfig, MonitoringState, ServerSession, Tenant } from '../core/types.js';
import crypto from 'node:crypto';

export class SqliteStorage implements Storage {
  private db: Database;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') {
      const absolute = resolve(dbPath);
      // Bun's Database automatically creates the file, but we ensure the directory exists
      mkdirSync(dirname(absolute), { recursive: true });
      this.db = new Database(absolute, { create: true });
    } else {
      this.db = new Database(':memory:');
    }
    
    this.db.exec('PRAGMA journal_mode = WAL;');
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
        server_name TEXT,
        billing_type TEXT,
        pool_id TEXT,
        configured_by INTEGER,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS server_sessions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        credits_before REAL NOT NULL,
        credits_after REAL,
        credits_used REAL,
        started_at INTEGER NOT NULL,
        stopped_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_open
        ON server_sessions (tenant_id, server_id, stopped_at);

      CREATE TABLE IF NOT EXISTS monitoring_state (
        tenant_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        last_status INTEGER NOT NULL,
        last_players_json TEXT NOT NULL,
        last_event_at INTEGER NOT NULL,
        PRIMARY KEY (tenant_id, server_id)
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  async getTenant(id: string): Promise<Tenant | null> {
    const r = this.db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as any;
    return r ? { id: r.id, exarotonToken: r.exaroton_token, createdAt: r.created_at, updatedAt: r.updated_at } : null;
  }

  async saveTenant(t: Tenant): Promise<void> {
    this.db.prepare(`
      INSERT INTO tenants (id, exaroton_token, created_at, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET exaroton_token = excluded.exaroton_token, updated_at = excluded.updated_at
    `).run(t.id, t.exarotonToken, t.createdAt, t.updatedAt);
  }

  private mapGroup(r: any): GroupConfig {
    return {
      chatId: r.chat_id,
      tenantId: r.tenant_id,
      serverId: r.server_id ?? undefined,
      serverName: r.server_name ?? undefined,
      billing: r.billing_type === 'pool'
        ? { type: 'pool', poolId: r.pool_id }
        : r.billing_type === 'profile' ? { type: 'profile' } : undefined,
      configuredBy: r.configured_by ?? undefined,
      updatedAt: r.updated_at,
    };
  }

  async getGroupConfig(chatId: string): Promise<GroupConfig | null> {
    const r = this.db.prepare('SELECT * FROM groups WHERE chat_id = ?').get(chatId) as any;
    return r ? this.mapGroup(r) : null;
  }

  async getAllGroupConfigs(): Promise<GroupConfig[]> {
    return (this.db.prepare('SELECT * FROM groups').all() as any[]).map(r => this.mapGroup(r));
  }

  async saveGroupConfig(c: GroupConfig): Promise<void> {
    this.db.prepare(`
      INSERT INTO groups (chat_id, tenant_id, server_id, server_name, billing_type, pool_id, configured_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        tenant_id = excluded.tenant_id, server_id = excluded.server_id,
        server_name = excluded.server_name, billing_type = excluded.billing_type, 
        pool_id = excluded.pool_id, configured_by = excluded.configured_by, updated_at = excluded.updated_at
    `).run(
      c.chatId, c.tenantId, c.serverId ?? null, c.serverName ?? null,
      c.billing?.type ?? null, c.billing?.type === 'pool' ? c.billing.poolId : null,
      c.configuredBy ?? null, c.updatedAt,
    );
  }

  async deleteGroupConfig(chatId: string): Promise<void> {
    this.db.prepare('DELETE FROM groups WHERE chat_id = ?').run(chatId);
  }

  async createSession(tenantId: string, chatId: string, serverId: string, creditsBefore: number): Promise<string> {
    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO server_sessions (id, tenant_id, chat_id, server_id, credits_before, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, tenantId, chatId, serverId, creditsBefore, Date.now());
    return id;
  }

  async closeSession(sessionId: string, creditsAfter: number, creditsUsed: number): Promise<void> {
    this.db.prepare(`
      UPDATE server_sessions SET credits_after = ?, credits_used = ?, stopped_at = ? WHERE id = ?
    `).run(creditsAfter, creditsUsed, Date.now(), sessionId);
  }

  async getOpenSession(tenantId: string, serverId: string): Promise<ServerSession | null> {
    const r = this.db.prepare(`
      SELECT * FROM server_sessions
      WHERE tenant_id = ? AND server_id = ? AND stopped_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `).get(tenantId, serverId) as any;

    return r ? {
      id: r.id, tenantId: r.tenant_id, chatId: r.chat_id, serverId: r.server_id,
      creditsBefore: r.credits_before, creditsAfter: r.credits_after,
      creditsUsed: r.credits_used, startedAt: r.started_at, stoppedAt: r.stopped_at,
    } : null;
  }

  async getMonitoringState(tenantId: string, serverId: string): Promise<MonitoringState | null> {
    const r = this.db.prepare(`
      SELECT * FROM monitoring_state WHERE tenant_id = ? AND server_id = ?
    `).get(tenantId, serverId) as any;

    return r ? {
      tenantId, serverId,
      lastStatus: r.last_status,
      lastPlayers: JSON.parse(r.last_players_json),
      lastEventAt: r.last_event_at,
    } : null;
  }

  async saveMonitoringState(s: MonitoringState): Promise<void> {
    this.db.prepare(`
      INSERT INTO monitoring_state (tenant_id, server_id, last_status, last_players_json, last_event_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, server_id) DO UPDATE SET
        last_status = excluded.last_status,
        last_players_json = excluded.last_players_json,
        last_event_at = excluded.last_event_at
    `).run(s.tenantId, s.serverId, s.lastStatus, JSON.stringify(s.lastPlayers), s.lastEventAt);
  }
}