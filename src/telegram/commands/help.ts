import { Bot } from "grammy";

export function registerHelp(bot: Bot) {
  bot.command("help", async (ctx) => {
    // Using a standard multi-line string without complex backslash escaping
    const text = 
`📖 *Exaroton Bot Commands*

/start - Welcome message and setup guide
/help - Show this help menu

*Configuration (Admins only):*
/set\\_token <token> - Set your Exaroton API token
/configure - Select server and billing source

*Monitoring & Control:*
/status - Server snapshot + Start/Stop/Restart buttons
/pool\\_credits - Check current billing credits

💡 *Tip:* Add me as a group Admin so I can securely delete your API token messages!`;

    // Use standard "Markdown" instead of "MarkdownV2"
    await ctx.reply(text, { parse_mode: "Markdown" });
  });
}