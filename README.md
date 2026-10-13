# Exaroton Telegram Bot

A production-quality, multi-tenant Telegram bot for monitoring [exaroton](https://exaroton.com) Minecraft servers. 

## Features
- 🏢 **Multi-Tenant**: Supports multiple Telegram groups, each with its own exaroton account/token.
- 🔒 **Strict Isolation**: Zero cross-contamination of events, credentials, or messages between groups.
- 📡 **Hybrid Monitoring**: 15-second REST polling for offline servers, instant WebSocket tracking for online servers.
- 💰 **Billing Tracking**: Tracks estimated credit usage per session for both Profile Credits and Credit Pools.
- 📊 **Player Tracking**: Real-time notifications for players joining and leaving.
- 🛠️ **Deployment Agnostic**: Runs natively on Node.js/VPS (SQLite) or Cloudflare Workers (D1).

## Prerequisites
- Node.js v20+
- An exaroton API token
- A Telegram Bot Token (from @BotFather)

## Local Development & VPS Deployment

### 1. Setup
```bash
git clone <your-repo-url>
cd exaroton-telegram-bot
npm install
cp .env.example .env