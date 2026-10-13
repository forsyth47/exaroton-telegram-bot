import { Monitor } from './monitor.js';
import { Storage } from '../storage/interface.js';
import { ExarotonClient } from '../exaroton/client.js';
import { Tenant } from '../core/types.js';
import { Notifier } from '../core/events.js';

interface ServerEntry {
  tenantId: string;
  serverId: string;
  chatIds: string[];
}

export class MonitorManager {
  private monitors = new Map<string, Monitor>();
  private chatToKey = new Map<string, string>();
  private reconciling: Promise<void> | null = null;

  constructor(
    private storage: Storage,
    private getClient: (tenantId: string) => Promise<ExarotonClient>,
    private getTenant: (tenantId: string) => Promise<Tenant | null>,
    private notifier: Notifier,
  ) {}

  /** Serialized so /status and the periodic timer cannot double-start monitors. */
  async reconcileAll(): Promise<void> {
    if (this.reconciling) return this.reconciling;
    this.reconciling = this.doReconcile()
      .catch(err => console.error('[Manager] Reconciliation failed', err))
      .finally(() => { this.reconciling = null; });
    return this.reconciling;
  }

  private async doReconcile(): Promise<void> {
    const groups = await this.storage.getAllGroupConfigs();
    const desired = new Map<string, ServerEntry>();

    for (const g of groups) {
      if (!g.serverId || !g.tenantId) continue;
      const key = `${g.tenantId}:${g.serverId}`;
      const entry = desired.get(key) ?? { tenantId: g.tenantId, serverId: g.serverId, chatIds: [] };
      entry.chatIds.push(g.chatId);
      desired.set(key, entry);
    }

    for (const [key, monitor] of this.monitors) {
      if (!desired.has(key)) {
        await monitor.stop();
        this.monitors.delete(key);
      }
    }

    this.chatToKey.clear();

    for (const [key, entry] of desired) {
      let monitor = this.monitors.get(key);

      if (monitor) {
        monitor.setDestinations(entry.chatIds);
      } else {
        const tenant = await this.getTenant(entry.tenantId);
        if (!tenant) continue;

        const client = await this.getClient(entry.tenantId);
        monitor = new Monitor(tenant, entry.chatIds[0], entry.serverId, client, this.storage, this.notifier);
        monitor.setDestinations(entry.chatIds);
        this.monitors.set(key, monitor);

        try {
          await monitor.start();
        } catch (err) {
          console.error(`[Manager] Failed to start monitor ${key}`, err);
        }
      }

      for (const chatId of entry.chatIds) this.chatToKey.set(chatId, key);
    }
  }

  forChat(chatId: string): Monitor | undefined {
    const key = this.chatToKey.get(chatId);
    return key ? this.monitors.get(key) : undefined;
  }

  async stopAll(): Promise<void> {
    for (const monitor of this.monitors.values()) await monitor.stop();
    this.monitors.clear();
    this.chatToKey.clear();
  }
}