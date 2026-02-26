# AlgoTrade Pro — Local Setup Guide

## Prerequisites

- **Node.js** v20+
- **Python** 3.11+
- **PostgreSQL** 14+
- **VS Code** or any code editor

---

## Step 1: Clone / Download the Project

Download all project files from Replit to your local machine.

---

## Step 2: Set Up PostgreSQL

Create a new local database:

```bash
createdb algotrade
```

Or use pgAdmin / any Postgres GUI to create a database called `algotrade`.

---

## Step 3: Create a `.env` File

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/algotrade
```

Replace `postgres` and `yourpassword` with your local Postgres username and password.

> **Note:** The Replit database is internal to Replit's network and cannot be accessed from outside. You must use your own local PostgreSQL instance.

---

## Step 4: Install Node.js Dependencies

```bash
npm install
```

---

## Step 5: Install Python Dependencies

```bash
pip install telethon yfinance finnhub-python aiohttp
```

---

## Step 6: Push the Database Schema

```bash
npm run db:push
```

This creates all the required tables:
- `signals` — Trading signals
- `trades` — Active and historical trades
- `system_logs` — Application event logs
- `settings` — Key-value configuration storage
- `channel_signals` — Telegram channel signals

---

## Step 7: Copy the Telegram Session File

Copy `python/telegram_session.session` from the Replit project to the same path in your local project.

This file contains your authenticated Telegram session so you don't need to re-login.

> **Keep this file private** — it provides access to your Telegram account.

---

## Step 8: Run the Application

Open **two terminals**:

### Terminal 1 — Web App

```bash
npm run dev
```

Starts the Express server + Vite frontend on **port 5000**.
Open [http://localhost:5000](http://localhost:5000) in your browser.

### Terminal 2 — Telegram Listener

```bash
python python/telegram_listener.py
```

Listens for live trading signals from your monitored Telegram channels.

---

## Step 9: Configure Settings

Once the app is running, go to the **Settings** page (`http://localhost:5000/settings`) and configure:

- **Telegram**: API ID, API Hash, Phone number, Channel list
- **Price Verification Providers**: Add up to 5 providers (Yahoo Finance, Finnhub, Twelve Data, etc.) with API keys
- **Candle Interval**: Choose 15m, 30m, or 1h for verification accuracy
- **cTrader**: Client ID, Client Secret, Account ID (for trade execution)
- **Risk Management**: Max risk %, daily loss limit, auto break-even

---

## Step 10: Import Historical Data (Optional)

To fetch historical signals from your Telegram channels:

```bash
python python/fetch_history.py
```

This re-fetches and parses all past messages from your configured channels.

---

## Key Files

| File | Purpose |
|------|---------|
| `server/index.ts` | Express server entry point (port 5000) |
| `shared/schema.ts` | Database schema (Drizzle ORM) |
| `client/src/pages/` | React frontend pages |
| `python/telegram_listener.py` | Live Telegram signal monitor |
| `python/verify_signals.py` | Price verification against real market data |
| `python/fetch_history.py` | Fetch historical messages from Telegram channels |
| `python/ctrader_client.py` | cTrader Open API trade execution |
| `drizzle.config.ts` | Drizzle ORM / migration config |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5000) |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:push` | Push schema changes to database |
| `python python/telegram_listener.py` | Start Telegram signal listener |
| `python python/fetch_history.py` | Fetch channel history |
| `python python/verify_signals.py` | Run price verification on all signals |

---

## Settings Stored in Database

These are configured via the Settings page and saved in the `settings` table (not environment variables):

| Setting Key | Description |
|-------------|-------------|
| `telegram_api_id` | Telegram API ID from my.telegram.org |
| `telegram_api_hash` | Telegram API Hash |
| `telegram_phone` | Phone number for Telegram auth |
| `telegram_channels` | JSON array of monitored channel IDs/usernames |
| `price_providers` | JSON array of verification providers (up to 5) |
| `verification_interval` | Candle interval: `15m`, `30m`, or `1h` |
| `finnhub_api_key` | Finnhub API key (optional) |
| `twelve_data_api_key` | Twelve Data API key (optional) |
| `ctrader_account_id` | cTrader trading account ID |
| `max_risk_percent` | Max risk per trade (default: 2.0%) |
| `daily_loss_limit` | Daily loss limit in USD |
| `auto_break_even` | Auto move SL to break-even at TP1 |

---

## Troubleshooting

**Database connection error:**
Make sure PostgreSQL is running and your `DATABASE_URL` in `.env` is correct.

**Telegram session expired:**
Delete `python/telegram_session.session` and re-run the listener — it will prompt you to log in again with your phone number.

**yfinance not returning data:**
Yahoo Finance has a 60-day lookback limit for 15-minute candles and 730 days for hourly candles. Older signals may show as "PENDING" if data is unavailable.

**Port 5000 already in use:**
Kill any existing process on port 5000 or change the port in `server/index.ts`.
