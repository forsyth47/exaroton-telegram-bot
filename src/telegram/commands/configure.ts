import { Bot, InlineKeyboard } from "grammy";
import { Storage } from "../../storage/interface.js";
import { ExarotonClient } from "../../exaroton/client.js";
import { requireGroupAdmin } from "../middleware/auth.js";

export function registerConfigure(
  bot: Bot, storage: Storage, getClient: (tenantId: string) => Promise<ExarotonClient>
) {
  bot.command("configure", requireGroupAdmin, async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const config = await storage.getGroupConfig(chatId);

    if (!config || !config.tenantId) {
      await ctx.reply("Please set your token first using `/set_token <token>`", { parse_mode: "Markdown" });
      return;
    }

    const serverText = config.serverName ? `✅ ${config.serverName}` : "❌ Not Linked";
    const billingText = config.billing 
      ? (config.billing.type === "pool" ? `✅ Pool` : "✅ Profile") 
      : "❌ Not Linked";
    const notifyText = config.notifyEnabled ? "🟢 ON" : "🛑 OFF";

    const keyboard = new InlineKeyboard()
      .text("🔗 Link Server & Billing", "cfg_main:link").row()
      .text(`🔔 Status Ping Settings (${notifyText})`, "cfg_main:ping");

    await ctx.reply(
      `⚙️ *Exaroton Configuration*\n\n` +
      `*Server:* ${serverText}\n` +
      `*Billing:* ${billingText}\n` +
      `*Notifications:* ${notifyText}\n\n` +
      `Choose an option below:`,
      { reply_markup: keyboard, parse_mode: "Markdown" }
    );
  });
}