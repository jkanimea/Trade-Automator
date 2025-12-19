# AlgoTrade Pro - Trading Automation System

## Overview

AlgoTrade Pro is a professional trading automation system that bridges Telegram signal channels with the cTrader trading platform. The application receives forex trading signals from Telegram, parses them, and executes trades automatically through the cTrader Open API. It features a real-time dashboard for monitoring signals, active trades, and system logs with WebSocket-powered live updates.

**Status**: Fully functional with test data. Python services configured and ready to connect to real Telegram/cTrader APIs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Real-time Updates**: WebSocket connection for live data streaming
- **Build Tool**: Vite with custom plugins for Replit integration

**Key Pages**:
- Dashboard: Overview with metrics, charts, and recent activity
- Signals: History of received trading signals
- Trades: Active position management
- Logs: Real-time system terminal output
- Settings: API configuration and risk management

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints under `/api/*`
- **Real-time**: WebSocket server on `/ws` path for broadcasting updates
- **Build**: esbuild bundles server code for production

**API Routes**:
- `/api/signals` - CRUD for trading signals
- `/api/trades` - Trade management and position tracking
- `/api/logs` - System logging endpoint
- `/api/settings` - Configuration key-value storage

### Python Components
The system includes Python scripts for external integrations:
- `telegram_listener.py`: Listens to Telegram channels using python-telegram-bot library, parses trading signals with regex patterns, and forwards them to the Node.js API
- `ctrader_client.py`: OAuth2 client for cTrader Open API to execute trades directly

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit generates migrations to `./migrations`
- **Tables**:
  - `signals`: Trading signals with symbol, direction, entry, SL/TP levels
  - `trades`: Active and historical trade positions
  - `systemLogs`: Application event logging
  - `settings`: Key-value configuration storage

### Signal Processing Flow
1. Telegram listener captures messages from signal channels
2. Regex parser extracts trading parameters (symbol, direction, entry, SL, TP1-3)
3. Signal sent to Node.js API and stored in database
4. WebSocket broadcasts to connected dashboard clients
5. Optional: cTrader client executes trade via Open API

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Third-Party APIs
- **Telegram Bot API**: Signal source via python-telegram-bot library
- **cTrader Open API**: Trade execution (OAuth2 authentication required)
  - Endpoints: `https://api.ctrader.com/oauth2/token`, `/api/v1/accounts/{accountId}/orders`
  - Required env vars: `CTRADER_CLIENT_ID`, `CTRADER_CLIENT_SECRET`, `CTRADER_ACCOUNT_ID`

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express`: HTTP server framework
- `ws`: WebSocket server
- `@tanstack/react-query`: Client-side data fetching
- `recharts`: Dashboard charting
- `zod` / `drizzle-zod`: Schema validation

### Python Dependencies
- `python-telegram-bot`: Telegram integration
- `aiohttp`: Async HTTP client for API communication