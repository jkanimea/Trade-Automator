import os
import asyncio
import json
import urllib.request
from telethon import TelegramClient
from ctrader_client import CTraderClient

API_URL = os.getenv("API_URL", "http://localhost:5000/api")

def get_settings():
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            return {s["key"]: s["value"] for s in data if s.get("key") and s.get("value")}
    except Exception as e:
        print(f"[ERROR] Could not connect to Dashboard API: {e}")
        return {}

async def verify_telegram(settings):
    print("\n--- Telegram Connectivity Check ---")
    api_id = os.getenv("TELEGRAM_API_ID") or settings.get("telegram_api_id")
    api_hash = os.getenv("TELEGRAM_API_HASH") or settings.get("telegram_api_hash")
    
    if not api_id or not api_hash:
        print("[ERROR] Telegram API ID or Hash not configured.")
        return False
        
    try:
        session_path = os.path.join(os.path.dirname(__file__), "telegram_session")
        client = TelegramClient(session_path, int(api_id), api_hash)
        await client.connect()
        
        if not await client.is_user_authorized():
            print("[ERROR] Telegram: Not authorized. Please run telegram_listener.py to sign in.")
            return False
            
        me = await client.get_me()
        print(f"[OK] Telegram: Connected as {me.first_name} (@{me.username})")
        await client.disconnect()
        return True
    except Exception as e:
        print(f"[ERROR] Telegram: Connection failed: {e}")
        return False

async def verify_ctrader():
    print("\n--- cTrader Connectivity Check ---")
    client = CTraderClient()
    success = await client.authenticate()
    
    if success:
        print("[OK] cTrader: Authentication successful.")
        account_info = await client.get_account_info()
        if account_info:
            balance = account_info.get("balance", "Unknown")
            currency = account_info.get("currency", "")
            print(f"[OK] cTrader: Account info retrieved. Balance: {balance} {currency}")
        else:
            print("[WARNING] cTrader: Could not retrieve account info (check Account ID).")
        return True
    else:
        print("[ERROR] cTrader: Authentication failed. Check Client ID and Secret.")
        return False

async def main():
    print("Starting Trade Automator Connectivity Diagnostics...")
    settings = get_settings()
    
    if not settings:
        print("Critical Error: Cannot proceed without dashboard settings.")
        return

    tg_status = await verify_telegram(settings)
    ct_status = await verify_ctrader()
    
    print("\n" + "="*40)
    print("DIAGNOSTICS SUMMARY:")
    print(f"Dashboard API:  [OK] CONNECTED")
    print(f"Telegram Client: {'[OK] OK' if tg_status else '[ERROR] FAILED'}")
    print(f"cTrader API:     {'[OK] OK' if ct_status else '[ERROR] FAILED'}")
    print("="*40)
    
    if tg_status:
        print("\n[OK] Telegram system is ready!")
        if not ct_status:
            print("[INFO] cTrader is currently disabled/unconfigured. This is fine if you only want to monitor signals.")
        else:
            print("[OK] cTrader system is ready!")
        print("\nYou can now start the Telegram Listener service.")
    else:
        print("\nPlease resolve the Telegram errors above before starting the services.")

if __name__ == "__main__":
    asyncio.run(main())
