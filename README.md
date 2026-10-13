# Exaroton Telegram Bot

Multi-tenant Telegram bot for monitoring [exaroton](https://exaroton.com) Minecraft servers.

Each Telegram group has its own exaroton credential, server, billing source,
monitoring state and notification destination. No cross-group contamination.

## Features

- 🔐 **Multi-tenant** — one bot, many groups, many exaroton accounts.
- 📡 **Hybrid monitoring** — 15s REST polling while offline, WebSocket while active.
- 📊 **`/status`** — live snapshot plus **Start / Stop / Restart** buttons.
- 🟢 **Player tracking** — join/leave events derived from status snapshots.
- 💰 **Session billing** — credit snapshots with *estimated* usage.
- 🔁 **Resilient** — reconnect backoff, heartbeat, startup reconciliation.
- 🐳 **Deployment agnostic** — Node.js, Docker/VPS, optional Cloudflare adapter.

## Requirements

- Node.js 20+
- A Telegram bot token (@BotFather)
- An exaroton API token (https://exaroton.com/account/)

## Quick start

```bash
git clone <repo>
cd exaroton-telegram-bot
npm install
cp .env.example .env
# edit .env
npm run dev