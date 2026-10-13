import { Bot } from "grammy";
import { TelegramRuntime } from "../telegram-runtime.js";

export class PollingTelegramRuntime implements TelegramRuntime {
  constructor(private bot: Bot) {}

  async start(): Promise<void> {
    console.log("🔄 Starting Telegram bot in Long Polling mode...");
    await this.bot.start();
  }

  async stop(): Promise<void> {
    console.log("🛑 Stopping Telegram bot...");
    this.bot.stop();
  }
}