# Exaroton Telegram Bot — Complete Implementation Charter

This is the architecture/roadmap. The core design is **deployment-independent**: Cloudflare is optional, while a normal Node.js/VPS installation is fully supported.

The exaroton API supports Bearer-token authentication, server listing, billing pools, account credits, and a per-server WebSocket status stream. The WebSocket status payload contains the current server status and player list, which is enough to derive join/leave events. exaroton API exaroton API

---

## 1. Project Goal

Build a production-quality, multi-tenant Telegram bot for monitoring exaroton servers.

The bot should:

- Be added to Telegram groups.
- Allow authorized users to configure a group.
- Allow each group to select its own exaroton server.
- Allow each group to select its own billing source.
- Monitor the selected server.
- Notify the Telegram group about:
  - server starting/started
  - players joining
  - players leaving
  - server stopping/stopped
  - credits consumed after a server session
- Provide current billing credits through `/pool_credits`.
- Support multiple groups simultaneously.
- Support different exaroton API tokens/accounts.
- Never mix events, credentials, configuration, or messages between tenants/groups.
- Be self-hostable without Cloudflare.
- Support Cloudflare as an optional deployment target.
- Support local development without requiring any cloud service.

---

# 2. Core Architectural Decision

The **business logic must not depend on Cloudflare**.

Cloudflare is a deployment adapter, not part of the application architecture.

The application should conceptually be:

```text
                    ┌──────────────────────┐
                    │    Core Application  │
                    │                      │
                    │ Telegram Logic       │
                    │ Exaroton Logic       │
                    │ Monitoring           │
                    │ State Machine         │
                    │ Notifications        │
                    │ Configuration        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐           ┌────────▼─────────┐
        │ Local / VPS    │           │ Cloudflare       │
        │ Adapter        │           │ Adapter          │
        │                │           │                  │
        │ Node.js        │           │ Workers          │
        │ SQLite         │           │ D1               │
        │ Native WS      │           │ DO / WS          │
        └────────────────┘           └──────────────────┘
```

The same core code should work in both environments.

---

# 3. Primary Technology Stack

Use:

- **TypeScript**
- **Node.js**
- **grammY** for Telegram
- Native `fetch()` for exaroton REST
- Native WebSocket implementation / `ws` where appropriate
- **SQLite** for local/VPS persistence
- Repository interfaces for storage abstraction
- **Cloudflare D1** as optional cloud storage
- **Cloudflare Workers** as optional Telegram webhook runtime
- **Durable Objects** only where genuinely useful for Cloudflare deployment
- `.env` / environment variables for secrets
- Vitest for testing
- ESLint + Prettier
- npm/pnpm

Do not make the official exaroton Node package a hard architectural dependency. The uploaded API documentation itself specifies the REST and WebSocket protocols, so implement an internal exaroton adapter against those APIs. exaroton API

---

# 4. Multi-Tenant Architecture

This is critical.

The bot is **not** a single-server bot.

One bot instance may manage:

```text
Group A
 └── exaroton account/token A
      └── Server A

Group B
 └── exaroton account/token B
      └── Server B

Group C
 └── exaroton account/token A
      └── Server C
```

Every configuration must therefore be scoped to a **tenant/group**.

At minimum:

```text
tenant/group
    ↓
Telegram chat ID
    ↓
exaroton credential
    ↓
server configuration
    ↓
billing configuration
    ↓
monitoring state
    ↓
notification destination
```

Never use global mutable variables such as:

```ts
currentServer
currentPool
currentChat
currentToken
```

Those would cause cross-group contamination.

Every operation must carry its tenant/group context.

---

# 5. Credential Model

Do **not** put users' exaroton API tokens into the project's `.env` in the multi-user version.

`.env` should contain only **bot-level configuration**, for example:

```env
TELEGRAM_BOT_TOKEN=
ADMIN_USER_IDS=
DATABASE_URL=
```

For the multi-tenant architecture, each tenant's exaroton token should be stored in the application's encrypted/secure credential storage.

Conceptually:

```text
Tenant
 ├── telegram chat ID
 ├── exaroton API token
 ├── selected server
 └── selected billing source
```

For a simple first implementation, the token can be stored encrypted in SQLite.

For a more advanced deployment, support an external secret provider through the credential abstraction.

---

# 6. Environment / Deployment Abstraction

Define interfaces such as:

