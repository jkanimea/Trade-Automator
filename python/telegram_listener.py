import os
import sys
import re
import json
import asyncio
import aiohttp
import urllib.request
from telethon import TelegramClient, events
from telethon.tl.types import PeerChannel
from notifier import send_alert
from openai import AsyncOpenAI

API_URL = os.getenv("API_URL", "http://localhost:5000/api")
SESSION_FILE = os.path.join(os.path.dirname(__file__), "telegram_session")

def get_settings_sync():
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            return {s["key"]: s["value"] for s in settings if s.get("key") and s.get("value")}
    except Exception as e:
        print(f"Failed to fetch settings from API: {e}")
    return {}

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
            if response.status in (200, 201):
                data = await response.json()
                print(f"Signal sent to API: {data}")
                await log_to_api("SUCCESS", f"Signal forwarded to API: {signal['symbol']} {signal['direction']}")
                
                alert_msg = (
                    f"📡 <b>New Signal Parsed</b>\n\n"
                    f"<b>Asset:</b> {signal['symbol']}\n"
                    f"<b>Direction:</b> {signal['direction']}\n"
                    f"<b>Entry:</b> {signal['entry']}\n"
                    f"<b>Stop Loss:</b> {signal['stopLoss']}\n"
                    f"<b>Take Profits:</b> {', '.join(map(str, signal.get('takeProfits', [])))}\n"
                )
                asyncio.create_task(send_alert(alert_msg))
            else:
                text = await response.text()
                print(f"API error: {response.status} - {text}")
                await log_to_api("ERROR", f"Failed to send signal to API: {response.status}")
    except Exception as e:
        print(f"Error sending signal: {e}")
        await log_to_api("ERROR", f"Error sending signal to API: {str(e)}")

