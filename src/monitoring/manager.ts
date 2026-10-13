// src/monitoring/manager.ts
import { Monitor } from './monitor.js';
import { Storage } from '../storage/interface.js';
import { ExarotonClient } from '../exaroton/client.js';
import { Tenant } from '../core/types.js';
import { Notifier } from '../core/events.js';

export class MonitorManager {
  private monitors = new Map<string, Monitor>(); // Key: tenantId:serverId

  constructor(
    private storage: Storage,
    private getClient: (tenantId: string) => Promise<ExarotonClient>,
    private getTenant: (tenantId: string) => Promise<Tenant | null>,
    private notifier: Notifier
  ) {}

  async reconcileAll() {
    const groups = await this.storage.getAllGroupConfigs();
    const activeKeys = new Set<string>();

    for (const group of groups) {
      if (!group.serverId || !group.tenantId) continue;
      
      const key = `${group.tenantId}:${group.serverId}`;
      activeKeys.add(key);

      if (!this.monitors.has(key)) {
        const tenant = await this.getTenant(group.tenantId);
        if (!tenant) continue;
        
        const client = await this.getClient(group.tenantId);
        const monitor = new Monitor(tenant, group.chatId, group.serverId, client, this.storage, this.notifier);
        this.monitors.set(key, monitor);
        await monitor.start();
      }
    }

    // Stop monitors for unconfigured/deleted groups
    for (const [key, monitor] of this.monitors.entries()) {
      if (!activeKeys.has(key)) {
        monitor.stop();
        this.monitors.delete(key);
      }
    }
  }
}