```ts
interface Storage {
    getGroupConfig(chatId: string): Promise<GroupConfig | null>;
    saveGroupConfig(config: GroupConfig): Promise<void>;
    deleteGroupConfig(chatId: string): Promise<void>;
    ...
}
```

Then implement:

```text
SQLiteStorage
D1Storage
```

Likewise, don't make the application directly depend on Workers APIs.

---

# 7. Storage Model

Use a relational model rather than a single JSON file for the production architecture.

Local development can still use SQLite.

Recommended tables:

```text
tenants
groups
server_sessions
monitoring_state
pending_configurations
```

Possible schema:

```sql
tenants
-------
id
telegram_chat_id
exaroton_token_encrypted
created_at
updated_at

groups
------
chat_id PRIMARY KEY
tenant_id
server_id
billing_type
pool_id
configured_by
created_at
updated_at

server_sessions
---------------
id
tenant_id
chat_id
server_id
billing_type
pool_id
credits_before
credits_after
credits_used
started_at
stopped_at

monitoring_state
----------------
tenant_id
server_id
last_status
last_players_json
last_event_at

pending_configurations
----------------------
chat_id
user_id
selected_server_id
selected_billing_type
selected_pool_id
expires_at
```

The exact schema can be refined during implementation.

---

# 8. Why Not JSON as the Main Database?

The original single-group prototype could use:

```text
config.json
```

but the final architecture should use SQLite.

Reasons:

- multiple groups
- multiple exaroton accounts
- concurrent writes
- crash safety
- transactions
- easier migration
- easier Cloudflare D1 mapping
- easier future expansion

For self-hosting, SQLite remains extremely lightweight.

---

# 9. Telegram Architecture

Use **grammY**.

Separate Telegram concerns into:

```text
bot/
├── commands/
├── callbacks/
├── keyboards/
├── middleware/
└── messages/
```

Commands:

```text
/start
/help
/configure
/pool_credits
/status
```

Potential future commands:

```text
/server
/unconfigure
/reconnect
```

Register commands through Telegram `setMyCommands`.

---

# 10. Authorization

There are two levels of authorization.

### Application authorization

Maintain configured administrator Telegram IDs where appropriate.

### Group authorization

For configuration operations, verify that the user is actually permitted to administer the Telegram group.

Do not rely solely on:

```text
"the button is only visible to admins"
```

Telegram callback queries can be triggered from stale messages.

Every sensitive callback must independently verify authorization.

---

# 11. `/configure`

Use one main configuration interface.

Initial message:

```text
Exaroton Configuration

[ Select Server ]
[ Select Billing Pool ]
```

Selecting **Select Server** replaces the current message with the server-selection keyboard.

Selecting **Select Billing Pool** replaces it with the billing-selection keyboard.

This avoids creating a huge number of Telegram messages.

---

# 12. Server Selection

Call:

```http
GET /v1/servers/
```

The API returns server objects containing information including ID, name, status and player information. exaroton API

Render:

```text
[ Server 1 ] [ Server 2 ]
[ Server 3 ] [ Server 4 ]
[ Server 5 ] [ Server 6 ]
```

Callback format:

```text
server:<serverId>
```

Never put sensitive information in callback data.

---

# 13. Billing Selection

Call:

```http
GET /v1/billing/pools/
```

The API exposes pool ID, name, credits and related pool information. exaroton API

Display:

```text
[ Pool A ] [ Pool B ]
[ Pool C ] [ Profile Credits ]
```

Callback examples:

```text
pool:<poolId>
billing:profile
```

---

# 14. Configuration Flow

Recommended flow:

```text
/configure
    │
    ├── Select Server
    │       │
    │       └── choose server
    │
    └── Select Billing Pool
            │
            ├── choose pool
            └── choose profile credits
```

After selecting the server, automatically continue to billing selection if the user hasn't already selected one.

Once both are selected:

```text
Configuration complete.

Server: My Minecraft Server
Billing: Survival Pool

[ Save Configuration ]
[ Cancel ]
```

Then persist atomically.

---

# 15. Configuration Validation

Before saving:

1. Verify the server exists.
2. Verify the billing source exists.
3. If a pool was selected:
   - verify the server belongs to that pool.

The API provides:

```http
GET /v1/billing/pools/{pool}/servers/
```

for pool-server lookup. exaroton API

This prevents nonsensical configurations.

---

# 16. Billing Model

