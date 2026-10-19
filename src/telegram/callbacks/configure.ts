import { Bot, InlineKeyboard } from "grammy";
import { Storage } from "../../storage/interface.js";
import { ExarotonClient } from "../../exaroton/client.js";
import { requireGroupAdmin } from "../middleware/auth.js";
import { BillingSource, GroupConfig, ExarotonServer } from "../../core/types.js";

export function registerConfigureCallbacks(
  bot: Bot, storage: Storage, getClient: (tenantId: string) => Promise<ExarotonClient>
) {
  // --- Main Menu Routing ---
  bot.callbackQuery("cfg_main:link", requireGroupAdmin, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showServerSelection(ctx, storage, getClient);
  });

  bot.callbackQuery("cfg_main:ping", requireGroupAdmin, async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const config = await storage.getGroupConfig(chatId);
    
    if (!config?.serverId) {
      // FIX 1: Use object syntax for show_alert
      await ctx.answerCallbackQuery({ text: "⚠️ Please link a server first!", show_alert: true });
      return;
    }
    
    await ctx.answerCallbackQuery();
    await showPingSettings(ctx, config);
  });

  // --- Server & Billing Flow (Existing logic, triggered by cfg_main:link) ---
  bot.callbackQuery(/^cfg_server:(.+)$/, requireGroupAdmin, async (ctx) => {
    const serverId = ctx.match[1];
    const chatId = ctx.chat!.id.toString();
    const config = await storage.getGroupConfig(chatId);
    if (!config) return;

    const client = await getClient(config.tenantId);
    const server = await client.getServer(serverId);
    
    config.serverId = serverId;
    config.serverName = server.name;
    config.configuredBy = ctx.from!.id;
    config.updatedAt = Date.now();
    await storage.saveGroupConfig(config);

    const pools = await client.getPools();
    const account = await client.getAccount();

    const keyboard = new InlineKeyboard();
    pools.forEach(pool => keyboard.text(`💰 ${pool.name} (${pool.credits} cr)`, `cfg_pool:${pool.id}`).row());
    keyboard.text(`💳 Profile Credits (${account.credits} cr)`, `cfg_billing:profile`);

    await ctx.editMessageText(`✅ Server selected!\n\nNow select a billing source:`, { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^cfg_pool:(.+)$/, requireGroupAdmin, async (ctx) => {
    await saveBilling(ctx, storage, { type: "pool", poolId: ctx.match[1] });
  });

  bot.callbackQuery(/^cfg_billing:(.+)$/, requireGroupAdmin, async (ctx) => {
    if (ctx.match[1] === "profile") await saveBilling(ctx, storage, { type: "profile" });
  });

  // --- Ping Settings Toggles ---
  bot.callbackQuery("cfg_ping:toggle_master", requireGroupAdmin, async (ctx) => {
    await toggleSetting(ctx, storage, "notifyEnabled");
  });
  bot.callbackQuery("cfg_ping:toggle_start", requireGroupAdmin, async (ctx) => {
    await toggleSetting(ctx, storage, "notifyStart");
  });
  bot.callbackQuery("cfg_ping:toggle_stop", requireGroupAdmin, async (ctx) => {
    await toggleSetting(ctx, storage, "notifyStop");
  });
  bot.callbackQuery("cfg_ping:toggle_join", requireGroupAdmin, async (ctx) => {
    await toggleSetting(ctx, storage, "notifyJoin");
  });
  bot.callbackQuery("cfg_ping:toggle_leave", requireGroupAdmin, async (ctx) => {
    await toggleSetting(ctx, storage, "notifyLeave");
  });

  bot.callbackQuery("cfg_ping:back", requireGroupAdmin, async (ctx) => {
    await ctx.answerCallbackQuery();
    const chatId = ctx.chat!.id.toString();
    const config = await storage.getGroupConfig(chatId);
    if (config) await showMainMenu(ctx, config);
  });
}

// --- Helper Functions ---

async function showServerSelection(ctx: any, storage: Storage, getClient: Function) {
  const chatId = ctx.chat!.id.toString();
  const config = await storage.getGroupConfig(chatId);
  if (!config?.tenantId) return;

  const client = await getClient(config.tenantId);
  const servers = await client.getServers();

  const keyboard = new InlineKeyboard();
  // FIX 2: Explicitly type 'server' as ExarotonServer
  servers.forEach((server: ExarotonServer) => keyboard.text(server.name, `cfg_server:${server.id}`).row());
  keyboard.text("⬅️ Back to Main", "cfg_ping:back"); 

  await ctx.editMessageText(`📋 *Select a Server:*\n\nCurrent: ${config.serverName || "None"}`, { 
    reply_markup: keyboard, parse_mode: "Markdown" 
  });
}

async function showPingSettings(ctx: any, config: GroupConfig) {
  const masterIcon = config.notifyEnabled ? "🟢 ON" : "🛑 OFF";
  const startIcon = config.notifyStart ? "🟢 ON" : "⚪ OFF";
  const stopIcon = config.notifyStop ? "🟢 ON" : "⚪ OFF";
  const joinIcon = config.notifyJoin ? "🟢 ON" : "⚪ OFF";
  const leaveIcon = config.notifyLeave ? "🟢 ON" : "⚪ OFF";

  const keyboard = new InlineKeyboard()
    .text(`Master: ${masterIcon}`, "cfg_ping:toggle_master").row()
    .text(`Starting: ${startIcon}`, "cfg_ping:toggle_start")
    .text(`Stopping: ${stopIcon}`, "cfg_ping:toggle_stop").row()
    .text(`Joining: ${joinIcon}`, "cfg_ping:toggle_join")
    .text(`Leaving: ${leaveIcon}`, "cfg_ping:toggle_leave").row()
    .text("⬅️ Back to Main", "cfg_ping:back");

  await ctx.editMessageText(
    `🔔 *Notification Settings*\n\n` +
    `Server: ${config.serverName}\n` +
    `Master notifications are currently **${masterIcon}**.\n\n` +
    `Toggle specific events below:`,
    { reply_markup: keyboard, parse_mode: "Markdown" }
  );
}

async function showMainMenu(ctx: any, config: GroupConfig) {
  const serverText = config.serverName ? `✅ ${config.serverName}` : "❌ Not Linked";
  const billingText = config.billing ? (config.billing.type === "pool" ? `✅ Pool` : "✅ Profile") : "❌ Not Linked";
  const notifyText = config.notifyEnabled ? "🟢 ON" : "🛑 OFF";

  const keyboard = new InlineKeyboard()
    .text("🔗 Link Server & Billing", "cfg_main:link").row()
    .text(`🔔 Status Ping Settings (${notifyText})`, "cfg_main:ping");

  await ctx.editMessageText(
    `⚙️ *Exaroton Configuration*\n\n` +
    `*Server:* ${serverText}\n` +
    `*Billing:* ${billingText}\n` +
    `*Notifications:* ${notifyText}\n\n` +
    `Choose an option below:`,
    { reply_markup: keyboard, parse_mode: "Markdown" }
  );
}

// FIX 3: Define a specific union type for the boolean keys to satisfy TypeScript
type NotifyToggleKey = 'notifyEnabled' | 'notifyStart' | 'notifyStop' | 'notifyJoin' | 'notifyLeave';

async function toggleSetting(ctx: any, storage: Storage, key: NotifyToggleKey) {
  const chatId = ctx.chat!.id.toString();
  const config = await storage.getGroupConfig(chatId);
  if (!config) return;

  // Flip the boolean safely
  config[key] = !config[key];
  config.updatedAt = Date.now();
  await storage.saveGroupConfig(config);

  await ctx.answerCallbackQuery(`Toggled ${key.replace('notify', '')} to ${config[key] ? "ON" : "OFF"}`);
  await showPingSettings(ctx, config);
}

async function saveBilling(ctx: any, storage: Storage, billing: BillingSource) {
  const chatId = ctx.chat!.id.toString();
  const config = await storage.getGroupConfig(chatId);
  if (!config) return;

  config.billing = billing;
  config.updatedAt = Date.now();
  await storage.saveGroupConfig(config);

  const displayName = config.serverName || config.serverId || "Unknown Server";
  const billingText = billing.type === "pool" ? `Pool (${billing.poolId})` : "Profile Credits";
  
  // Add the Back to Main button
  const keyboard = new InlineKeyboard().text("⬅️ Back to Main", "cfg_ping:back");

  await ctx.editMessageText(
    `✅ *Configuration Complete!*\n\nServer: ${displayName}\nBilling: ${billingText}`, 
    { parse_mode: "Markdown", reply_markup: keyboard } // <-- Added reply_markup here
  );
  await ctx.answerCallbackQuery();
}