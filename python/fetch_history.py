import os
import re
import json
import asyncio
import urllib.request
from datetime import datetime, timezone
from telethon import TelegramClient
from telethon.tl.types import PeerChannel

API_URL = os.getenv("API_URL", "http://localhost:5000/api")
SESSION_FILE = os.path.join(os.path.dirname(__file__), "telegram_session")

OUTCOME_WIN_PATTERNS = [
    r'(?:TP|take\s*profit|target)\s*(?:\d)?\s*(?:hit|reached|done|complete|✅|💰|🎯|✔)',
    r'(?:✅|💚|🟢|✔️|✔)\s*(?:TP|profit|target|hit)',
    r'(?:profit|pips?|won|win)\s*(?:taken|booked|secured)',
    r'\+\s*\d+\s*pips?',
    r'closed?\s*(?:in\s*)?profit',
    r'(?:all\s*)?(?:TP|targets?)\s*(?:hit|reached|done|complete)',
    r'TP\s*\d?\s*done',
    r'TP\s*\d?\s*(?:hit|HIT)\s*✅?',
    r'TP\s*\d?\s*COMPLETE',
    r'All\s*TP\s*COMPLETE',
]

OUTCOME_LOSS_PATTERNS = [
    r'(?:SL|stop\s*loss)\s*(?:hit|triggered|reached|❌|🔴)',
    r'(?:❌|🔴|💔)\s*(?:SL|stop|loss)',
    r'stopped?\s*out',
    r'(?:loss|lost)\s*(?:taken|booked)',
    r'-\s*\d+\s*pips?\s',
    r'closed?\s*(?:in\s*)?loss',
    r'SL\s*HIT',
]


def get_settings_sync():
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            return {s["key"]: s["value"] for s in settings if s.get("key") and s.get("value")}
    except Exception as e:
        print(f"Failed to fetch settings: {e}")
    return {}


def extract_tps_from_lines(text):
    tps = []
    for m in re.finditer(r'TP\s*\d*\.?\s*@?\s*([\d.]+)', text, re.IGNORECASE):
        tps.append(float(m.group(1)))
    return tps

def extract_sl_from_lines(text):
    m = re.search(r'(?:SL|stop\s*loss)\.?\s*@?\s*([\d.]+)', text, re.IGNORECASE)
    if m:
        return float(m.group(1))
    return None


def parse_signal(text):
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
        return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": stop_loss, "takeProfits": tps}

    alex_match = re.search(
        r'(\w{3,10})\s+(BUY|SELL)\s+NOW\s+([\d]+)[_/]?([\d]*)',
        clean, re.IGNORECASE
    )
    if alex_match:
        symbol = alex_match.group(1).upper()
        direction = alex_match.group(2).upper()
        entry_str = alex_match.group(3)
        entry = float(entry_str)
        tps = extract_tps_from_lines(clean)
        sl = extract_sl_from_lines(clean)
        if tps and sl is not None:
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps}

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
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps}

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
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps}

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
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps}

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
            return {"symbol": symbol, "direction": direction, "entry": entry, "stopLoss": sl, "takeProfits": tps}

    return None


def determine_outcome(signal_data, follow_up_messages):
    symbol = signal_data.get("symbol", "").lower()
    
    for msg in follow_up_messages[:15]:
        msg_lower = msg.lower()
        if symbol and symbol not in msg_lower and len(follow_up_messages) > 5:
            continue
            
        for pattern in OUTCOME_WIN_PATTERNS:
            if re.search(pattern, msg, re.IGNORECASE):
                return "WIN"
        for pattern in OUTCOME_LOSS_PATTERNS:
            if re.search(pattern, msg, re.IGNORECASE):
                return "LOSS"

    combined = " ".join(follow_up_messages[:20])
    for pattern in OUTCOME_WIN_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return "WIN"
    for pattern in OUTCOME_LOSS_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return "LOSS"

    return "PENDING"