Use a discriminated union:

```ts
type BillingSource =
    | {
        type: "pool";
        poolId: string;
      }
    | {
        type: "profile";
      };
```

Never represent profile credits as a fake pool ID.

---

# 17. `/pool_credits`

If:

```ts
billing.type === "pool"
```

fetch:

```http
GET /v1/billing/pools/{pool}
```

If:

```ts
billing.type === "profile"
```

fetch:

```http
GET /v1/account/
```

The API documents account credits directly through `/account/`. exaroton API

Response:

```text
💳 Billing Credits

Source: Survival Pool
Remaining: 123.45 credits
```

---

# 18. Monitoring Architecture

Monitoring should be a separate subsystem.

```text
MonitoringManager
       │
       ├── Tenant A / Server A
       │      └── Monitor
       │
       ├── Tenant B / Server B
       │      └── Monitor
       │
       └── Tenant C / Server C
              └── Monitor
```

Each monitored server has isolated state.

---

# 19. Hybrid Monitoring Strategy

Use the hybrid model you selected.

### OFFLINE

Poll every **15 seconds**.

```text
OFFLINE
  │
  │ REST poll every 15 sec
  ▼
STARTING
```

Once the server becomes active/running:

```text
STARTING / ONLINE
       │
       ▼
WebSocket monitoring
```

This avoids maintaining useless WebSocket connections for offline servers while still giving real-time events during active sessions.

---

# 20. Why 15 Seconds?

The purpose of the fallback poll is not player monitoring.

It is only to detect:

```text
OFFLINE → STARTING
```

Once the server becomes active, the WebSocket takes over.

Therefore the 15-second polling interval is deliberately limited to offline detection.

---

# 21. WebSocket Monitoring

The exaroton WebSocket endpoint is:

```text
https://api.exaroton.com/v1/servers/{server}/websocket
```

The documented status stream provides server status and player information.

The monitor should subscribe once the server is running.

---

# 22. WebSocket Lifecycle

Conceptually:

```text
OFFLINE
   │
   │ REST polling
   ▼
STARTING
   │
   ▼
ONLINE
   │
   │ establish WSS
   ▼
WSS MONITORING
   │
   ├── player joins
   ├── player leaves
   ├── status changes
   │
   ▼
STOPPING
   │
   ▼
OFFLINE
```

---

# 23. Status State Machine

Use explicit state transitions.

Known exaroton status codes include:

```text
0  OFFLINE
1  ONLINE
2  STARTING
3  STOPPING
4  RESTARTING
5  SAVING
6  LOADING
7  CRASHED
8  PENDING
9  TRANSFERRING
10 PREPARING
```

These statuses are documented by the API. exaroton API

Do not simply check:

```ts
if (status === ONLINE)
```

Use transition logic.

---

# 24. Server Start Notification

Detect transition:

```text
OFFLINE → STARTING
```

and/or:

```text
STARTING → ONLINE
```

Do not send duplicate "server started" notifications.

Suggested semantics:

```text
🚀 Server started

Server: My Server
```

The exact definition of "started" should be chosen consistently, preferably when the server reaches `ONLINE`.

---

# 25. Player Join Detection

The status payload contains:

```json
players: {
    count,
    list
}
```

Maintain:

```ts
previousPlayers: Set<string>
currentPlayers: Set<string>
```

Calculate:

```text
joined = current - previous
left   = previous - current
```

---

# 26. Player Join Notification

Example:

```text
🟢 Player joined

Steve joined My Server.

Players online: 4/20
```

One event should be emitted per newly detected player.

---

# 27. Player Leave Detection

Example:

```text
🔴 Player left

Steve left My Server.

Players online: 3/20
```

Do not rely on polling for this while the server is online.

Use WebSocket status events.

---

# 28. Server Stop Notification

Detect transition into the stopped state.

Example:

```text
🛑 Server stopped

Server: My Server
```

Immediately after this, perform the credit snapshot.

---

# 29. Credit Usage Tracking

There is no documented dedicated endpoint in the supplied API documentation that directly reports:

```text
"credits consumed by this exact server session"
```

Therefore use snapshots.

At session start:

```text
credits_before = current credits
```

At session end:

```text
credits_after = current credits
```

Then:

```text
credits_used = credits_before - credits_after
```

---

# 30. Important Credit Attribution Limitation

If multiple servers are simultaneously consuming the same billing pool:

