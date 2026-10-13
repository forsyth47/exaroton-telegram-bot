// src/telegram/bot.ts
import { Bot } from "grammy";
import { config } from "../config.js";
import { Storage } from "../storage/interface.js";
import { ExarotonClient } from "../exaroton/client.js";
import { registerConfigure } from "./commands/configure.js";
import { registerConfigureCallbacks } from "./callbacks/configure.js";
import { registerPoolCredits } from "./commands/pool_credits.js";

export function createBot(storage: Storage, getClient: (tenantId: string) => Promise<ExarotonClient>) {
  const bot = new Bot(config.telegramBotToken);

  bot.catch((err) => console.error(`Bot error:`, err.error));

  registerConfigure(bot, storage, getClient);
  registerConfigureCallbacks(bot, storage, getClient);
  registerPoolCredits(bot, storage, getClient);

  return bot;
}