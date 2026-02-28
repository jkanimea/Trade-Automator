import os
import urllib.request
import json
import asyncio
import aiohttp

API_URL = os.getenv("API_URL", "http://localhost:5000/api")

def get_settings_sync():
    """Fetches the latest settings from the Node.js API database synchronously."""
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            return {s["key"]: s["value"] for s in settings if s.get("key") and s.get("value")}
    except Exception as e:
        print(f"Failed to fetch settings from API for notifier: {e}")
    return {}

async def send_telegram_alert(message: str):
    """
    Sends a private message to the user via their configured Telegram Bot.
    Silently fails if no bot token or chat ID is configured.
    """
    settings = get_settings_sync()
    bot_token = os.getenv("EXECUTION_BOT_TOKEN") or settings.get("execution_bot_token")
    chat_id = os.getenv("TELEGRAM_CHAT_ID") or settings.get("telegram_chat_id")
    
    if not bot_token or not chat_id:
        return
        
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    print(f"Failed to send Telegram alert. Status: {resp.status}, Response: {text}")
    except Exception as e:
        print(f"Exception sending Telegram alert: {e}")

def send_telegram_alert_sync(message: str):
    """Synchronous wrapper for sending a telegram alert."""
    try:
        asyncio.run(send_telegram_alert(message))
    except Exception as e:
        print(f"Failed to run sync telegram alert: {e}")
