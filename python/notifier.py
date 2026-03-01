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

async def send_discord_alert(message: str):
    """
    Sends a message to the configured Discord Webhook URL.
    Silently fails if no URL is configured.
    """
    settings = get_settings_sync()
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL") or settings.get("discord_webhook_url")
    
    if not webhook_url:
        return
        
    payload = {
        # Strip HTML tags from Telegram format for Discord since Discord doesn't support HTML
        "content": message.replace("<b>", "**").replace("</b>", "**").replace("<i>", "*").replace("</i>", "*")
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as resp:
                if resp.status not in (200, 204):
                    text = await resp.text()
                    print(f"Failed to send Discord alert. Status: {resp.status}, Response: {text}")
    except Exception as e:
        print(f"Exception sending Discord alert: {e}")

async def send_alert(message: str):
    """
    Unified function to send alerts to all configured platforms.
    """
    tasks = [
        send_telegram_alert(message),
        send_discord_alert(message)
    ]
    await asyncio.gather(*tasks)

def send_alert_sync(message: str):
    """Synchronous wrapper for unified sending."""
    try:
        asyncio.run(send_alert(message))
    except Exception as e:
        print(f"Failed to run sync alert: {e}")
