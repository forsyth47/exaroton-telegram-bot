import { config } from './config.js';
import { dirname, resolve } from 'node:path';
import { acquireInstanceLock } from './runtime/node/instance-lock.js';
import { SqliteStorage } from "./storage/sqlite.js";
import { ExarotonRestClient } from "./exaroton/rest.js";
import { ExarotonClient } from "./exaroton/client.js";
import { MonitorManager } from "./monitoring/manager.js";
import { TelegramNotifier } from "./notifications/telegram-notifier.js";
import { Bot } from "grammy";
import { applySafetyPlugins } from "./telegram/safety.js";
import { PollingTelegramRuntime } from "./runtime/node/polling-runtime.js";
import { WebhookTelegramRuntime } from "./runtime/node/webhook-runtime.js";
import { TelegramRuntime } from "./runtime/telegram-runtime.js";

// Command registrations
import { registerStart } from "./telegram/commands/start.js";
import { registerHelp } from "./telegram/commands/help.js";
import { registerSetToken } from "./telegram/commands/set_token.js";
import { registerConfigure } from "./telegram/commands/configure.js";
import { registerConfigureCallbacks } from "./telegram/callbacks/configure.js";
import { registerPoolCredits } from "./telegram/commands/pool_credits.js";
import { registerStatus } from "./telegram/commands/status.js";
import { registerControlCallbacks } from "./telegram/callbacks/control.js";

async function main() {
  console.log('🚀 Exaroton Telegram Bot starting...');
  
  // 1. Instance Lock
  const releaseLock = acquireInstanceLock(
    resolve(dirname(config.databaseUrl), 'bot.lock')
  );
  console.log(`🔒 Instance lock acquired (PID ${process.pid})`);
  
  // 2. Storage & Clients
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

  // 3. Create Bot & Apply Safety Plugins (Prevents AWS ban loops)
  const bot = new Bot(config.telegramBotToken);
  bot.catch((err) => console.error(`Bot error:`, err.error));
  applySafetyPlugins(bot); 

  // 4. Create Notifier & Manager
  const notifier = new TelegramNotifier(bot);
  const manager = new MonitorManager(storage, getClient, id => storage.getTenant(id), notifier);

  // 5. Register Commands & Callbacks
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

  // 6. Set Commands (Works perfectly for BOTH Polling and Webhook)
  await bot.api.setMyCommands([
    { command: "start", description: "Welcome and setup guide" },
    { command: "help", description: "Show all commands" },
    { command: "set_token", description: "Set Exaroton API token (Admin)" },
    { command: "configure", description: "Select server & billing (Admin)" },
    { command: "status", description: "Server snapshot + Start/Stop/Restart" },
    { command: "pool_credits", description: "Check billing credits" },
  ]);

  // 7. Choose Transport based on Environment Variable
  const transportMode = (process.env.TRANSPORT || "polling").toLowerCase();
  let runtime: TelegramRuntime;

  if (transportMode === "webhook") {
    const port = parseInt(process.env.WEBHOOK_PORT || "8080", 10);
    runtime = new WebhookTelegramRuntime(bot, port);
    console.log(`🌐 Running in WEBHOOK mode on port ${port}.`);
  } else {
    // If switching to polling, delete any existing webhook to prevent 409 conflicts
    const webhookInfo = await bot.api.getWebhookInfo();
    if (webhookInfo.url) {
      console.log("⚠️ Webhook is currently set. Deleting it to switch to Polling...");
      await bot.api.deleteWebhook({ drop_pending_updates: true });
    }
    runtime = new PollingTelegramRuntime(bot);
    console.log("🔄 Running in LONG POLLING mode.");
  }

  // 8. Start Monitoring
  await manager.reconcileAll();
  console.log("✅ Monitors reconciled on startup.");

  const reconcileTimer = setInterval(() => { void manager.reconcileAll(); }, 60_000);

  // 9. Graceful Shutdown
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received, shutting down gracefully...`);
    clearInterval(reconcileTimer);

    const forceExitTimer = setTimeout(() => {
      console.error('⚠️ Shutdown took too long. Forcing exit to prevent ghost processes.');
      process.exit(1);
    }, 3000);

    try {
      await runtime.stop();
      await manager.stopAll();
      storage.close();
      releaseLock(); // Release the instance lock
      console.log('✅ State persisted. Goodbye.');
    } catch (err) {
      console.error('Error during shutdown:', err);
    } finally {
      clearTimeout(forceExitTimer);
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