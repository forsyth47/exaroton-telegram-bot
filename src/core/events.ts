export interface SessionSummary {
  durationMs: number;
  creditsUsed: number;
  creditsRemaining: number;
}

type Base = { serverId: string; name: string; chatId: string };

export type MonitorEvent =
  | (Base & { type: 'server_starting' })
  | (Base & { type: 'server_started' })
  | (Base & { type: 'server_stopping' })
  | (Base & { type: 'player_joined'; player: string; online: number; max: number })
  | (Base & { type: 'player_left'; player: string; online: number; max: number })
  | (Base & { type: 'server_stopped' } & SessionSummary)
  | (Base & { type: 'server_crashed' } & SessionSummary);

export interface Notifier {
  notify(event: MonitorEvent): Promise<void>;
}