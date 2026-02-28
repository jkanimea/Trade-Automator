# Enhanced Signal Processing

**Date:** 2026-03-01
**Status:** Planning

## Overview
Telegram signal formats are notoriously inconsistent. While Regex works for strict structures, it breaks the moment an admin uses a different formatting style or emoji. This feature introduces a robust duplicate checker and an AI fallback to guarantee almost 100% signal parsing accuracy.

## Proposed Implementation Plan

### 1. Duplicate Signal Prevention
- [ ] **Database Schema:** Add a uniqueness constraint or logic check utilizing `(symbol, direction, entry, timestamp)`.
- [ ] **Python Listener (`telegram_listener.py`):** Before logging and dispatching a signal to the API, query the database. If an identical signal (same asset, same direction, within ~5% of the same entry price) was received in the last 2 hours, flag it as `DUPLICATE` and ignore it.

### 2. AI / LLM Parsing Fallback
- [ ] Install `openai` package via pip.
- [ ] Add an `OPENAI_API_KEY` to the `.env` settings.
- [ ] If the `parse_signal(text)` function using Regex returns `None` (fails to parse), pass the raw message to an LLM.
- [ ] **Prompt Design:**
  ```text
  You are a trading signal parser. Extract the following from the text. 
  Reply strictly in valid JSON format:
  {"symbol": string, "direction": "BUY" | "SELL", "entry": float, "stopLoss": float, "takeProfits": float[]}
  Text: {raw_message}
  ```
- [ ] Parse the LLM's JSON response. If successful, treat it as a valid signal and proceed.

### 3. Manual Signal Input (Bonus)
- [ ] Provide a UI form on the web dashboard to mathematically construct and insert a signal manually into the database, bypassing Telegram entirely. Useful for personal trades that you want the automation engine to manage.

## Complexity & Risk
- [ ] **Complexity:** Low-Medium. Sending prompts to an LLM is straightforward. Handling duplicate states requires careful time-window logic.
- [ ] **Risk:** Medium. If the LLM hallucinates a Stop Loss incorrectly (e.g., placing a Stop Loss below 0), it could cause API execution errors or bad trades. Must include validation checks on the output (e.g., SL < Entry for a BUY).

## Walkthrough / Verification
- [ ] Paste a deliberately malformed signal into one of the monitored Telegram channels.
- [ ] Verify `telegram_listener.py` fails regex, hands it to OpenAI, correctly parses the JSON, and loads it into the database.
