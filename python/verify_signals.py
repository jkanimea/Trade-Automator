import os
import re
import json
import time
import asyncio
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone

API_URL = os.getenv("API_URL", "http://localhost:5000/api")


def get_twelve_data_key():
    key = os.getenv("TWELVE_DATA_API_KEY", "")
    if key:
        return key
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            for s in settings:
                if s.get("key") == "twelve_data_api_key" and s.get("value"):
                    return s["value"]
    except:
        pass
    return ""


TWELVE_DATA_KEY = get_twelve_data_key()

SYMBOL_MAP = {
    "XAUUSD": "XAU/USD",
    "GOLD": "XAU/USD",
    "EURUSD": "EUR/USD",
    "GBPUSD": "GBP/USD",
    "USDJPY": "USD/JPY",
    "AUDUSD": "AUD/USD",
    "USDCAD": "USD/CAD",
    "USDCHF": "USD/CHF",
    "NZDUSD": "NZD/USD",
    "GBPJPY": "GBP/JPY",
    "EURJPY": "EUR/JPY",
    "EURGBP": "EUR/GBP",
    "XAGUSD": "XAG/USD",
    "US30": "DJI",
    "NAS100": "NDX",
    "SPX500": "SPX",
    "BTCUSD": "BTC/USD",
}


def get_twelve_data_symbol(symbol):
    upper = symbol.upper().replace("/", "")
    if upper in SYMBOL_MAP:
        return SYMBOL_MAP[upper]
    if "/" in symbol:
        return symbol.upper()
    if len(upper) == 6:
        return f"{upper[:3]}/{upper[3:]}"
    return upper


def fetch_candles(symbol, start_date, end_date, interval="1h"):
    td_symbol = get_twelve_data_symbol(symbol)
    start_str = start_date.strftime("%Y-%m-%d %H:%M:%S")
    end_str = end_date.strftime("%Y-%m-%d %H:%M:%S")

    params = urllib.parse.urlencode({
        "symbol": td_symbol,
        "interval": interval,
        "start_date": start_str,
        "end_date": end_str,
        "apikey": TWELVE_DATA_KEY,
        "format": "JSON",
        "outputsize": "500",
    })
    url = f"https://api.twelvedata.com/time_series?{params}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        if data.get("status") == "error":
            msg = data.get('message', 'Unknown error')
            if "API credits" in msg or "rate" in msg.lower():
                print(f"  Rate limited, waiting 60s...")
                time.sleep(60)
                req2 = urllib.request.Request(url)
                with urllib.request.urlopen(req2, timeout=15) as resp2:
                    data = json.loads(resp2.read().decode())
                if data.get("status") == "error":
                    print(f"  API Error after retry: {data.get('message', 'Unknown error')}")
                    return None
            else:
                print(f"  API Error: {msg}")
                return None

        values = data.get("values", [])
        if not values:
            print(f"  No candle data returned for {td_symbol}")
            return None

        candles = []
        for v in values:
            candles.append({
                "datetime": v["datetime"],
                "open": float(v["open"]),
                "high": float(v["high"]),
                "low": float(v["low"]),
                "close": float(v["close"]),
            })

        candles.sort(key=lambda c: c["datetime"])
        return candles

    except Exception as e:
        print(f"  Error fetching candles: {e}")
        return None


def verify_signal(signal, candles):
    direction = signal.get("direction", "").upper()
    entry = signal.get("entry", 0)
    stop_loss = signal.get("stopLoss", 0)
    take_profits = signal.get("takeProfits", [])

    if not entry or not stop_loss or not take_profits:
        return "PENDING", "Missing entry/SL/TP data"

    tp1 = take_profits[0]

    for candle in candles:
        high = candle["high"]
        low = candle["low"]

        if direction == "BUY":
            if low <= stop_loss:
                if high >= tp1:
                    if abs(low - stop_loss) < abs(high - tp1):
                        return "LOSS", f"SL hit at {stop_loss} (candle low {low})"
                    else:
                        return "WIN", f"TP1 hit at {tp1} (candle high {high})"
                return "LOSS", f"SL hit at {stop_loss} (candle low: {low})"
            if high >= tp1:
                return "WIN", f"TP1 hit at {tp1} (candle high: {high})"

        elif direction == "SELL":
            if high >= stop_loss:
                if low <= tp1:
                    if abs(high - stop_loss) < abs(low - tp1):
                        return "LOSS", f"SL hit at {stop_loss} (candle high {high})"
                    else:
                        return "WIN", f"TP1 hit at {tp1} (candle low {low})"
                return "LOSS", f"SL hit at {stop_loss} (candle high: {high})"
            if low <= tp1:
                return "WIN", f"TP1 hit at {tp1} (candle low: {low})"

    return "PENDING", "Neither SL nor TP1 hit in available data"


def get_channel_signals():
    try:
        req = urllib.request.Request(f"{API_URL}/channel-signals")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Failed to fetch channel signals: {e}")
        return []


