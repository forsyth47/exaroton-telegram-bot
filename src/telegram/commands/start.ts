import { Bot } from "grammy";

export function registerStart(bot: Bot) {
  bot.command("start", async (ctx) => {
    const isPrivate = ctx.chat?.type === "private";
    
    let text = "👋 *Welcome to the Exaroton Monitor Bot!*\n\n";
    
    if (isPrivate) {
      text += "To get started, please add me to your Minecraft server's Telegram group and make me an *Administrator* (so I can securely delete your API token).\n\n";
      text += "Once added, run /configure in the group to link your server!";
    } else {
      text += "I am here to monitor your Exaroton Minecraft server and notify this group about player joins, server status, and credit usage.\n\n";
      text += "*To set me up:*\n";
      text += "1. Ensure I am an Admin (with Delete Messages rights)\n";
      text += "2. Run `/set_token <your_token>`\n";
      text += "3. Run `/configure` to pick your server & billing\n";
      text += "4. Use `/status` to view the server and control it!";
    }

    // Use standard "Markdown" instead of "MarkdownV2"
    await ctx.reply(text, { parse_mode: "Markdown" });
  });
}