def send_batch_to_api(signals_batch):
    try:
        data = json.dumps({"signals": signals_batch}).encode()
        req = urllib.request.Request(
            f"{API_URL}/channel-signals/batch",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return result.get("created", 0)
    except Exception as e:
        print(f"  Failed to send batch: {e}")
        return 0


def log_to_api(level, message):
    try:
        data = json.dumps({"level": level, "message": message}).encode()
        req = urllib.request.Request(
            f"{API_URL}/logs",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except:
        pass


async def resolve_entity(client, channel_id):
    if channel_id.lstrip('-').isdigit():
        num = int(channel_id)
        try:
            entity = await client.get_entity(num)
            return entity
        except:
            pass
        
        raw = abs(num)
        if raw > 1000000000:
            try:
                entity = await client.get_entity(PeerChannel(raw))
                return entity
            except:
                pass
        
        if str(raw).startswith("100"):
            stripped = int(str(raw)[3:])
            try:
                entity = await client.get_entity(PeerChannel(stripped))
                return entity
            except:
                pass
    else:
        entity = await client.get_entity(channel_id)
        return entity
    
    raise Exception(f"Could not resolve channel: {channel_id}")


async def fetch_channel_history(client, channel_id, channel_name, limit=1000):
    print(f"\n{'='*60}")
    print(f"Fetching history for: {channel_name} ({channel_id})")
    print(f"{'='*60}")

    try:
        entity = await resolve_entity(client, channel_id)
        resolved_name = getattr(entity, 'title', channel_name)
        print(f"  Resolved: {resolved_name}")
    except Exception as e:
        print(f"  ERROR resolving channel: {e}")
        log_to_api("ERROR", f"History Fetch: Failed to resolve channel {channel_id}: {str(e)}")
        return []

    messages = []
    async for msg in client.iter_messages(entity, limit=limit):
        if msg.text:
            messages.append({
                "id": str(msg.id),
                "date": msg.date,
                "text": msg.text
            })

    messages.reverse()
    print(f"  Fetched {len(messages)} messages")

    signal_entries = []
    for i, msg in enumerate(messages):
        signal = parse_signal(msg["text"])
        if signal:
            follow_ups = [m["text"] for m in messages[i+1:i+25]]
            outcome = determine_outcome(signal, follow_ups)

            entry = {
                "channelId": channel_id,
                "channelName": resolved_name,
                "messageId": msg["id"],
                "messageDate": msg["date"].isoformat(),
                "symbol": signal["symbol"],
                "direction": signal["direction"],
                "entry": signal["entry"],
                "stopLoss": signal["stopLoss"],
                "takeProfits": signal["takeProfits"],
                "outcome": outcome,
                "rawMessage": msg["text"][:500],
            }
            signal_entries.append(entry)
            status_icon = "✅" if outcome == "WIN" else "❌" if outcome == "LOSS" else "⏳"
            print(f"  {status_icon} {signal['symbol']} {signal['direction']} @ {signal['entry']} -> {outcome}")

    print(f"  Found {len(signal_entries)} signals")

    if signal_entries:
        wins = sum(1 for s in signal_entries if s["outcome"] == "WIN")
        losses = sum(1 for s in signal_entries if s["outcome"] == "LOSS")
        pending = sum(1 for s in signal_entries if s["outcome"] == "PENDING")
        total = len(signal_entries)
        decided = wins + losses
        win_rate = (wins / decided * 100) if decided > 0 else 0
        print(f"  Summary: {wins}W / {losses}L / {pending}P ({win_rate:.1f}% win rate on decided)")

    return signal_entries


async def main():
    settings = get_settings_sync()

    api_id = os.getenv("TELEGRAM_API_ID") or settings.get("telegram_api_id")
    api_hash = os.getenv("TELEGRAM_API_HASH") or settings.get("telegram_api_hash")
    phone = os.getenv("TELEGRAM_PHONE") or settings.get("telegram_phone")

    if not api_id or not api_hash:
        print("ERROR: Telegram credentials not configured")
        return

    api_id = int(api_id)

    channels_raw = settings.get("telegram_channels", "[]")
    try:
        parsed = json.loads(channels_raw)
        channels = []
        for ch in parsed:
            if isinstance(ch, dict):
                channels.append({"id": ch.get("id", ""), "label": ch.get("label", "")})
            else:
                channels.append({"id": str(ch), "label": str(ch)})
        channels = [c for c in channels if c["id"]]
    except json.JSONDecodeError:
        channels = []

    if not channels:
        print("No channels configured")
        return

    print(f"Analyzing {len(channels)} channel(s)...")
    log_to_api("INFO", f"History Fetch: Starting analysis of {len(channels)} channels")

    client = TelegramClient(SESSION_FILE, api_id, api_hash)
    await client.start(phone=phone if phone else lambda: input("Phone: "))

    me = await client.get_me()
    print(f"Logged in as: {me.first_name} (@{me.username})")

    all_signals = []
    for ch in channels:
        signals = await fetch_channel_history(client, ch["id"], ch["label"])
        all_signals.extend(signals)

    if all_signals:
        print(f"\nSending {len(all_signals)} signals to API...")
        batch_size = 50
        total_created = 0
        for i in range(0, len(all_signals), batch_size):
            batch = all_signals[i:i+batch_size]
            created = send_batch_to_api(batch)
            total_created += created
            print(f"  Batch {i//batch_size + 1}: {created} new signals stored")

        print(f"\nTotal: {total_created} new signals stored in database")
        log_to_api("SUCCESS", f"History Fetch: Analyzed {len(all_signals)} signals, stored {total_created} new records")
    else:
        print("\nNo signals found in any channel")
        log_to_api("INFO", "History Fetch: No signals found in channel history")

    await client.disconnect()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
