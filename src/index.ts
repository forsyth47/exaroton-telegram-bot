import { config } from './config.js';
import path from 'node:path';
import fs from 'node:fs';
import { SqliteStorage } from './storage/sqlite.js';
import { ExarotonRestClient } from './exaroton/rest.js';
import { ExarotonClient } from './exaroton/client.js';
import { createBot } from './telegram/bot.js';
import { registerSetToken } from './telegram/commands/set_token.js';
import { registerStatus } from './telegram/commands/status.js';
import { registerControlCallbacks } from './telegram/callbacks/control.js';
import { MonitorManager } from './monitoring/manager.js';
import { TelegramNotifier } from './notifications/telegram-notifier.js';
import { PollingTelegramRuntime } from './runtime/node/polling-runtime.js';

async function main() {
  console.log('🚀 Exaroton Telegram Bot starting...');

  if (!existsSync(config.databaseUrl)) {
      fs.mkdirSync(path.dirname(config.databaseUrl), { recursive: true })
  }
  const storage = new SqliteStorage(config.databaseUrl);
  await storage.init();
  console.log('✅ Database initialized.');

  const clientCache = new Map<string, ExarotonClient>();
  const getClient = async (tenantId: string): Promise<ExarotonClient> => {
    const cached = clientCache.get(tenantId);
    if (cached) return cached;
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    const client = new ExarotonRestClient(tenant.exarotonToken);
    clientCache.set(tenantId, client);
    return client;
  };

  const bot = createBot(storage, getClient);
  registerSetToken(bot, storage);

  await bot.init();

  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome and quick start' },
    { command: 'configure', description: 'Configure server & billing (admin)' },
    { command: 'status', description: 'Server snapshot + start/stop/restart controls' },
    { command: 'pool_credits', description: 'Check billing credits' },
    { command: 'set_token', description: 'Set Exaroton API token (admin)' },
    { command: 'help', description: 'How to use this bot' },
  ]);

  const notifier = new TelegramNotifier(bot);
  const manager = new MonitorManager(storage, getClient, id => storage.getTenant(id), notifier);

  registerStatus(bot, storage, getClient, manager);
  registerControlCallbacks(bot, storage, manager);

  await manager.reconcileAll();
  console.log('✅ Monitors reconciled on startup.');

  const reconcileTimer = setInterval(() => { void manager.reconcileAll(); }, 60_000);

  const runtime = new PollingTelegramRuntime(bot);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received, shutting down gracefully...`);
    clearInterval(reconcileTimer);
    await runtime.stop();
    await manager.stopAll();
    storage.close();
    console.log('✅ State persisted. Goodbye.');
    process.exit(0);
  };

  process.on('SIGINT', () => { void shutdown('SIGINT'); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

  console.log('🤖 Bot is running. Use /status for a snapshot and server controls.');
  await runtime.start();
}

main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});