def update_signal_outcome(signal_id, outcome, verification_note):
    try:
        data = json.dumps({
            "outcome": outcome,
            "verificationNote": verification_note,
        }).encode()
        req = urllib.request.Request(
            f"{API_URL}/channel-signals/{signal_id}/verify",
            data=data,
            headers={"Content-Type": "application/json"},
            method="PUT"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  Failed to update signal {signal_id}: {e}")
        return None


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


def main():
    if not TWELVE_DATA_KEY:
        print("ERROR: TWELVE_DATA_API_KEY environment variable not set")
        print("Get a free key at https://twelvedata.com/apikey")
        return

    print("Fetching channel signals from database...")
    signals = get_channel_signals()
    print(f"Found {len(signals)} total signals")

    signals_to_verify = []
    for sig in signals:
        has_required = (
            sig.get("entry") and
            sig.get("stopLoss") and
            sig.get("takeProfits") and
            len(sig.get("takeProfits", [])) > 0 and
            sig.get("messageDate") and
            sig.get("symbol")
        )
        if has_required:
            signals_to_verify.append(sig)

    print(f"Signals with complete data for verification: {len(signals_to_verify)}")

    grouped = {}
    for sig in signals_to_verify:
        symbol = sig["symbol"].upper().replace("/", "")
        if symbol not in grouped:
            grouped[symbol] = []
        grouped[symbol].append(sig)

    print(f"Unique symbols: {list(grouped.keys())}")
    log_to_api("INFO", f"Price Verification: Starting verification of {len(signals_to_verify)} signals across {len(grouped)} symbols")

    api_calls = 0
    verified_count = 0
    win_count = 0
    loss_count = 0
    pending_count = 0

    for symbol, sym_signals in grouped.items():
        print(f"\n{'='*60}")
        print(f"Verifying {len(sym_signals)} signals for {symbol}")
        print(f"{'='*60}")

        sym_signals.sort(key=lambda s: s.get("messageDate", ""))

        date_groups = {}
        for sig in sym_signals:
            try:
                msg_date = datetime.fromisoformat(sig["messageDate"].replace("Z", "+00:00"))
            except:
                continue
            date_key = msg_date.strftime("%Y-%m-%d")
            if date_key not in date_groups:
                date_groups[date_key] = {"start": msg_date, "end": msg_date, "signals": []}
            date_groups[date_key]["signals"].append(sig)
            if msg_date < date_groups[date_key]["start"]:
                date_groups[date_key]["start"] = msg_date
            if msg_date > date_groups[date_key]["end"]:
                date_groups[date_key]["end"] = msg_date

        batch_dates = []
        current_batch_start = None
        current_batch_end = None
        current_batch_signals = []

        sorted_dates = sorted(date_groups.keys())
        for dk in sorted_dates:
            dg = date_groups[dk]
            if current_batch_start is None:
                current_batch_start = dg["start"]
                current_batch_end = dg["end"]
                current_batch_signals = dg["signals"][:]
            elif (dg["start"] - current_batch_end).days <= 3:
                current_batch_end = max(current_batch_end, dg["end"])
                current_batch_signals.extend(dg["signals"])
            else:
                batch_dates.append((current_batch_start, current_batch_end, current_batch_signals))
                current_batch_start = dg["start"]
                current_batch_end = dg["end"]
                current_batch_signals = dg["signals"][:]

        if current_batch_start is not None:
            batch_dates.append((current_batch_start, current_batch_end, current_batch_signals))

        for batch_start, batch_end, batch_signals in batch_dates:
            fetch_start = batch_start - timedelta(hours=1)
            fetch_end = batch_end + timedelta(days=2)

            now = datetime.now(timezone.utc)
            if fetch_end > now:
                fetch_end = now

            print(f"\n  Fetching candles: {fetch_start.date()} to {fetch_end.date()} ({len(batch_signals)} signals)")

            if api_calls >= 780:
                print("  WARNING: Approaching API rate limit (800/day). Stopping.")
                log_to_api("WARNING", "Price Verification: Approaching daily API rate limit, pausing")
                break

            if api_calls > 0 and api_calls % 7 == 0:
                print(f"  Pausing 65s to respect rate limit (8 calls/min)...")
                time.sleep(65)

            candles = fetch_candles(symbol, fetch_start, fetch_end, interval="1h")
            api_calls += 1

            if not candles:
                print(f"  No candle data available, skipping batch")
                continue

            print(f"  Got {len(candles)} candles")

            for sig in batch_signals:
                try:
                    msg_date = datetime.fromisoformat(sig["messageDate"].replace("Z", "+00:00"))
                except:
                    continue

                msg_date_str = msg_date.strftime("%Y-%m-%d %H:%M")
                relevant_candles = [
                    c for c in candles
                    if c["datetime"] >= msg_date_str
                ]

                if not relevant_candles:
                    continue

                outcome, reason = verify_signal(sig, relevant_candles)
                old_outcome = sig.get("outcome", "PENDING")

                icon = "✅" if outcome == "WIN" else "❌" if outcome == "LOSS" else "⏳"
                change_note = ""
                if old_outcome != outcome and old_outcome != "PENDING":
                    change_note = f" (was {old_outcome})"

                print(f"  {icon} {sig['symbol']} {sig['direction']} @ {sig['entry']} -> {outcome}{change_note}")
                print(f"     Reason: {reason}")

                result = update_signal_outcome(sig["id"], outcome, f"Price verified: {reason}")
                if result:
                    verified_count += 1
                    if outcome == "WIN":
                        win_count += 1
                    elif outcome == "LOSS":
                        loss_count += 1
                    else:
                        pending_count += 1

            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"VERIFICATION COMPLETE")
    print(f"{'='*60}")
    print(f"Total verified: {verified_count}")
    print(f"  Wins:    {win_count}")
    print(f"  Losses:  {loss_count}")
    print(f"  Pending: {pending_count}")
    print(f"API calls used: {api_calls}")

    decided = win_count + loss_count
    if decided > 0:
        real_win_rate = (win_count / decided) * 100
        print(f"  Real Win Rate: {real_win_rate:.1f}%")

    log_to_api("SUCCESS", f"Price Verification: Verified {verified_count} signals ({win_count}W/{loss_count}L/{pending_count}P). API calls: {api_calls}")


if __name__ == "__main__":
    main()
