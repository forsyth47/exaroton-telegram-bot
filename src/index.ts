import { config } from './config.js';
import { dirname, resolve } from 'node:path';
import { acquireInstanceLock } from './runtime/node/instance-lock.js';
import { SqliteStorage } from "./storage/sqlite.js";
import { ExarotonRestClient } from "./exaroton/rest.js";
import { ExarotonClient } from "./exaroton/client.js";
import { registerSetToken } from "./telegram/commands/set_token.js";
import { MonitorManager } from "./monitoring/manager.js";
import { TelegramNotifier } from "./notifications/telegram-notifier.js";
import { PollingTelegramRuntime } from "./runtime/node/polling-runtime.js";
import { Bot } from "grammy";
import { registerStart } from "./telegram/commands/start.js";
import { registerHelp } from "./telegram/commands/help.js";
import { registerConfigure } from "./telegram/commands/configure.js";
import { registerConfigureCallbacks } from "./telegram/callbacks/configure.js";
import { registerPoolCredits } from "./telegram/commands/pool_credits.js";
import { registerStatus } from "./telegram/commands/status.js";
import { registerControlCallbacks } from "./telegram/callbacks/control.js";

async function main() {
  console.log('🚀 Exaroton Telegram Bot starting...');
  
  // Guard first: a duplicate instance must never reach the Telegram API.
  const releaseLock = acquireInstanceLock(
    resolve(dirname(config.databaseUrl), 'bot.lock')
  );
  console.log(`🔒 Instance lock acquired (PID ${process.pid})`);
  
  const storage = new SqliteStorage(config.databaseUrl);
  await storage.init();
  console.log("✅ Database initialized.");

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

  // 1. Create Bot
  const bot = new Bot(config.telegramBotToken);
  bot.catch((err) => console.error(`Bot error:`, err.error));

  // 2. Create Notifier (needs Bot)
  const notifier = new TelegramNotifier(bot);

  // 3. Create Manager (needs Storage, Client, Notifier)
  const manager = new MonitorManager(storage, getClient, id => storage.getTenant(id), notifier);

  // 4. Register Commands (needs Bot, Storage, Client, Manager)
  registerStart(bot);
  registerHelp(bot);
  registerSetToken(bot, storage);
  registerConfigure(bot, storage, getClient);
  registerConfigureCallbacks(bot, storage, getClient);
  registerPoolCredits(bot, storage, getClient);
  registerStatus(bot, storage, getClient, manager);
  registerControlCallbacks(bot, storage, manager);

  await bot.init();
  
  console.log(`🤖 Logged in as @${bot.botInfo.username} (id ${bot.botInfo.id})`);
  
  const webhook = await bot.api.getWebhookInfo();
  if (webhook.url) {
    throw new Error(
      `A Telegram webhook is configured (${webhook.url}). ` +
      `Polling would conflict with it. Remove the webhook before using this runtime.`
    );
  }

  await bot.api.setMyCommands([
    { command: "start", description: "Welcome and setup guide" },
    { command: "help", description: "Show all commands" },
    { command: "set_token", description: "Set Exaroton API token (Admin)" },
    { command: "configure", description: "Select server & billing (Admin)" },
    { command: "status", description: "Server snapshot + Start/Stop/Restart" },
    { command: "pool_credits", description: "Check billing credits" },
  ]);

  // 5. Start Monitoring
  await manager.reconcileAll();
  console.log("✅ Monitors reconciled on startup.");

  const reconcileTimer = setInterval(() => { void manager.reconcileAll(); }, 60_000);

  const runtime = new PollingTelegramRuntime(bot);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received, shutting down gracefully...`);
    clearInterval(reconcileTimer);

    // SAFETY NET: If shutdown takes more than 3 seconds, FORCE exit.
    // This guarantees tsx never gets stuck waiting for a zombie socket.
    const forceExitTimer = setTimeout(() => {
      console.error('⚠️ Shutdown took too long. Forcing exit to prevent ghost processes.');
      process.exit(1);
    }, 3000);

    try {
      await runtime.stop();
      await manager.stopAll();
      storage.close();
      console.log('✅ State persisted. Goodbye.');
    } catch (err) {
      console.error('Error during shutdown:', err);
    } finally {
      clearTimeout(forceExitTimer);
      // Explicitly exit the process so tsx knows we are done.
      process.exit(0);
    }
  };

  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });

  console.log("🤖 Bot is running. Use /status for a snapshot and server controls.");
  await runtime.start();
}

main().catch((error) => {
  console.error("❌ Fatal error during startup:", error);
  process.exit(1);
});
