import { Bot, InlineKeyboard } from "grammy";
import { Storage } from "../../storage/interface.js";
import { ExarotonClient } from "../../exaroton/client.js";
import { requireGroupAdmin } from "../middleware/auth.js";
import { BillingSource } from "../../core/types.js";

export function registerConfigureCallbacks(
  bot: Bot, storage: Storage, getClient: (tenantId: string) => Promise<ExarotonClient>
) {
  bot.callbackQuery(/^cfg_server:(.+)$/, requireGroupAdmin, async (ctx) => {
    const serverId = ctx.match[1];
    const chatId = ctx.chat!.id.toString();
    const config = await storage.getGroupConfig(chatId);
    if (!config) return;

    const client = await getClient(config.tenantId);
    
    // Fetch server details to get the name and save it
    const server = await client.getServer(serverId);
    config.serverId = serverId;
    config.serverName = server.name; // <-- Save the name
    config.configuredBy = ctx.from!.id;
    config.updatedAt = Date.now();
    await storage.saveGroupConfig(config);

    const pools = await client.getPools();
    const account = await client.getAccount(); // <-- Fetch account for profile credits

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
}

async function saveBilling(ctx: any, storage: Storage, billing: BillingSource) {
  const chatId = ctx.chat!.id.toString();
  const config = await storage.getGroupConfig(chatId);
  if (!config) return;

  config.billing = billing;
  config.updatedAt = Date.now();
  await storage.saveGroupConfig(config);

  // Use serverName if available, fallback to serverId just in case
  const displayName = config.serverName || config.serverId || "Unknown Server";
  const billingText = billing.type === "pool" ? `Pool (${billing.poolId})` : "Profile Credits";
  
  await ctx.editMessageText(
    `✅ *Configuration Complete!*\n\nServer: ${displayName}\nBilling: ${billingText}`, 
    { parse_mode: "Markdown" }
  );
  await ctx.answerCallbackQuery();
}