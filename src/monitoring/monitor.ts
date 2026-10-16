import WebSocket from 'ws';
import {
  ExarotonServer, MonitoringState, ServerSnapshot, ServerStats, Tenant,
} from '../core/types.js';
import { ExarotonClient } from '../exaroton/client.js';
import { Storage } from '../storage/interface.js';
import { MonitorEvent, Notifier } from '../core/events.js';
import { calculatePlayerDiff } from './player-diff.js';
import {
  ServerStatus, evaluateAction, isSessionActive, isStoppedLike, type ServerAction,
} from './state-machine.js';

const POLL_INTERVAL_MS = 15_000;
const RESTART_GRACE_MS = 60_000;
const HEARTBEAT_MS = 30_000;

export class Monitor {
  private ws: WebSocket | null = null;
  private wsReady = false;
  private statsSubscribed = false;
  private pongAlive = true;

  private polling: NodeJS.Timeout | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private retryCount = 0;
  private stopped = false;
  private shuttingDownSession = false;
  private actionInFlight = false;

  private currentStatus = ServerStatus.OFFLINE;
  private currentPlayers = new Set<string>();
  private playerBaselineReady = false;

  private latestServer: ExarotonServer | null = null;
  private latestStats: ServerStats | null = null;
  private statsAt: number | null = null;
  private updatedAt = 0;
  private transport: ServerSnapshot['transport'] = 'unknown';

  private sessionId: string | null = null;
  private sessionStartedAt = 0;
  private creditsBefore = 0;
  private notifiedStarting = false;
  private notifiedStarted = false;
  private restartGraceUntil = 0;

  private destinations: string[];
  private queue: Promise<void> = Promise.resolve();

  private startingMsgIds = new Map<string, number>();
  private stoppingMsgIds = new Map<string, number>();

  constructor(
    private tenant: Tenant,
    chatId: string,
    private serverId: string,
    private client: ExarotonClient,
    private storage: Storage,
    private notifier: Notifier,
  ) {
    this.destinations = [chatId];
  }

  /** One physical server may be reported to several groups under the same tenant. */
  setDestinations(chatIds: string[]): void {
    this.destinations = [...chatIds];
  }

  // ───────────────────────── Lifecycle ─────────────────────────

  async start(): Promise<void> {
    this.stopped = false;

    const persisted = await this.storage.getMonitoringState(this.tenant.id, this.serverId);
    const openSession = await this.storage.getOpenSession(this.tenant.id, this.serverId);

    if (persisted) {
      this.currentStatus = persisted.lastStatus;
      this.currentPlayers = new Set(persisted.lastPlayers);
    }

    if (openSession) {
      this.sessionId = openSession.id;
      this.sessionStartedAt = openSession.startedAt;
      this.creditsBefore = openSession.creditsBefore;
      // We did not observe this start; do not announce it again.
      this.notifiedStarting = true;
      this.notifiedStarted = true;
    }

    let server: ExarotonServer;
    try {
      server = await this.client.getServer(this.serverId);
    } catch (err) {
      console.error(`[Monitor:${this.serverId}] Initial REST fetch failed; falling back to polling.`, err);
      this.schedulePolling();
      return;
    }

    this.latestServer = server;
    this.updatedAt = Date.now();

    if (!persisted) {
      // First time we ever see this server: adopt silently.
      this.currentStatus = server.status;
      this.currentPlayers = new Set(server.players?.list ?? []);

      if (isSessionActive(server.status) && !this.sessionId) {
        await this.beginSession();
        this.notifiedStarting = true;
        this.notifiedStarted = true;
      } else if (isStoppedLike(server.status) && this.sessionId) {
        // Session was left open while the bot was down.
        await this.endSession('stopped');
      }

      await this.persistState();
      this.syncTransports();
      return;
    }

    // Replay persisted state -> live state (catches up missed stops).
    await this.applyStatus(server, 'polling');
  }

  async stop(): Promise<void> {
      this.stopped = true;
      this.clearPolling();
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      await this.persistState().catch(() => {});
      
      // Pass 'true' to force-terminate the WebSocket on shutdown
      this.closeWs(true); 
    }

  // ───────────────────── State machine / dedupe ─────────────────────

  private applyStatus(server: ExarotonServer, source: 'websocket' | 'polling'): Promise<void> {
    if (this.stopped) return Promise.resolve();

    // Always keep the freshest snapshot; the queue reads this, not the argument.
    this.latestServer = server;
    this.updatedAt = Date.now();
    this.transport = source;

    this.queue = this.queue
      .then(() => this.transition())
      .catch(err => console.error(`[Monitor:${this.serverId}] Transition failed`, err));

    return this.queue;
  }

