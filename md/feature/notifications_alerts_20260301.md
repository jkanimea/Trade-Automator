# Notifications & Alerts

**Date:** 2026-03-01
**Status:** Planning

## Overview
Currently, the user has to look at the web dashboard or monitor their broker app directly to know if a trade passed through successfully. This feature will create a dedicated execution-alert channel via a private Telegram Bot.

## Proposed Implementation Plan

### 1. Telegram Bot Setup
- Register a new bot via `BotFather` on Telegram.
- Save the `EXECUTION_BOT_TOKEN` in the `.env` settings.
- Have the user text the bot to retrieve their `TELEGRAM_USER_CHAT_ID`. Save this in the settings configuration.

### 2. System Hooks
- **Python / Node backend:** Write a utility function `send_telegram_alert(message: str)`.
- Implement this simple REST call using the standard Telegram Bot API: 
  `POST https://api.telegram.org/bot<TOKEN>/sendMessage`
  
### 3. Trigger Points
Inject the alert webhook into the trade lifecycle:
- **Trade Execution:** "⚡ Signal Executed: BUY EURUSD. Entry: 1.10. Risk: 2%"
- **Trade Failure:** "❌ Execution Failed: GBPJPY (Insufficient Margin / API Error)"
- **Trade Closure:** "🏁 Trade Closed: XAUUSD. Outcome: WIN (+ $45.00)"

### 4. Discord Alternative (Optional)
- Alongside the Telegram bot, add an input field for a `DISCORD_WEBHOOK_URL` in the settings interface, allowing alerts to be dumped into a private Discord server instead if desired.

## Complexity & Risk
- **Complexity:** Low. This is a standard REST webhook implementation. We do not need an extensive Telegram listening library since we are only *sending* messages, not receiving them.
- **Risk:** Low. Does not interact with trading logic. Can only fail silently or throw standard HTTP network errors.

## Walkthrough / Verification
- Add a dummy webhook endpoint to settings.
- Trigger a mock successful trade in the database.
- Receive a Telegram message in the private channel immediately.
