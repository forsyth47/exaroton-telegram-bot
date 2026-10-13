// src/core/events.ts
export type MonitorEvent =
  | { type: 'server_starting'; serverId: string; name: string; chatId: string }
  | { type: 'server_started'; serverId: string; name: string; chatId: string }
  | { type: 'player_joined'; serverId: string; name: string; chatId: string; player: string; online: number; max: number }
  | { type: 'player_left'; serverId: string; name: string; chatId: string; player: string; online: number; max: number }
  | { type: 'server_stopping'; serverId: string; name: string; chatId: string }
  | { type: 'server_stopped'; serverId: string; name: string; chatId: string; durationMs: number; creditsUsed: number; creditsRemaining: number }
  | { type: 'server_crashed'; serverId: string; name: string; chatId: string };

export interface Notifier {
  notify(event: MonitorEvent): Promise<void>;
}