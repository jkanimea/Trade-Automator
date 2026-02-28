# Advanced Risk & Trade Management

**Date:** 2026-03-01
**Status:** Planning

## Overview
Expand the trading engine to handle dynamic stop loss adjustment and capital preservation rules (Drawdown limits). Currently, trades are set and forget. This feature will add a continuous monitoring loop to active trades to secure profits and cut losses strictly.

## Proposed Implementation Plan

### 1. Database & Settings Updates
- Insert new configurations into the `settings` table:
  - `trailing_stop_enabled` (boolean)
  - `trailing_stop_pips` (number)
  - `breakeven_on_tp1` (boolean)
  - `daily_drawdown_limit_percent` (number)

### 2. Frontend Interface Updates
- Modify `client/src/pages/settings.tsx` to include an "Advanced Risk" card.
- Add toggle switches for Trailing Stops and Breakeven, and an input field for the Drawdown Limit %.

### 3. Backend (Node.js API)
- Ensure the `/api/settings` GET and PUT endpoints sync these new values correctly with the frontend.

### 4. Python Execution Engine (`python/`)
- **Active Position Monitor Poll:** Create a new async task (e.g. `monitor_positions.py`) that periodically queries cTrader/broker for currently open positions.
- **Breakeven Logic:** For each open position, check the highest/lowest price reached. If it crosses the TP1 price level, submit an API request to modify the position's Stop Loss to the exact Entry Price.
- **Trailing Stop Logic:** If price moves X pips in profit, continuously adjust the Stop Loss by X pips behind the current price.
- **Drawdown Limit Rule:** Every day at market open (or 00:00 UTC), record the account balance. Query the current balance + floating PnL. If `(Drawdown / StartingBalance) * 100 > DrawdownLimit`, temporarily disable opening new trades for the next 24 hours.

## Complexity & Risk
- **Complexity:** Medium-High. Requires robust state management to avoid spamming the broker API with `modifyPosition` requests every tick.
- **Risk:** High. Bugs in trailing stop logic could accidently move the SL too close, causing premature exits, or fail to move it entirely.

## Walkthrough / Verification
- Open a demo trade.
- Manually move the market price (or simulate via tests) to pass TP1.
- Verify the script automatically calls `modifyPosition` and sets SL to entry.
