# Dashboard Analytics & Charting

**Date:** 2026-03-01
**Status:** Planning

## Overview
Move beyond a simple ledger of signals into a powerful analytical dashboard. This will track the actual performance of the system over time, letting the user determine mathematically if they have a statistical edge.

## Proposed Implementation Plan

### 1. Backend Aggregation API
- Create a new analytics route (`server/routes/analytics.ts` or directly in `routes.ts`) with a `GET /api/analytics/performance` endpoint.
- Write raw SQL or Drizzle queries to group closed trades by day, week, and month to calculate:
  - Total Net PnL
  - Win Rate (%)
  - Average Win ($) vs Average Loss ($) -> Risk/Reward Ratio

### 2. Frontend Charting Integration
- Install a charting library like `recharts` for aggregate data (e.g., Equity Curve).
- Build an `EquityCurveChart.tsx` component to visualize the cumulative PnL over time.
- Update the main `Dashboard.tsx` to show KPI cards at the top (Win Rate, Total PnL, R:R).

### 3. Price History Visualization (Lightweight Charts)
- Install `lightweight-charts`.
- Update the Signal modal or detail view to embed a trading chart.
- The chart should request historical candles for the `symbol` via the existing `TwelveData` or `Finnhub` integration.
- Draw horizontal lines on the chart for the Signal's `Entry`, `Stop Loss`, and `Take Profits` to visually represent the trade setup.

### 4. CSV Export Tooling
- Add an "Export CSV" button to the `Signals.tsx` and `Trades.tsx` pages.
- Generate a CSV blob in the browser by stringifying the `allSignals` or `trades` state, allowing the user to download it directly.

## Complexity & Risk
- **Complexity:** Medium. Mostly a frontend and SQL query task. The TradingView Lightweight Charts integration has a slight learning curve but is well documented.
- **Risk:** Low. This is purely visual and analytical. It does not interact with live trading execution or capital.

## Walkthrough / Verification
- Start the app and navigate to the Dashboard. Verify the Equity Curve matches the sum of the trade database.
- Click "Export CSV" and verify the downloaded file opens neatly in Excel.
