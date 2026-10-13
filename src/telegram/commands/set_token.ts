import { Bot } from "grammy";
import { Storage } from "../../storage/interface.js";
import { requireGroupAdmin } from "../middleware/auth.js";
import { ExarotonRestClient } from "../../exaroton/rest.js";
import crypto from "crypto";

export function registerSetToken(bot: Bot, storage: Storage) {
  bot.command("set_token", requireGroupAdmin, async (ctx) => {
    const token = ctx.message?.text?.split(" ")[1];
    if (!token) {
      await ctx.reply("Usage: `/set_token <your_exaroton_token>`", { parse_mode: "Markdown" });
      return;
    }

    const client = new ExarotonRestClient(token);
    try {
      await client.getAccount();
    } catch (e) {
      await ctx.reply("❌ Invalid Exaroton API token. Please check and try again.");
      return;
    }

    const chatId = ctx.chat!.id.toString();
    const tenantId = crypto.randomUUID();
    const now = Date.now();

    await storage.saveTenant({ id: tenantId, exarotonToken: token, createdAt: now, updatedAt: now });
    
    const existing = await storage.getGroupConfig(chatId);
    await storage.saveGroupConfig({
      chatId, tenantId, 
      serverId: existing?.serverId, billing: existing?.billing,
      configuredBy: ctx.from!.id, updatedAt: now
    });

    // --- GRACEFUL DELETION FALLBACK ---
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Failed to delete (usually because bot isn't admin or lacks delete rights)
      await ctx.reply(
        "⚠️ *Security Warning*\n\nI couldn't delete your message containing the API token. " +
        "This happens if I am not a group Administrator with 'Delete Messages' permissions.\n\n" +
        "👉 *Please delete the message with your token manually right now!*",
        { parse_mode: "Markdown" }
      );
      // We continue anyway, the token is saved securely in the DB.
    }
    
    await ctx.reply("✅ Token saved securely! Use /configure to select your server and billing.");
  });
}