```text
Pool
 ├── Server A
 ├── Server B
 └── Server C
```

a pool-credit decrease cannot necessarily be attributed exclusively to Server A.

Therefore the bot must call this:

```text
Estimated credits used
```

rather than falsely claiming exact usage.

For profile credits, the same issue applies if multiple servers consume the account balance.

---

# 31. Stop Notification

Combine stop + credit information.

Example:

```text
🛑 Server stopped

Server: My Server
Session duration: 2h 14m
Estimated credits used: 3.42
Remaining credits: 96.58
```

If attribution is potentially ambiguous, explicitly say:

```text
Estimated credits used
```

---

# 32. Session Tracking

Each running session gets a unique session record.

```text
session
 ├── tenant
 ├── group
 ├── server
 ├── billing source
 ├── start timestamp
 ├── starting credits
 ├── stop timestamp
 ├── ending credits
 └── calculated usage
```

This also makes historical usage possible later.

---

# 33. Restart Handling

A server restart should **not** necessarily be treated as a brand-new unrelated server unless the state machine determines that the previous session genuinely ended.

Handle:

```text
RESTARTING
```

as a transitional state.

Avoid:

```text
STOP → START
```

notifications for every internal restart unless the actual state sequence indicates a genuine stop.

---

# 34. Crash Handling

If:

```text
status = CRASHED
```

send:

```text
💥 Server crashed

Server: My Server
```

Then determine whether exaroton transitions into another state.

Do not immediately create a false "session ended" event unless the state machine determines that the session actually ended.

---

# 35. Reconnection

WebSockets can disconnect.

Implement:

```text
connected
    ↓
connection lost
    ↓
exponential backoff
    ↓
reconnect
```

Suggested backoff:

```text
1s
2s
4s
8s
16s
30s
60s max
```

Reset the backoff after a successful stable connection.

---

# 36. Startup Reconciliation

When the bot starts:

```text
load all configured groups
       ↓
load monitored servers
       ↓
REST-fetch current server state
       ↓
initialize monitoring state
       ↓
start appropriate monitor
```

This prevents the bot from assuming that everything is offline simply because it restarted.

---

# 37. Event Deduplication

Every notification should be generated from a state transition rather than blindly forwarding API events.

Store:

```text
lastStatus
lastPlayers
lastEventTimestamp
```

This prevents:

- duplicate joins
- duplicate leaves
- duplicate starts
- duplicate stops

---

# 38. Telegram Message Isolation

Every event must carry its destination:

```ts
{
    tenantId,
    chatId,
    serverId,
    event
}
```

The notification service must send specifically to:

```ts
chatId
```

belonging to that monitoring instance.

Never have a global notification target.

This guarantees:

```text
Server A → Group A
Server B → Group B
```

and prevents cross-group message leakage.

---

# 39. API Token Isolation

Each exaroton API request must use the credential belonging to its tenant.

Conceptually:

```ts
const client = exarotonClient.forTenant(tenantId);

await client.getServer(serverId);
```

Never cache a token globally.

A monitor should carry its tenant context:

```ts
Monitor {
    tenantId
    chatId
    serverId
    exarotonClient
}
```

---

# 40. Rate Limiting

Implement reasonable limits around:

- `/configure`
- server listing
- pool listing
- `/pool_credits`
- REST fallback polling

Do not accidentally create:

```text
100 groups × 15-second polling
```

with unnecessary requests.

Only poll servers that are:

```text
configured
AND currently offline
AND not being handled by WSS
```

---

# 41. Monitor Lifecycle Manager

Create a central:

```ts
MonitorManager
```

responsible for:

```text
startMonitor(config)
stopMonitor(config)
restartMonitor(config)
reconcileAll()
```

It should maintain a map:

```ts
Map<tenantServerKey, Monitor>
```

with a key such as:

```text
tenantId:serverId
```

This is important because the same server could potentially be configured in different groups/tenants.

---

# 42. Deployment Mode

Support two primary modes.

### Mode A — Self-hosted Node.js

```text
Telegram
   ↓
Node.js bot
   ├── SQLite
   ├── REST
   └── WebSocket
```

Suitable for:

- VPS
- home server
- local development
- Docker
- Raspberry Pi
- ordinary Linux server

### Mode B — Cloudflare