  private async transition(): Promise<void> {
    if (this.stopped) return;
    const server = this.latestServer;
    if (!server) return;

    const prev = this.currentStatus;
    const curr = server.status;
    const prevPlayers = this.currentPlayers;
    const currPlayers = new Set(server.players?.list ?? []);

    // Commit synchronously before any await.
    this.currentStatus = curr;
    this.currentPlayers = currPlayers;

    if (curr === ServerStatus.RESTARTING && prev !== ServerStatus.RESTARTING) {
      this.restartGraceUntil = Date.now() + RESTART_GRACE_MS;
    }

    const wasActive = isSessionActive(prev);
    const isActive = isSessionActive(curr);

    // ── Session begin ──
    if (isActive && !wasActive) {
      this.notifiedStarting = false;
      this.notifiedStarted = false;
      this.playerBaselineReady = false;
    }

    if (isActive && !this.sessionId) {
      await this.beginSession();
    }

    if (isActive && !this.notifiedStarting && curr !== ServerStatus.ONLINE) {
      this.notifiedStarting = true;
      await this.emit({ type: 'server_starting', serverId: this.serverId, name: server.name, chatId: '' });
    }

    if (curr === ServerStatus.ONLINE && !this.notifiedStarted) {
      this.notifiedStarted = true;
      this.notifiedStarting = true; // Prevent duplicate starting emissions
      
      for (const chatId of this.destinations) {
        const startingMsgId = this.startingMsgIds.get(chatId);
        const text = `🚀 *Server started*\n\nServer: ${esc(server.name)}`;
        
        if (startingMsgId) {
          // Edit the existing "starting" message in place
          await this.notifier.editMessage(chatId, startingMsgId, text);
          this.startingMsgIds.delete(chatId); // Clean up
        } else {
          // Fallback: if we missed the ID (e.g., bot restarted), just send a new one
          await this.notifier.notify({ type: 'server_started', serverId: this.serverId, name: server.name, chatId });
        }
      }
    }

    // ── Shutdown notification (the missing piece) ──
    if (curr === ServerStatus.STOPPING && prev !== ServerStatus.STOPPING) {
      await this.emit({ type: 'server_stopping', serverId: this.serverId, name: server.name, chatId: '' });
    }

    // ── Player diff: only between two ONLINE snapshots ──
    // Avoids fake joins during boot/STARTING and a flood of "left" on shutdown.
    if (curr === ServerStatus.ONLINE) {
      if (prev === ServerStatus.ONLINE && this.playerBaselineReady) {
        const { joined, left } = calculatePlayerDiff(prevPlayers, currPlayers);
        for (const player of joined) {
          await this.emit({
            type: 'player_joined', serverId: this.serverId, name: server.name, chatId: '',
            player, online: server.players?.count ?? 0, max: server.players?.max ?? 0,
          });
        }
        for (const player of left) {
          await this.emit({
            type: 'player_left', serverId: this.serverId, name: server.name, chatId: '',
            player, online: server.players?.count ?? 0, max: server.players?.max ?? 0,
          });
        }
      }
      this.playerBaselineReady = true;
    } else {
      this.playerBaselineReady = false;
    }

    // ── Session end: OFFLINE / CRASHED, with restart grace ──
    if (isStoppedLike(curr) && this.sessionId && !this.shuttingDownSession) {
      if (curr === ServerStatus.OFFLINE && Date.now() < this.restartGraceUntil) {
        // Internal restart: keep the session, stay silent.
        // Polling remains active and will re-evaluate after the grace window.
      } else {
        await this.endSession(curr === ServerStatus.CRASHED ? 'crashed' : 'stopped');
      }
    }

    this.syncTransports();
    await this.persistState();
  }

  // ─────────────────────── Session / credits ───────────────────────

  private async readCredits(): Promise<number> {
    const config = await this.storage.getGroupConfig(this.destinations[0]);
    if (config?.billing?.type === 'pool') {
      return (await this.client.getPool(config.billing.poolId)).credits;
    }
    return (await this.client.getAccount()).credits;
  }

  private async beginSession(): Promise<void> {
    if (this.sessionId) return;
    try {
      this.creditsBefore = await this.readCredits();
      this.sessionStartedAt = Date.now();
      this.sessionId = await this.storage.createSession(
        this.tenant.id, this.destinations[0], this.serverId, this.creditsBefore,
      );
      console.log(`[Monitor:${this.serverId}] Session ${this.sessionId} opened (credits=${this.creditsBefore})`);
    } catch (err) {
      console.error(`[Monitor:${this.serverId}] Could not open session; will retry.`, err);
    }
  }

