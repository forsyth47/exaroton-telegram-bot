// src/monitoring/monitor.ts
import WebSocket from 'ws';
import { Tenant, ExarotonServer } from '../core/types.js';
import { ExarotonClient } from '../exaroton/client.js';
import { Storage } from '../storage/interface.js';
import { Notifier, MonitorEvent } from '../core/events.js';
import { calculatePlayerDiff } from './player-diff.js';

enum Status { OFFLINE = 0, ONLINE = 1, STARTING = 2, STOPPING = 3, RESTARTING = 4, CRASHED = 7 }

export class Monitor {
  private ws: WebSocket | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private currentStatus: number = Status.OFFLINE;
  private currentPlayers: Set<string> = new Set();
  private sessionId: string | null = null;
  private sessionStartedAt: number = 0;
  private creditsBefore: number = 0;

  constructor(
    private tenant: Tenant,
    private chatId: string,
    private serverId: string,
    private client: ExarotonClient,
    private storage: Storage,
    private notifier: Notifier
  ) {}

  async start() {
    console.log(`[Monitor] Starting monitor for ${this.serverId} (Tenant: ${this.tenant.id})`);
    try {
      const server = await this.client.getServer(this.serverId);
      this.handleStatusUpdate(server);
    } catch (err) {
      console.error(`[Monitor] Failed to fetch initial state for ${this.serverId}`, err);
      this.schedulePolling(); // Fallback to polling if REST fails initially
    }
  }

  stop() {
    this.clearPolling();
    this.closeWs();
  }

  private async handleStatusUpdate(server: ExarotonServer) {
    const prevStatus = this.currentStatus;
    const currStatus = server.status;
    const prevPlayers = this.currentPlayers;
    const currPlayers = new Set(server.players.list || []);

    // --- CRITICAL FIX: Update Internal State IMMEDIATELY ---
    // This must happen synchronously before any `await` calls to prevent
    // race conditions where concurrent calls read stale state.
    this.currentStatus = currStatus;
    this.currentPlayers = currPlayers;

    // --- State Machine & Event Emission ---
    if (prevStatus !== Status.ONLINE && currStatus === Status.ONLINE) {
      await this.emit({ type: 'server_started', serverId: this.serverId, name: server.name, chatId: this.chatId });
      await this.startSession(server.name);
    }
    
    if (prevStatus === Status.ONLINE && currStatus === Status.OFFLINE) {
      await this.endSession(server.name);
    }

    if (currStatus === Status.CRASHED && prevStatus !== Status.CRASHED) {
      await this.emit({ type: 'server_crashed', serverId: this.serverId, name: server.name, chatId: this.chatId });
      if (this.sessionId) await this.endSession(server.name);
    }

    // Player Diffing (Only relevant when transitioning through online states)
    if (currStatus === Status.ONLINE || prevStatus === Status.ONLINE) {
      const { joined, left } = calculatePlayerDiff(prevPlayers, currPlayers);
      for (const p of joined) {
        await this.emit({ type: 'player_joined', serverId: this.serverId, name: server.name, chatId: this.chatId, player: p, online: server.players.count, max: server.players.max });
      }
      for (const p of left) {
        await this.emit({ type: 'player_left', serverId: this.serverId, name: server.name, chatId: this.chatId, player: p, online: server.players.count, max: server.players.max });
      }
    }

    // --- Hybrid Strategy: Manage Polling vs WS ---
    if (currStatus === Status.OFFLINE || currStatus === Status.CRASHED) {
      this.closeWs();
      this.schedulePolling();
    } else {
      this.clearPolling();
      // Check for both OPEN and CONNECTING to prevent connection leaks
      if (!this.ws || (this.ws.readyState !== WebSocket.OPEN && this.ws.readyState !== WebSocket.CONNECTING)) {
        this.connectWs();
      }
    }
  }

  // --- REST Polling (Offline Detection) ---
  private schedulePolling() {
    this.clearPolling();
    this.pollingInterval = setInterval(() => this.poll(), 15000);
  }

  private clearPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async poll() {
    try {
      const server = await this.client.getServer(this.serverId);
      this.handleStatusUpdate(server);
    } catch (err) {
      console.error(`[Monitor] Polling error for ${this.serverId}`, err);
    }
  }

  // --- WebSocket (Real-time Events) ---
  private connectWs() {
    // Guard against multiple simultaneous connection attempts
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; 
    }

    const url = `wss://api.exaroton.com/v1/servers/${this.serverId}/websocket`;
    this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${this.tenant.exarotonToken}` } });

    this.ws.on('open', () => {
      console.log(`[Monitor] WS connected for ${this.serverId} (Tenant: ${this.tenant.id})`);
      this.retryCount = 0; // Reset backoff
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.stream === 'status' && msg.type === 'status') {
          this.handleStatusUpdate(msg.data);
        }
      } catch (e) { /* Ignore malformed/keep-alive */ }
    });

    this.ws.on('close', () => this.handleDisconnect());
    this.ws.on('error', (err) => {
      console.error(`[Monitor] WS error for ${this.serverId}:`, err.message);
      this.closeWs();
    });
  }

  private closeWs() {
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private handleDisconnect() {
    if (this.currentStatus !== Status.OFFLINE && this.currentStatus !== Status.CRASHED) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 60s max
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 60000);
      this.retryCount++;
      console.log(`[Monitor] WS disconnected for ${this.serverId}. Reconnecting in ${delay}ms...`);
      setTimeout(() => this.connectWs(), delay);
    }
  }

  // --- Session & Credit Tracking ---
  private async startSession(serverName: string) {
    try {
      const credits = await this.getCurrentCredits();
      this.creditsBefore = credits;
      this.sessionStartedAt = Date.now();
      this.sessionId = await this.storage.createSession(this.tenant.id, this.chatId, this.serverId, credits);
    } catch (err) {
      console.error(`[Monitor] Failed to start session for ${this.serverId}`, err);
    }
  }

  private async endSession(serverName: string) {
    if (!this.sessionId) return;
    try {
      const creditsAfter = await this.getCurrentCredits();
      const durationMs = Date.now() - this.sessionStartedAt;
      const creditsUsed = Math.max(0, this.creditsBefore - creditsAfter); // Prevent negative if credits were added

      await this.storage.updateSession(this.sessionId, creditsAfter);
      
      await this.emit({
        type: 'server_stopped', serverId: this.serverId, name: serverName, chatId: this.chatId,
        durationMs, creditsUsed, creditsRemaining: creditsAfter
      });
    } catch (err) {
      console.error(`[Monitor] Failed to end session for ${this.serverId}`, err);
    } finally {
      this.sessionId = null;
    }
  }

  private async getCurrentCredits(): Promise<number> {
    const config = await this.storage.getGroupConfig(this.chatId);
    if (config?.billing?.type === 'pool') {
      const pool = await this.client.getPool(config.billing.poolId);
      return pool.credits;
    }
    const account = await this.client.getAccount();
    return account.credits;
  }

  private async emit(event: MonitorEvent) {
    try {
      await this.notifier.notify(event);
    } catch (err) {
      console.error(`[Monitor] Failed to emit event`, err);
    }
  }
}