```text
Telegram
   ↓ webhook
Cloudflare Worker
   ↓
D1
   ↓
Monitoring runtime / Durable Object
   ↓
exaroton
```

Cloudflare is optional.

---

# 43. Local Development

The developer should be able to clone the repository and run:

```bash
npm install
npm run dev
```

with only:

```env
TELEGRAM_BOT_TOKEN=
```

and their local database automatically initialized.

No Cloudflare account should be necessary.

No D1 should be necessary.

No Durable Object should be necessary.

---

# 44. VPS Deployment

Provide:

```text
Dockerfile
docker-compose.yml
```

and optionally:

```text
systemd/exaroton-bot.service
```

A basic VPS deployment should be:

```bash
git clone ...
npm install
cp .env.example .env
nano .env
npm run migrate
npm start
```

---

# 45. Cloudflare Deployment

Cloudflare deployment should be an optional package/adapter.

Potential components:

```text
Cloudflare Worker
D1
Durable Object
```

Telegram should use webhook mode there.

Do not make the main application import Cloudflare-specific APIs.

---

# 46. Telegram Transport Abstraction

Support:

```ts
interface TelegramRuntime {
    start(): Promise<void>;
    stop(): Promise<void>;
}
```

Implement:

```text
PollingTelegramRuntime
WebhookTelegramRuntime
```

Self-hosted mode:

```text
long polling
```

Cloudflare mode:

```text
webhook
```

This means the Telegram transport is also deployment-independent.

---

# 47. Exaroton Client Abstraction

Create:

```ts
interface ExarotonClient {
    getAccount(): Promise<Account>;
    getServers(): Promise<Server[]>;
    getServer(id: string): Promise<Server>;
    getPools(): Promise<Pool[]>;
    getPool(id: string): Promise<Pool>;
    getPoolServers(id: string): Promise<Server[]>;
    connectServerWebSocket(id: string): Promise<ServerSocket>;
}
```

This makes the application testable without constantly hitting exaroton.

---

# 48. Testing Strategy

Write unit tests for:

```text
player-diff
status transitions
configuration validation
billing calculations
callback parsing
authorization
tenant isolation
session lifecycle
```

Especially test:

```text
Group A event cannot notify Group B
Tenant A token cannot be used for Tenant B
```

This should be treated as a security requirement.

---

# 49. Recommended Repository Structure

