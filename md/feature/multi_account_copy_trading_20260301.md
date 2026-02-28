# Multi-Account Support (Copy Trading)

**Date:** 2026-03-01
**Status:** Planning

## Overview
Transform the system from a single-account personal tool directly into a copy-trading terminal. By hooking multiple broker API keys, the system can parse a signal once and distribute the order execution across $N$ different portfolios simultaneously.

## Proposed Implementation Plan

### 1. Database Schema Extension
- Instead of relying on a single row in the `settings` table for broker credentials, create a new table: `broker_accounts`.
  - `id` (serial)
  - `alias` (string, e.g. "Funding Challenge 1")
  - `broker_type` (string, e.g. "cTrader", "MetaTrader")
  - `api_key` (string)
  - `api_secret` (string)
  - `account_id` (string)
  - `risk_multiplier` (float) - e.g. 1.0 = normal risk, 0.5 = half risk.
  - `is_active` (boolean)

### 2. UI / Settings Management
- In `client/src/pages/settings.tsx`, remove the static broker fields.
- Add a "Connected Accounts" datatable.
- Provide a dialog to "Add New Account" and "Edit Account". Provide fields for credentials and risk modifiers.

### 3. Execution Engine Refactor
- Update the execution script (which normally listens for `new_signal` events).
- Fetch all `is_active=true` accounts from the `broker_accounts` table.
- **Concurrency:** Dispatch the trade logic asynchronously to all accounts at once using threading or `asyncio.gather`.
  ```python
  async def execute_on_all(signal):
      accounts = get_active_accounts()
      tasks = [place_order(acc, signal) for acc in accounts]
      await asyncio.gather(*tasks)
  ```

### 4. Trade Logging Refactor
- The `trades` table will need to be updated to include an `account_id` foreign key, so the user knows *which* account a specific trade belongs to in the ledger.

## Complexity & Risk
- **Complexity:** High. Introduces a 1-to-many relationship in the core system logic. All endpoints displaying active trades or PnL must be updated to filter or group by the active account.
- **Risk:** High. Execution concurrency could trigger rate limits on the broker API if the user has many accounts running from the same IP address.

## Walkthrough / Verification
- Connect 2 separate demo accounts.
- Fire a signal.
- Verify the trade appears on both brokers simultaneously, with the position sizes accurately reflecting their respective `risk_multiplier`.
