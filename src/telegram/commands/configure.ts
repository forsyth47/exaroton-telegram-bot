// src/telegram/commands/configure.ts
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

    const client = await getClient(config.tenantId);
    const servers = await client.getServers();

    if (servers.length === 0) {
      await ctx.reply("No servers found for this Exaroton account.");
      return;
    }

    const keyboard = new InlineKeyboard();
    servers.forEach(server => {
      const status = server.status === 1 ? "🟢" : "🔴";
      keyboard.text(`${status} ${server.name}`, `cfg_server:${server.id}`).row();
    });

    const serverText = config.serverId ? `✅ ${config.serverId}` : "❌ Not selected";
    const billingText = config.billing ? (config.billing.type === "pool" ? `✅ Pool` : "✅ Profile") : "❌ Not selected";

    await ctx.reply(
      `*Exaroton Configuration*\n\nServer: ${serverText}\nBilling: ${billingText}\n\nSelect a server:`,
      { reply_markup: keyboard, parse_mode: "Markdown" }
    );
  });
}