import { Bot, webhookCallback } from "grammy";
// Note: In a real CF deployment, you would import your core setup here.
// For this adapter, we assume the bot is initialized via environment bindings.

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  DATABASE_URL: string; // D1 binding or similar
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Initialize bot (simplified for CF context)
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    
    // Register commands/handlers here (or import from a shared setup function)
    
    const handleUpdate = webhookCallback(bot, "cloudflare-mod");

    if (new URL(request.url).pathname === "/telegram") {
      try {
        return await handleUpdate(request);
      } catch (err) {
        console.error(err);
        return new Response("Error processing update", { status: 500 });
      }
    }

    return new Response("Exaroton Bot CF Worker is running.", { status: 200 });
  },
};