  private async endSession(reason: 'stopped' | 'crashed'): Promise<void> {
    if (!this.sessionId || this.shuttingDownSession) return;
    this.shuttingDownSession = true;

    const id = this.sessionId;
    try {
      const after = await this.readCredits();
      const durationMs = Date.now() - this.sessionStartedAt;
      const used = Math.max(0, this.creditsBefore - after);

      await this.storage.closeSession(id, after, used);
      this.sessionId = null;
      this.restartGraceUntil = 0;

      const server = this.latestServer;
      const serverName = server?.name ?? this.serverId;

      // Build the final summary text
      const text = [
        reason === 'crashed' ? '💥 *Server crashed*' : '🛑 *Server stopped*',
        '',
        `Server: ${esc(serverName)}`,
        `Session duration: ${formatDuration(durationMs)}`,
        `Estimated credits used: ${used.toFixed(2)}`,
        `Remaining credits: ${after.toFixed(2)}`,
      ].join('\n');

      // Edit the "stopping" message in place for each destination
      for (const chatId of this.destinations) {
        const stoppingMsgId = this.stoppingMsgIds.get(chatId);
        if (stoppingMsgId) {
          await this.notifier.editMessage(chatId, stoppingMsgId, text);
          this.stoppingMsgIds.delete(chatId); // Clean up
        } else {
          // Fallback: send as a new message if we lost the ID
          await this.notifier.notify({
            type: reason === 'crashed' ? 'server_crashed' : 'server_stopped',
            serverId: this.serverId,
            name: serverName,
            chatId,
            durationMs,
            creditsUsed: used,
            creditsRemaining: after,
          });
        }
      }

      console.log(`[Monitor:${this.serverId}] Session ${id} closed (used≈${used.toFixed(2)})`);
    } catch (err) {
      console.error(`[Monitor:${this.serverId}] Could not close session; will retry.`, err);
    } finally {
      this.shuttingDownSession = false;
    }
  }

  private async persistState(): Promise<void> {
    const state: MonitoringState = {
      tenantId: this.tenant.id,
      serverId: this.serverId,
      lastStatus: this.currentStatus,
      lastPlayers: [...this.currentPlayers],
      lastEventAt: Date.now(),
    };
    await this.storage.saveMonitoringState(state);
  }

  // ───────────────────── Hybrid transports ─────────────────────

  private syncTransports(): void {
    if (this.stopped) return;

    if (isStoppedLike(this.currentStatus)) {
      this.closeWs();
      this.latestStats = null;
      this.statsAt = null;
      this.schedulePolling();
      return;
    }

    this.ensureWs();

    const healthy =
      this.ws?.readyState === WebSocket.OPEN && this.wsReady && this.pongAlive;

    // Safety net: keep polling during STARTING / STOPPING / RESTARTING,
    // and whenever the socket is unhealthy. Only a healthy ONLINE socket
    // is allowed to disable polling.
    if (this.currentStatus === ServerStatus.ONLINE && healthy) {
      this.clearPolling();
    } else {
      this.schedulePolling();
    }

    this.maybeSubscribeStats();
  }

  private schedulePolling(): void {
    if (this.polling || this.stopped) return;
    this.polling = setInterval(() => { void this.poll(); }, POLL_INTERVAL_MS);
  }

  private clearPolling(): void {
    if (this.polling) clearInterval(this.polling);
    this.polling = null;
  }

  private async poll(): Promise<void> {
    if (this.stopped) return;
    try {
      const server = await this.client.getServer(this.serverId);
      await this.applyStatus(server, 'polling');
    } catch (err) {
      console.error(`[Monitor:${this.serverId}] Poll failed`, err);
    }
  }

  private ensureWs(): void {
    if (this.stopped || this.reconnectTimer) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.openWs();
  }

