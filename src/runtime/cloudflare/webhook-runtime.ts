import { Bot } from "grammy";
import { TelegramRuntime } from "../telegram-runtime.js";

export class WebhookTelegramRuntime implements TelegramRuntime {
  constructor(private bot: Bot) {}

  async start(): Promise<void> {
    console.log("🌐 Cloudflare Webhook runtime initialized. (Handled by Worker fetch event)");
    // In CF, we don't "start" a listener, the Worker handles incoming fetch requests.
  }

  async stop(): Promise<void> {
    console.log("🛑 Cloudflare Webhook runtime stopped.");
  }
}