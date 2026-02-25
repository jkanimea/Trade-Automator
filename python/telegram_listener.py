import os
import re
import asyncio
import aiohttp
from datetime import datetime
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:5000/api")

SIGNAL_PATTERN = r'🚀?(\w+)\s*-\s*(BUY|SELL)🚀?\s*Entry:\s*([\d.]+)\s*(?:Stopp?-Loss|SL):\s*([\d.]+)\s*(?:Take-Profit|TP)\s*1:\s*([\d.]+)(?:\s*(?:Take-Profit|TP)\s*2:\s*([\d.]+))?(?:\s*(?:Take-Profit|TP)\s*3:\s*([\d.]+))?'

async def log_to_api(level: str, message: str, metadata: dict = None):
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(f"{API_URL}/logs", json={
                "level": level,
                "message": message,
                "metadata": metadata
            })
    except Exception as e:
        print(f"Failed to log to API: {e}")

async def send_signal_to_api(signal: dict):
    try:
        async with aiohttp.ClientSession() as session:
            response = await session.post(f"{API_URL}/signals", json=signal)
            if response.status == 200 or response.status == 201:
                data = await response.json()
                print(f"Signal sent to API: {data}")
                await log_to_api("SUCCESS", f"Signal forwarded to API: {signal['symbol']} {signal['direction']}")
            else:
                text = await response.text()
                print(f"API error: {response.status} - {text}")
                await log_to_api("ERROR", f"Failed to send signal to API: {response.status}")
    except Exception as e:
        print(f"Error sending signal: {e}")
        await log_to_api("ERROR", f"Error sending signal to API: {str(e)}")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return

    text = update.message.text
    chat_title = update.message.chat.title or "Unknown"
    print(f"[{chat_title}] Received message: {text[:100]}...")

    await log_to_api("INFO", f"Telegram Listener: Message received from \"{chat_title}\"")

    match = re.search(SIGNAL_PATTERN, text, re.IGNORECASE | re.DOTALL)

    if match:
        symbol = match.group(1).upper()
        direction = match.group(2).upper()
        entry = float(match.group(3))
        stop_loss = float(match.group(4))
        tp1 = float(match.group(5))

        take_profits = [tp1]
        if match.group(6):
            take_profits.append(float(match.group(6)))
        if match.group(7):
            take_profits.append(float(match.group(7)))

        signal = {
            "telegramMessageId": str(update.message.message_id),
            "symbol": symbol,
            "direction": direction,
            "entry": entry,
            "stopLoss": stop_loss,
            "takeProfits": take_profits,
            "status": "PENDING"
        }

        print(f"Signal detected: {symbol} {direction} @ {entry}")
        await log_to_api("INFO", f"Signal Parser: Detected \"{symbol} - {direction}\" Entry: {entry}, SL: {stop_loss}, TPs: {take_profits}")

        await send_signal_to_api(signal)
    else:
        print(f"No signal pattern found in message")
        await log_to_api("DEBUG", "No valid signal pattern found in message")

def get_bot_token_sync():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if token:
        return token
    import urllib.request
    import json
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            for s in settings:
                if s.get("key") == "telegram_bot_token" and s.get("value"):
                    return s["value"]
    except Exception as e:
        print(f"Failed to fetch token from API: {e}")
    return None

def main():
    bot_token = get_bot_token_sync()

    if not bot_token:
        print("ERROR: TELEGRAM_BOT_TOKEN not set in environment or settings")
        print("Set it in Settings > Telegram Configuration on the dashboard.")
        return

    print(f"Bot token found (ending in ...{bot_token[-4:]})")
    print("Starting Telegram bot...")

    application = Application.builder().token(bot_token).build()
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Telegram bot started. Listening for signals...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
