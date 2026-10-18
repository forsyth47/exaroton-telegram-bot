import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { apiThrottler } from "@grammyjs/transformer-throttler";

export function applySafetyPlugins(bot: Bot) {
  // 1. Auto-Retry: Automatically handles 429 (Rate Limit) and 5xx errors.
  // If Telegram says "wait", it waits. If the network drops, it retries with backoff.
  bot.api.config.use(autoRetry({
    maxDelaySeconds: 30, // Fail immediately if we have to wait >30 seconds
  }));

  // 2. Outgoing Throttler: Prevents the bot from sending messages too fast.
  // The default configuration is already perfectly aligned with Telegram's 
  // official rate limits (30 msg/sec global, 20 msg/min per group).
  const throttler = apiThrottler();
  bot.api.config.use(throttler);
  
  console.log("🛡️ Safety plugins (auto-retry & apiThrottler) applied.");
}