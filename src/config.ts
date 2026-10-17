export interface Config {
  telegramBotToken: string;
  adminUserIds: number[];
  databaseUrl: string;
}

function loadConfig(): Config {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required in environment variables');
  }
  const adminUserIdsRaw = process.env.ADMIN_USER_IDS || '';
  const adminUserIds = adminUserIdsRaw
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));

  const databaseUrl = process.env.DATABASE_URL || './data/bot.db';

  return {
    telegramBotToken,
    adminUserIds,
    databaseUrl,
  };
}

export const config = loadConfig();