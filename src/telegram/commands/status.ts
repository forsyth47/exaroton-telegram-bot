import { Bot } from 'grammy';
import { Storage } from '../../storage/interface.js';
import { ExarotonClient } from '../../exaroton/client.js';
import { MonitorManager } from '../../monitoring/manager.js';
import { ExarotonServer, ServerSnapshot } from '../../core/types.js';
import { isSessionActive, statusInfo } from '../../monitoring/state-machine.js';
import { statusKeyboard } from '../keyboards/status.js';
import { esc, formatBytes, formatDuration } from '../messages/format.js';

export function registerStatus(
  bot: Bot,
  storage: Storage,
  getClient: (tenantId: string) => Promise<ExarotonClient>,
  manager: MonitorManager,
) {
  bot.command('status', async (ctx) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const config = await storage.getGroupConfig(chatId);
    if (!config?.serverId || !config.tenantId) {
      await ctx.reply('This group is not configured yet. Use /configure first.');
      return;
    }

    // Picks up fresh configuration immediately, without waiting for the timer.
    await manager.reconcileAll();

    const client = await getClient(config.tenantId);
    const monitor = manager.forChat(chatId);
    const snapshot: ServerSnapshot | undefined = monitor?.getSnapshot();

    let server = snapshot?.server;
    if (!server) {
      try { server = await client.getServer(config.serverId); }
      catch (err) {
        await ctx.reply(`❌ Could not read server state: ${(err as Error).message}`);
        return;
      }
    }

    let credits: number | null = null;
    let billingLabel = 'Profile Credits';
    try {
      if (config.billing?.type === 'pool') {
        const pool = await client.getPool(config.billing.poolId);
        credits = pool.credits;
        billingLabel = `Pool: ${pool.name}`;
      } else {
        credits = (await client.getAccount()).credits;
      }
    } catch { /* snapshot must still render if billing is unreachable */ }

    await ctx.reply(buildStatusText(server, snapshot, credits, billingLabel), {
      parse_mode: 'Markdown',
      reply_markup: statusKeyboard(),
    });
  });
}

export function buildStatusText(
  server: ExarotonServer,
  snapshot: ServerSnapshot | undefined,
  credits: number | null,
  billingLabel: string,
): string {
  const { emoji, label } = statusInfo(server.status);
  const running = isSessionActive(server.status);
  const stats = snapshot?.stats;

  const lines: string[] = [
    '📊 *Server Status*',
    '',
    `*Server:* ${esc(server.name)}`,
    `*Address:* \`${esc(server.address)}\``,
    `*Status:* ${emoji} ${label} (code \`${server.status}\`)`,
  ];

  if (server.software) {
    lines.push(`*Software:* ${esc(server.software.name)} ${esc(server.software.version)}`);
  }

  lines.push(`*Players:* ${server.players?.count ?? 0}/${server.players?.max ?? 0}`);
  lines.push('');

  if (running && stats?.memory) {
    const { usage, percent } = stats.memory;
    const total = percent > 0 ? formatBytes(usage / (percent / 100)) : null;
    lines.push(`*Memory:* ${formatBytes(usage)}${total ? ` / ${total}` : ''} (${percent.toFixed(1)}%)`);
  } else {
    lines.push(`*Memory:* ${running ? 'waiting for stats…' : '— (server offline)'}`);
  }

  if (running && snapshot?.sessionStartedAt) {
    lines.push(`*Uptime:* ${formatDuration(Date.now() - snapshot.sessionStartedAt)}`);
  }

  lines.push('');
  lines.push(`*Billing:* ${esc(billingLabel)}`);
  lines.push(`*Credits:* ${credits === null ? 'unavailable' : credits.toFixed(2)}`);

  if (snapshot?.updatedAt) {
    const time = new Date(snapshot.updatedAt).toLocaleTimeString();
    lines.push('', `_Updated ${time} · via ${snapshot.transport}_`);
  }

  return lines.join('\n');
}