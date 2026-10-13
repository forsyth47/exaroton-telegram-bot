// src/index.ts
import { config } from "./config.js";
import fs, { existsSync } from 'node:fs';
import path from "node:path";
import { SqliteStorage } from "./storage/sqlite.js";
import { ExarotonRestClient } from "./exaroton/rest.js";
import { ExarotonClient } from "./exaroton/client.js";
import { Tenant } from "./core/types.js";
import { createBot } from "./telegram/bot.js";
import { registerSetToken } from "./telegram/commands/set_token.js";
import { MonitorManager } from "./monitoring/manager.js";
import { TelegramNotifier } from "./notifications/telegram-notifier.js";

async function main() {
  console.log("🚀 Exaroton Telegram Bot starting...");

  if (!existsSync(config.databaseUrl)) {
    fs.mkdirSync(path.dirname(config.databaseUrl), { recursive: true })
  }
  const storage = new SqliteStorage(config.databaseUrl);
  await storage.init();
  console.log("✅ Database initialized.");

  const clientCache = new Map<string, ExarotonClient>();
  const getClient = async (tenantId: string): Promise<ExarotonClient> => {
    if (clientCache.has(tenantId)) return clientCache.get(tenantId)!;
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
    { command: "set_token", description: "Set Exaroton API token (Admin)" },
    { command: "configure", description: "Configure server & billing (Admin)" },
    { command: "pool_credits", description: "Check billing credits" },
  ]);
  
  // --- Monitoring Engine Initialization ---
  const notifier = new TelegramNotifier(bot);
  const getTenant = async (id: string) => storage.getTenant(id);
  const manager = new MonitorManager(storage, getClient, getTenant, notifier);

  // Startup Reconciliation (Step 21)
  await manager.reconcileAll();
  console.log("✅ Monitors reconciled on startup.");

  // Periodic Reconciliation (Check for new configurations every 60s)
  setInterval(() => manager.reconcileAll(), 60000);

  console.log("🤖 Bot is running... Press Ctrl+C to stop.");
  await bot.start();
}

main().catch((error) => {
  console.error("❌ Fatal error during startup:", error);
  process.exit(1);
});