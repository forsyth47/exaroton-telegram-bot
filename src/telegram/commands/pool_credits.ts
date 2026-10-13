import { Bot } from "grammy";
import { Storage } from "../../storage/interface.js";
import { ExarotonClient } from "../../exaroton/client.js";

export function registerPoolCredits(
  bot: Bot, storage: Storage, getClient: (tenantId: string) => Promise<ExarotonClient>
) {
  bot.command("pool_credits", async (ctx) => {
    const chatId = ctx.chat!.id.toString();
    const config = await storage.getGroupConfig(chatId);

    if (!config || !config.billing) {
      await ctx.reply("This group is not configured yet. Use /configure first.");
      return;
    }

    const client = await getClient(config.tenantId);
    try {
      if (config.billing.type === "pool") {
        const pool = await client.getPool(config.billing.poolId);
        await ctx.reply(`💳 *Billing Credits*\n\nSource: Pool (${pool.name})\nRemaining: ${pool.credits} credits`, { parse_mode: "Markdown" });
      } else {
        const account = await client.getAccount();
        await ctx.reply(`💳 *Billing Credits*\n\nSource: Profile Credits\nRemaining: ${account.credits} credits`, { parse_mode: "Markdown" });
      }
    } catch (e) {
      await ctx.reply("❌ Failed to fetch billing credits.");
    }
  });
}