def extract_tps_from_lines(text):
    tps = []
    for m in re.finditer(r'(?<!\w)TP(?:\d[\s:@.]+|\s+[:@.]?\s*)([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE):
        try:
            val = float(m.group(1))
            start = m.start()
            before = text[max(0, start - 15):start].lower().strip()
            if re.search(r'(?:entry\s*(?:at\s*)?|move\s*(?:sl\s*)?(?:to\s*)?|sl\s*(?:entry\s*)?(?:at\s*)?|to\s*)$', before):
                continue
            tps.append(val)
        except ValueError:
            pass
    return tps

def extract_sl_from_lines(text):
    m = re.search(r'(?:SL|stop\s*loss)\.?\s*@?\s*([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None

def parse_signal(text: str):
    clean = text.replace('**', '').replace('__', '')

    s2t_match = re.search(
        r'🚀?\s*(\w+(?:/\w+)?)\s*[-–]\s*(BUY|SELL)\s*🚀?\s*Entry:?\s*([\d.]+)\s*(?:Stopp?-?\s*Loss|SL):?\s*([\d.]+)\s*(?:Take-?\s*Profit|TP)\s*1:?\s*([\d.]+)',
        clean, re.IGNORECASE | re.DOTALL
    )
    if s2t_match:
        symbol = s2t_match.group(1).upper()
        direction = s2t_match.group(2).upper()
        entry = float(s2t_match.group(3))
        stop_loss = float(s2t_match.group(4))
        tps = [float(s2t_match.group(5))]
        for i in range(2, 4):
            tp_m = re.search(rf'(?:Take-?\s*Profit|TP)\s*{i}:?\s*([\d.]+)', clean, re.IGNORECASE)
            if tp_m:
                tps.append(float(tp_m.group(1)))
        return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": stop_loss, "takeProfits": tps, "status": "PENDING"}

    alex_match = re.search(
        r'(\w{3,10})\s+(BUY|SELL)\s+NOW\s+([\d]+)[_/]?([\d]*)',
        clean, re.IGNORECASE
    )
    if alex_match:
        symbol = alex_match.group(1).upper()
        direction = alex_match.group(2).upper()
        entry = float(alex_match.group(3))
        tps = extract_tps_from_lines(clean)
        sl = extract_sl_from_lines(clean)
        if tps and sl is not None:
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps, "status": "PENDING"}

    fred_enter_match = re.search(
        r'(\w{3,10})\s+(buy|sell)\s+now\s*\n.*?Enter\s+([\d.]+)',
        clean, re.IGNORECASE | re.DOTALL
    )
    if fred_enter_match:
        symbol = fred_enter_match.group(1).upper()
        direction = fred_enter_match.group(2).upper()
        entry = float(fred_enter_match.group(3))
        tps = extract_tps_from_lines(clean)
        sl = extract_sl_from_lines(clean)
        if tps and sl is not None:
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps, "status": "PENDING"}

    fred_at_match = re.search(
        r'(\w{3,10})\s+(buy|sell)\s+now\s+(?:at\s+)?([\d.]+)',
        clean, re.IGNORECASE
    )
    if fred_at_match:
        symbol = fred_at_match.group(1).upper()
        direction = fred_at_match.group(2).upper()
        entry = float(fred_at_match.group(3))
        tps = extract_tps_from_lines(clean)
        sl = extract_sl_from_lines(clean)
        if tps and sl is not None:
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps, "status": "PENDING"}

    irshad_match = re.search(
        r'(\w{3,10})\s+(Buy|Sell)\s+([\d.]+)(?:/([\d.]+))?\s*\n',
        clean, re.IGNORECASE
    )
    if irshad_match:
        symbol = irshad_match.group(1).upper()
        direction = irshad_match.group(2).upper()
        entry = float(irshad_match.group(3))
        tps = extract_tps_from_lines(clean)
        sl = extract_sl_from_lines(clean)
        if tps and sl is not None:
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps, "status": "PENDING"}

    generic_match = re.search(
        r'(\w{3,10}(?:/\w{3,10})?)\s+(Buy|Sell|BUY|SELL)\s+([\d.]+)',
        clean, re.IGNORECASE
    )
    if generic_match:
        symbol = generic_match.group(1).upper()
        direction = generic_match.group(2).upper()
        entry = float(generic_match.group(3))
        tps = extract_tps_from_lines(clean)
        sl = extract_sl_from_lines(clean)
        if tps and sl is not None:
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps, "status": "PENDING"}

    return None