  private openWs(): void {
    if (this.stopped) return;

    const ws = new WebSocket(
      `wss://api.exaroton.com/v1/servers/${this.serverId}/websocket`,
      { headers: { Authorization: `Bearer ${this.tenant.exarotonToken}` } },
    );

    this.ws = ws;
    this.wsReady = false;
    this.statsSubscribed = false;
    this.pongAlive = true;

    ws.on('open', () => {
      this.retryCount = 0;
      this.startHeartbeat();
    });

    ws.on('pong', () => { this.pongAlive = true; });

    ws.on('message', (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      // Gate: the API says do not send anything before "ready".
      if (msg.type === 'ready') {
        this.wsReady = true;
        this.maybeSubscribeStats();
        return;
      }

      if (msg.type === 'connected') {
        this.maybeSubscribeStats();
        return;
      }

      if (msg.type === 'disconnected') {
        // NOT a session end. The status stream decides that.
        this.latestStats = null;
        this.statsAt = null;
        this.schedulePolling();
        return;
      }

      if (msg.type === 'keep-alive') return;

      if (msg.stream === 'status' && msg.type === 'status' && msg.data) {
        void this.applyStatus(msg.data as ExarotonServer, 'websocket');
        return;
      }

      if (msg.stream === 'stats' && msg.type === 'started') {
        this.statsSubscribed = true;
        return;
      }

      if (msg.stream === 'stats' && msg.type === 'stats' && msg.data?.memory) {
        this.latestStats = msg.data as ServerStats;
        this.statsAt = Date.now();
      }
    });

    ws.on('close', () => this.handleDisconnect());
    ws.on('error', (err: Error) => {
      console.error(`[Monitor:${this.serverId}] WS error: ${err.message}`);
    });
  }

  private maybeSubscribeStats(): void {
    if (!this.wsReady || this.statsSubscribed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!isSessionActive(this.currentStatus)) return;

    this.ws.send(JSON.stringify({ stream: 'stats', type: 'start' }));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pongAlive = true;
    this.heartbeat = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (!this.pongAlive) {
        this.ws.terminate(); // force 'close' -> reconnect
        return;
      }
      this.pongAlive = false;
      this.ws.ping();
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.wsReady = false;
    this.statsSubscribed = false;
    this.latestStats = null;
    this.statsAt = null;

    if (this.stopped) return;

    // Critical: never leave a running server without a safety net.
    this.schedulePolling();

    if (isStoppedLike(this.currentStatus)) return; // polling is enough

    const delay = Math.min(1000 * 2 ** this.retryCount, 60_000);
    this.retryCount++;
    console.log(`[Monitor:${this.serverId}] WS lost; reconnecting in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openWs();
    }, delay);
  }

  // Add a 'force' parameter to closeWs
  private closeWs(force = false): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopHeartbeat();

    const ws = this.ws;
    this.ws = null;
    this.wsReady = false;
    this.statsSubscribed = false;

    if (ws) {
      ws.removeAllListeners();
      if (force) {
        // INSTANTLY destroy the socket. This frees the Node.js event loop immediately.
        ws.terminate(); 
      } else {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
        } catch { /* ignore */ }
      }
    }
  }

  // ───────────────────────── Public API ─────────────────────────

  getSnapshot(): ServerSnapshot {
    return {
      server: this.latestServer,
      stats: this.latestStats,
      statsAt: this.statsAt,
      updatedAt: this.updatedAt,
      transport: this.transport,
      sessionStartedAt: this.sessionId ? this.sessionStartedAt : null,
    };
  }

  async control(action: ServerAction): Promise<{ ok: boolean; message: string }> {
    if (this.actionInFlight) {
      return { ok: false, message: 'An action is already in progress. Please wait.' };
    }

    const status = this.latestServer?.status ?? ServerStatus.OFFLINE;
    const guard = evaluateAction(status, action);
    if (!guard.allowed) return { ok: false, message: guard.message! };

    this.actionInFlight = true;
    try {
      if (action === 'start') await this.client.startServer(this.serverId);
      if (action === 'stop') await this.client.stopServer(this.serverId);
      if (action === 'restart') await this.client.restartServer(this.serverId);

      // Accelerate feedback instead of waiting for the next 15s poll.
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        if (!this.stopped) void this.poll();
      }, 2000);

      const message =
        action === 'start' ? 'Start requested. The server is starting.' :
        action === 'stop' ? 'Stop requested. The server is shutting down.' :
        'Restart requested.';

      return { ok: true, message };
    } catch (err) {
      return { ok: false, message: `Exaroton rejected the request: ${(err as Error).message}` };
    } finally {
      this.actionInFlight = false;
    }
  }

  private async emit(event: MonitorEvent): Promise<void> {
    for (const chatId of this.destinations) {
      try {
        const msgId = await this.notifier.notify({ ...event, chatId });
        
        // If it's a starting/stopping message, save the ID for later editing
        if (msgId) {
          if (event.type === 'server_starting') {
            this.startingMsgIds.set(chatId, msgId);
          }
          if (event.type === 'server_stopping') {
            this.stoppingMsgIds.set(chatId, msgId);
          }
        }
      } catch (err) {
        console.error(`[Monitor:${this.serverId}] Notification failed for ${chatId}`, err);
      }
    }
  }
}