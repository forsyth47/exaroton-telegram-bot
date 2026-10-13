import { Bot } from 'grammy';
import { Storage } from '../../storage/interface.js';
import { MonitorManager } from '../../monitoring/manager.js';
import { requireGroupAdmin } from '../middleware/auth.js';
import type { ServerAction } from '../../monitoring/state-machine.js';

export function registerControlCallbacks(bot: Bot, storage: Storage, manager: MonitorManager) {
  bot.callbackQuery(/^ctl:(start|stop|restart)$/, requireGroupAdmin, async (ctx) => {
    const action = (ctx.match as RegExpMatchArray)[1] as ServerAction;

    // Acknowledge immediately so Telegram doesn't show a spinning button.
    await ctx.answerCallbackQuery();

    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const config = await storage.getGroupConfig(chatId);
    if (!config?.serverId) {
      await ctx.reply('This group is not configured yet. Use /configure first.');
      return;
    }

    await manager.reconcileAll();
    const monitor = manager.forChat(chatId);

    if (!monitor) {
      await ctx.reply('❌ No active monitor for this group. Check your token with /configure.');
      return;
    }

    // Guard + tenant-scoped client live inside the monitor.
    const result = await monitor.control(action);
    await ctx.reply(result.ok ? `✅ ${result.message}` : `⚠️ ${result.message}`);
  });
}