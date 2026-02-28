# Trade Automator

A full-stack algorithmic copy-trading platform that parses Telegram signals, validates them, and executes them concurrently across multiple broker accounts.

## High-Level Architecture
Trade Automator connects several micro-services to create a seamless execution chain:
1. **Telegram Listener (Python):** Monitors specific channels, parses raw text with Regex (or OpenAI fallback), and forwards normalized JSON signals to the backend.
2. **Core API Engine (Node.js/Express, TypeScript):** Receives the signals, prevents duplicate trades, checks risk management configurations, and logs the intent to a PostgreSQL database (via Drizzle ORM).
3. **Execution Engine (Python/cTrader Integration):** Polls for new signals and dispatches the execution orders to configured broker accounts.
4. **Dashboard (React/Vite):** A frontend UI that provides real-time visibility into the system logs, active positions, PnL, and broker settings.

## 🚀 New Developer & Agent Welcome Guide

Welcome! If you are a new developer or an AI Agent jumping into this repository for the first time, please follow this strict reading order to understand the codebase state:

1. **[md/DEVELOPMENT.md](file:///c:/2026/tradeAutomate/md/DEVELOPMENT.md):** 
   Start here to understand the environment variables, Docker/Database setup, and the commands required to run the local microservices.
2. **[md/readme.md](file:///c:/2026/tradeAutomate/md/readme.md):** 
   This is the master index for all project documentation. It tracks which features are active, which are completed, and links to all technical documents.
3. **[md/feature/readme.md](file:///c:/2026/tradeAutomate/md/feature/readme.md):** 
   **CRITICAL READING**. This outlines the mandatory testing framework (Vitest, Pytest, Playwright) requirements, milestone generation rules, and commit policies. **You cannot commit a feature unless it obeys these rules.**
4. **[md/walkthrough/](file:///c:/2026/tradeAutomate/md/walkthrough/):** 
   Review the timestamped walkthroughs in this folder to understand the most recent development milestones, architectural decisions, and known system limitations.

## Automated Testing Suite
The platform uses a comprehensive testing strategy. To verify your local setup is functioning, run the following:
- `npm run test` (Vitest for Node.js backend and React components)
- `npm run test:e2e` (Playwright for end-to-end browser flows)
- `cd python && pytest` (Pytest for Python microservices)
