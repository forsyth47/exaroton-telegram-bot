import { Bot } from 'grammy';
import { MonitorEvent, Notifier } from '../core/events.js';
import { esc, formatDuration } from '../telegram/messages/format.js';

export class TelegramNotifier implements Notifier {
  constructor(private bot: Bot) {}

  async notify(event: MonitorEvent): Promise<number | null> {
    let text: string;

    switch (event.type) {
      case 'server_starting':
        text = `🟡 *Server starting*\n\nServer: ${esc(event.name)}`;
        break;
      case 'server_started':
        text = `🚀 *Server started*\n\nServer: ${esc(event.name)}`;
        break;
      case 'server_stopping':
        text = `🟠 *Server stopping*\n\nServer: ${esc(event.name)}\nShutting down…`;
        break;
      case 'player_joined':
        text = `🟢 *Player joined*\n\n${esc(event.player)} joined ${esc(event.name)}\nPlayers online: ${event.online}/${event.max}`;
        break;
      case 'player_left':
        text = `🔴 *Player left*\n\n${esc(event.player)} left ${esc(event.name)}\nPlayers online: ${event.online}/${event.max}`;
        break;
      case 'server_stopped':
        text = [
          '🛑 *Server stopped*',
          '',
          `Server: ${esc(event.name)}`,
          `Session duration: ${formatDuration(event.durationMs)}`,
          `Estimated credits used: ${event.creditsUsed.toFixed(2)}`,
          `Remaining credits: ${event.creditsRemaining.toFixed(2)}`,
        ].join('\n');
        break;
      case 'server_crashed':
        text = [
          '💥 *Server crashed*',
          '',
          `Server: ${esc(event.name)}`,
          `Session duration: ${formatDuration(event.durationMs)}`,
          `Estimated credits used: ${event.creditsUsed.toFixed(2)}`,
          `Remaining credits: ${event.creditsRemaining.toFixed(2)}`,
        ].join('\n');
        break;
      default:
        return null;
    }

    try {
      // Return the message_id so the Monitor can track it
      const msg = await this.bot.api.sendMessage(event.chatId, text, { parse_mode: 'Markdown' });
      return msg.message_id;
    } catch (err) {
      console.error(`[Notifier] Failed to deliver to ${event.chatId}`, err);
      return null;
    }
  }

  async editMessage(chatId: string, messageId: number, text: string): Promise<void> {
    try {
      await this.bot.api.editMessageText(chatId, messageId, text, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`[Notifier] Failed to edit message ${messageId} in ${chatId}`, err);
    }
  }
}