```text
exaroton-telegram-bot/
│
├── src/
│   ├── core/
│   │   ├── types/
│   │   ├── services/
│   │   ├── state/
│   │   └── errors/
│   │
│   ├── telegram/
│   │   ├── bot.ts
│   │   ├── commands/
│   │   ├── callbacks/
│   │   ├── keyboards/
│   │   ├── middleware/
│   │   └── transport/
│   │
│   ├── exaroton/
│   │   ├── client.ts
│   │   ├── rest.ts
│   │   ├── websocket.ts
│   │   ├── servers.ts
│   │   └── billing.ts
│   │
│   ├── monitoring/
│   │   ├── monitor.ts
│   │   ├── manager.ts
│   │   ├── state-machine.ts
│   │   ├── player-diff.ts
│   │   ├── polling.ts
│   │   └── websocket.ts
│   │
│   ├── storage/
│   │   ├── interface.ts
│   │   ├── sqlite.ts
│   │   └── repositories/
│   │
│   ├── notifications/
│   │   └── telegram-notifier.ts
│   │
│   ├── runtime/
│   │   ├── node/
│   │   └── cloudflare/
│   │
│   ├── config.ts
│   └── index.ts
│
├── migrations/
│
├── tests/
│
├── docker/
│
├── cloudflare/
│
├── .env.example
├── package.json
├── tsconfig.json
├── wrangler.toml
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

# 50. Implementation Order

Do **not** build everything simultaneously.

Build in this order:

```text
01. Project skeleton
02. Configuration system
03. Exaroton REST client
04. SQLite storage
05. Telegram bot
06. Authorization
07. /configure
08. Server selection
09. Billing selection
10. Configuration persistence
11. /pool_credits
12. Local monitoring engine
13. REST 15s offline polling
14. WebSocket connection
15. Player diff
16. Status state machine
17. Notifications
18. Credit snapshots
19. Session tracking
20. Reconnection
21. Startup reconciliation
22. Multi-tenant isolation tests
23. Docker/VPS deployment
24. Cloudflare adapter
25. Documentation
```

---

# 51. Development Milestones

### Milestone 1 — API

Successfully:

```text
GET account
GET servers
GET pools
GET pool
GET pool servers
```

### Milestone 2 — Telegram

Successfully:

```text
/start
/configure
setMyCommands
inline keyboards
authorization
```

### Milestone 3 — Configuration

Successfully:

```text
Group → Tenant → Server → Billing source
```

persists across restart.

### Milestone 4 — Monitoring

Successfully:

```text
offline polling
→ online detection
→ WSS
→ player events
→ stop detection
```

### Milestone 5 — Billing

Successfully:

```text
start snapshot
→ running session
→ stop snapshot
→ usage calculation
```

### Milestone 6 — Production

Successfully:

```text
multiple groups
multiple tenants
isolated credentials
isolated events
isolated messages
reconnects
restart recovery
```

### Milestone 7 — Deployment

Successfully:

```text
local
VPS
Docker
Cloudflare
```

all supported.

---

# 52. Important Non-Goals

Do not initially build:

- web dashboard
- authentication website
- OAuth
- Minecraft server control panel
- console forwarding
- player commands
- billing history UI
- analytics dashboard
- automatic server starting
- complicated caching layer

Those can come later.

The first version should do one thing extremely reliably:

> **Monitor configured exaroton servers and report their state and billing information to the correct Telegram group.**

---

# 53. Security Requirements

Never commit:

```text
TELEGRAM_BOT_TOKEN
EXAROTON_API_TOKEN
database credentials
encryption keys
```

to Git.

Provide:

```text
.env.example
```

with placeholders only.

Encrypt stored per-tenant exaroton tokens where practical.

Do not log API tokens.

Do not include API tokens in Telegram messages.

Do not include tokens in callback data.

Validate all callback data server-side.

Verify Telegram permissions on every privileged operation.

---

# 54. Final Architecture

The resulting system should look like:

```text
                         TELEGRAM
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Telegram Adapter     │
                 │ Polling / Webhook   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Core Application    │
                 │                     │
                 │ Commands            │
                 │ Configuration       │
                 │ Authorization       │
                 │ Notifications       │
                 └──────────┬──────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
          Storage       Exaroton       Monitoring
        abstraction     Client         Manager
              │             │              │
        ┌─────┴─────┐       │       ┌──────┴──────┐
        │           │       │       │             │
      SQLite       D1      REST     15s Poll      WSS
        │           │       │       │             │
        └─────┬─────┘       └───────┴─────────────┘
              │
              ▼
       Tenant-specific
       configuration/state
```

And deployment becomes:

```text
                 SAME CORE
                    │
          ┌─────────┼─────────┐
          │         │         │
        Local      VPS    Cloudflare
          │         │         │
       SQLite     SQLite    D1
       Polling    Polling   Webhook
       WSS        WSS       DO/WS
```

---

# 55. Definition of Done

The project is considered complete when a fresh self-hosting user can:

```text
git clone
npm install
configure .env
npm run migrate
npm start
```

add the bot to a Telegram group, run:

```text
/configure
```

select:

```text
Server
+
Billing source
```

and then receive:

```text
🚀 Server started

🟢 Player joined

🔴 Player left

🛑 Server stopped
💳 Estimated credits used: X
💳 Remaining credits: Y
```

while another group using another exaroton account can simultaneously do the same without **any state, credential, event, or message crossover**.

---

# 56. Guiding Principle

The most important architectural rule for the entire implementation:

> **The core application must know nothing about where it is running.**

It should know:

```text
"I have a Telegram update."
"I need this tenant's configuration."
"I need to query this exaroton account."
"This server changed state."
"I need to notify this Telegram chat."
```

It should **not** know:

```text
"I am running on Cloudflare."
"I am using D1."
"I am running on a VPS."
"I am using SQLite."
"I am using polling because I'm on Linux."
```

Those are runtime/deployment concerns.

That gives you a project that can start as a **simple local Node.js application**, become a **Docker/VPS self-hosted bot**, and later gain a **Cloudflare deployment** without rewriting the actual application.

One final implementation caveat: the supplied exaroton documentation confirms the WebSocket status stream and its status/player payload, but it does **not explicitly document that an offline server's WebSocket connection can remain subscribed until that server starts**. Therefore the 15-second offline REST polling → WSS transition should be implemented as the intended hybrid strategy and explicitly tested against the real API rather than assumed.
