// src/notifications/telegram-notifier.ts
import { Bot } from 'grammy';
import { MonitorEvent, Notifier } from '../core/events.js';

export class TelegramNotifier implements Notifier {
  constructor(private bot: Bot) {}

  async notify(event: MonitorEvent): Promise<void> {
    let text = '';
    
    switch (event.type) {
      case 'server_started':
        text = `🚀 *Server Started*\n\nServer: \`${event.name}\``;
        break;
      case 'player_joined':
        text = `🟢 *Player Joined*\n\n\`${event.player}\` joined \`${event.name}\`\nPlayers: ${event.online}/${event.max}`;
        break;
      case 'player_left':
        text = `🔴 *Player Left*\n\n\`${event.player}\` left \`${event.name}\`\nPlayers: ${event.online}/${event.max}`;
        break;
      case 'server_stopped': {
        const mins = Math.floor(event.durationMs / 60000);
        const hours = Math.floor(mins / 60);
        const durationStr = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
        text = `🛑 *Server Stopped*\n\nServer: \`${event.name}\`\nSession duration: ${durationStr}\nEstimated credits used: ${event.creditsUsed.toFixed(2)}\nRemaining credits: ${event.creditsRemaining.toFixed(2)}`;
        break;
      }
      case 'server_crashed':
        text = `💥 *Server Crashed*\n\nServer: \`${event.name}\``;
        break;
      default:
        return;
    }

    // Strict Isolation: Send ONLY to the chatId associated with this event
    try {
      await this.bot.api.sendMessage(event.chatId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`[Notifier] Failed to send message to ${event.chatId}`, err);
    }
  }
}