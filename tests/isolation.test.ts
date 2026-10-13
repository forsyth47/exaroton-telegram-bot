import { describe, it, expect, vi } from 'vitest';
import { TelegramNotifier } from '../src/notifications/telegram-notifier.js';
import { Bot } from 'grammy';

describe('Telegram Message Isolation', () => {
  it('should only send messages to the specific chatId of the event', async () => {
    const mockBot = {
      api: { sendMessage: vi.fn().mockResolvedValue({}) }
    } as unknown as Bot;

    const notifier = new TelegramNotifier(mockBot);

    await notifier.notify({
      type: 'server_started',
      serverId: 'server-A',
      name: 'Server A',
      chatId: 'group-123' // Strict isolation target
    });

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
      'group-123', 
      expect.stringContaining('Server A'), 
      expect.any(Object)
    );
    
    // Ensure it didn't leak to another group
    expect(mockBot.api.sendMessage).not.toHaveBeenCalledWith(
      'group-456', 
      expect.any(String), 
      expect.any(Object)
    );
  });
});