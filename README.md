# Exaroton Server Management Telegram Bot

A production-ready, multi-tenant Telegram bot for monitoring and managing Exaroton Minecraft servers. It provides real-time status updates, player join/leave notifications, estimated credit usage tracking, and basic server controls directly within your Telegram groups.

> **Try it out:** A publicly hosted instance is available for immediate testing. Add **[@exarotonmanager1bot](https://t.me/exarotonmanager1bot)** to your Telegram group to see it in action.

---

## Overview

This bot is designed to bridge the gap between Exaroton's API and Telegram, allowing server administrators to monitor their infrastructure without leaving their chat applications. It is built with a strict multi-tenant architecture, meaning a single bot instance can securely manage multiple Telegram groups, each linked to different Exaroton accounts, servers, and billing pools, with zero cross-contamination of data or events.

---

## Features

- **Multi-Tenant Isolation**: Supports multiple groups, each with its own Exaroton API token, server, and billing configuration.
- **Hybrid Monitoring**: Utilizes a 15-second REST polling fallback for offline servers and switches to real-time WebSocket streams when the server is active, optimizing API usage.
- **Player Tracking**: Accurately detects and notifies groups when players join or leave the server.
- **Credit Usage Estimation**: Takes credit snapshots at the start and end of a server session to calculate and report estimated credit consumption.
- **Server Control**: Start, stop, and restart servers directly from Telegram using guarded inline keyboard buttons.
- **Deployment Agnostic**: The core application is decoupled from the runtime. It runs natively on Node.js or Bun, supports SQLite for local/VPS persistence, and is structured to support Cloudflare Workers/D1 as an optional deployment target.

---

## Requirements

- **Runtime**: [Bun](https://bun.sh/) (Recommended) or Node.js (v20+)
- **Telegram**: A valid Telegram Bot Token (obtained via [@BotFather](https://t.me/BotFather))
- **Exaroton**: A valid Exaroton API Token (generated in your [Exaroton Account Settings](https://exaroton.com/account/))

---

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/forsyth47/exaroton-telegram-bot.git
cd exaroton-telegram-bot
```

### 2. Install Dependencies
If using Bun (recommended for performance and native SQLite support):
```bash
bun install
```
If using Node.js:
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment file and populate it with your bot-level credentials:
```bash
cp .env.example .env
```
Edit `.env`:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ADMIN_USER_IDS=your_telegram_user_id # Comma-separated, e.g., 12345678,87654321
DATABASE_URL=./data/bot.db
```
*Note: Per-tenant Exaroton API tokens are never stored in this file. They are securely saved to the database via the `/set_token` command.*

### 4. Build and Run
**Using Bun:**
```bash
bun run build
bun run start
```
**Using Node.js:**
```bash
npm run build
npm run start
```

---

## Usage

1. Add the bot to your Telegram group.
2. Promote the bot to an **Administrator** and ensure it has the "Delete Messages" permission (this allows it to securely delete messages containing API tokens).
3. As a group administrator, initialize the configuration:
   ```text
   /set_token <your_exaroton_api_token>
   ```
   *(The bot will attempt to delete this message automatically for security).*
4. Select your server and billing source:
   ```text
   /configure
   ```
5. Check server status and access controls:
   ```text
   /status
   ```
6. View current billing credits:
   ```text
   /pool_credits
   ```

### Available Commands
| Command | Description | Access |
| :--- | :--- | :--- |
| `/start` | Welcome message and setup guide | Everyone |
| `/help` | Display available commands | Everyone |
| `/set_token` | Bind the group to an Exaroton account | Group Admin |
| `/configure` | Select server and billing source | Group Admin |
| `/status` | View server snapshot and access Start/Stop/Restart controls | Everyone |
| `/pool_credits` | Check remaining credits for the configured billing source | Everyone |

---

## Architecture & Technologies

- **Language**: TypeScript
- **Runtime**: Bun (primary) / Node.js (compatible)
- **Telegram Framework**: [grammY](https://grammy.dev/)
- **Database**: SQLite (via `bun:sqlite` or `better-sqlite3`), abstracted behind a repository interface for future D1/PostgreSQL support.
- **API Communication**: Native `fetch` for REST, native WebSocket for real-time Exaroton streams.
- **Testing**: Vitest

The application follows a strict separation of concerns:
- `src/core/`: Domain models, types, and business logic.
- `src/telegram/`: Bot commands, callbacks, and UI generation.
- `src/exaroton/`: REST and WebSocket client implementations.
- `src/monitoring/`: State machine, player diffing, and hybrid polling/WS logic.
- `src/storage/`: Database abstraction and schema management.

---

## Production Deployment

### Docker
A `Dockerfile` and `docker-compose.yml` are provided for containerized deployment.
```bash
docker compose up -d
```
*Ensure the `data/` directory is mapped to a persistent volume.*

### Systemd (Linux VPS)
For native execution on a Linux server, create a systemd service file (`/etc/systemd/system/exaroton-bot.service`):
```ini
[Unit]
Description=Exaroton Telegram Bot
After=network-online.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/exaroton-telegram-bot
EnvironmentFile=/path/to/exaroton-telegram-bot/.env
ExecStart=/path/to/bun run /path/to/exaroton-telegram-bot/dist/index.js
Restart=on-failure
RestartSec=10
KillMode=control-group

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now exaroton-bot
```

---

## Contributing

Contributions, bug reports, and feature requests are highly welcome. 

**Feature Requests:** If you have an idea for a new feature (e.g., additional server controls, analytics, or new notification types), please **open a new issue** first to discuss the proposed changes. This ensures the feature aligns with the project's multi-tenant architecture and security goals before any code is written.

**Code Contributions:**
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure your code passes linting and tests (`bun run lint`, `bun run test`).
4. Commit your changes (`git commit -m 'Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request referencing the related issue.

---

## Security Considerations

- **Token Handling**: Exaroton API tokens are requested via Telegram and immediately deleted from the chat history. They are stored in the local SQLite database. For public deployments, implement encryption at rest for the `exaroton_token` column.
- **Authorization**: All sensitive callbacks (e.g., `/configure`, server controls) verify the user's Telegram group admin status server-side, preventing exploitation via stale inline keyboards.
- **Isolation**: The architecture guarantees that events, credentials, and notifications are strictly scoped to their respective tenant and chat ID.

---

## AI Disclosure

This project was developed with the assistance of AI tools. AI contributed to code generation, architecture planning, and documentation drafting. However, all business logic, security considerations, state management, and architectural decisions have been thoroughly reviewed, tested, and validated by human developers to ensure production readiness, reliability, and strict adherence to security best practices to the best of my knowledge, but there might be few bugs, and that is to be expected considering this was a hobby project. Feel free to report any issues, concerns or feature requests in the issue tab.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.