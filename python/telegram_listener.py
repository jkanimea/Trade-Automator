import os
import re
import asyncio
import aiohttp
from datetime import datetime
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

API_URL = os.getenv("API_URL", "http://localhost:5000/api")

# Telegram signal pattern matching
SIGNAL_PATTERN = r'🚀?(\w+)\s*-\s*(BUY|SELL)🚀?\s*Entry:\s*([\d.]+)\s*(?:Stopp?-Loss|SL):\s*([\d.]+)\s*(?:Take-Profit|TP)\s*1:\s*([\d.]+)(?:\s*(?:Take-Profit|TP)\s*2:\s*([\d.]+))?(?:\s*(?:Take-Profit|TP)\s*3:\s*([\d.]+))?'

async def log_to_api(level: str, message: str, metadata: dict = None):
    """Send log to Node.js API"""
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
    """Send parsed signal to Node.js API"""
    try:
        async with aiohttp.ClientSession() as session:
            response = await session.post(f"{API_URL}/signals", json=signal)
            if response.status == 200:
                data = await response.json()
                await log_to_api("SUCCESS", f"Signal created: {signal['symbol']} {signal['direction']}", {"signal_id": data.get('id')})
                return data
            else:
                error = await response.text()
                await log_to_api("ERROR", f"Failed to create signal: {error}")
    except Exception as e:
        await log_to_api("ERROR", f"Failed to send signal to API: {str(e)}")
        print(f"Error sending signal to API: {e}")

def parse_signal(text: str) -> dict | None:
    """Parse Telegram message for trading signal"""
    match = re.search(SIGNAL_PATTERN, text, re.IGNORECASE | re.MULTILINE)
    if not match:
        return None
    
    symbol = match.group(1).upper()
    direction = match.group(2).upper()
    entry = float(match.group(3))
    stop_loss = float(match.group(4))
    tp1 = float(match.group(5))
    tp2 = float(match.group(6)) if match.group(6) else None
    tp3 = float(match.group(7)) if match.group(7) else None
    
    take_profits = [tp1]
    if tp2:
        take_profits.append(tp2)
    if tp3:
        take_profits.append(tp3)
    
    return {
        "symbol": symbol,
        "direction": direction,
        "entry": entry,
        "stopLoss": stop_loss,
        "takeProfits": take_profits,
        "status": "PENDING",
        "telegramMessageId": None
    }

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming Telegram messages"""
    if not update.message or not update.message.text:
        return
    
    text = update.message.text
    message_id = str(update.message.message_id)
    
    await log_to_api("INFO", f"Telegram: Received message from channel", {"message_id": message_id})
    
    # Parse signal
    signal = parse_signal(text)
    if signal:
        signal["telegramMessageId"] = message_id
        await log_to_api("INFO", f"Signal Parser: Detected pattern \"{signal['symbol']} - {signal['direction']}\"")
        
        # Send to API
        await send_signal_to_api(signal)
    else:
        await log_to_api("DEBUG", "No valid signal pattern found in message")

async def main():
    """Start Telegram listener"""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not bot_token:
        print("ERROR: TELEGRAM_BOT_TOKEN not set")
        await log_to_api("ERROR", "TELEGRAM_BOT_TOKEN environment variable not set")
        return
    
    await log_to_api("INFO", "Telegram Listener: Starting up...")
    
    # Create application
    application = Application.builder().token(bot_token).build()
    
    # Add message handler
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    await log_to_api("SUCCESS", "Telegram Listener: Connected and monitoring channels")
    
    # Start polling
    print("Telegram bot started. Listening for signals...")
    await application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    asyncio.run(main())