async def parse_signal_with_ai(text: str, api_key: str):
    if not api_key:
        return None
        
    client = AsyncOpenAI(api_key=api_key)
    prompt = f"""
    You are a trading signal parser. Extract the following from the text.
    Reply strictly in valid JSON format ONLY:
    {{"symbol": string, "direction": "BUY" | "SELL", "entry": float, "stopLoss": float, "takeProfits": float[]}}
    If any field is missing, return an empty JSON object {{}}.
    Do not include markdown blocks or any other text.
    Text: {text}
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        content = response.choices[0].message.content.strip()
        data = json.loads(content)
        
        if all(k in data for k in ["symbol", "direction", "entry", "stopLoss", "takeProfits"]):
            data["symbol"] = data["symbol"].upper().replace("/", "")
            data["direction"] = data["direction"].upper()
            data["status"] = "PENDING"
            return data
    except Exception as e:
        print(f"AI parsing failed: {e}")
        
    return None

async def main():
    settings = get_settings_sync()

    api_id = os.getenv("TELEGRAM_API_ID") or settings.get("telegram_api_id")
    api_hash = os.getenv("TELEGRAM_API_HASH") or settings.get("telegram_api_hash")
    phone = os.getenv("TELEGRAM_PHONE") or settings.get("telegram_phone")
    openai_key = os.getenv("OPENAI_API_KEY") or settings.get("openai_api_key")

    monitored_channels_raw = settings.get("telegram_channels", "[]")
    try:
        parsed_channels = json.loads(monitored_channels_raw)
        monitored_channels = []
        for ch in parsed_channels:
            if isinstance(ch, dict):
                monitored_channels.append(ch.get("id", ""))
            else:
                monitored_channels.append(str(ch))
        monitored_channels = [c for c in monitored_channels if c]
    except json.JSONDecodeError:
        monitored_channels = []

    if not api_id or not api_hash:
        print("ERROR: TELEGRAM_API_ID and TELEGRAM_API_HASH are required.")
        print("Set them in Settings > Telegram Configuration on the dashboard.")
        await log_to_api("ERROR", "Telegram API ID and API Hash not configured. Set them in Settings > Telegram Configuration.")
        return

    api_id = int(api_id)

    print(f"API ID: {api_id}")
    print(f"API Hash: {api_hash[:6]}...{api_hash[-4:]}")
    if phone:
        print(f"Phone: {phone[:4]}...{phone[-2:]}")
    print(f"Monitored channels: {monitored_channels}")

    client = TelegramClient(SESSION_FILE, api_id, api_hash)

    await client.start(phone=phone if phone else lambda: input("Enter your phone number: "))

    me = await client.get_me()
    print(f"Logged in as: {me.first_name} (@{me.username})")
    await log_to_api("SUCCESS", f"Telegram Listener: Logged in as {me.first_name} (@{me.username})")

    async def resolve_entity(ch_id):
        if ch_id.lstrip('-').isdigit():
            num = int(ch_id)
            try:
                return await client.get_entity(num)
            except:
                pass
            raw = abs(num)
            if raw > 1000000000:
                try:
                    return await client.get_entity(PeerChannel(raw))
                except:
                    pass
            if str(raw).startswith("100"):
                stripped = int(str(raw)[3:])
                try:
                    return await client.get_entity(PeerChannel(stripped))
                except:
                    pass
        else:
            return await client.get_entity(ch_id)
        raise Exception(f"Could not resolve channel: {ch_id}")

    resolved_channels = []
    for ch in monitored_channels:
        try:
            entity = await resolve_entity(ch)
            resolved_channels.append(entity.id)
            print(f"Resolved channel: {ch} -> {entity.id} ({getattr(entity, 'title', ch)})")
            await log_to_api("INFO", f"Telegram Listener: Monitoring channel \"{getattr(entity, 'title', ch)}\"")
        except Exception as e:
            print(f"Failed to resolve channel '{ch}': {e}")
            await log_to_api("ERROR", f"Telegram Listener: Failed to resolve channel \"{ch}\": {str(e)}")

    @client.on(events.NewMessage())
    async def handler(event):
        chat = await event.get_chat()
        chat_title = getattr(chat, 'title', 'Private')
        chat_id = event.chat_id

        if resolved_channels and chat_id not in resolved_channels:
            return

        text = event.raw_text
        if not text:
            return

        print(f"[{chat_title}] {text[:100]}...")
        await log_to_api("INFO", f"Telegram Listener: Message from \"{chat_title}\"")

        signal = parse_signal(text)
        
        if not signal and openai_key:
            # Try AI fallback
            print(f"Regex failed. Attempting AI parse...")
            signal = await parse_signal_with_ai(text, openai_key)
            if signal:
                print(f"⚡ AI successfully parsed signal: {signal['symbol']}")
                await log_to_api("SUCCESS", f"AI Signal Parser fallback succeeded for {signal['symbol']}")
        
        if signal:
            signal["telegramMessageId"] = str(event.id)
            print(f"SIGNAL DETECTED: {signal['symbol']} {signal['direction']} @ {signal['entry']}")
            await log_to_api("INFO", f"Signal Parser: Detected \"{signal['symbol']} - {signal['direction']}\" Entry: {signal['entry']}, SL: {signal['stopLoss']}, TPs: {signal['takeProfits']}")
            await send_signal_to_api(signal)
        else:
            print(f"No signal pattern in message")

    print("Telegram userbot started. Listening for signals...")
    await log_to_api("SUCCESS", "Telegram Listener: Connected and monitoring channels")
    await client.run_until_disconnected()

if __name__ == "__main__":
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(main())
