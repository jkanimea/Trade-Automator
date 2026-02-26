import os
import re
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone

API_URL = os.getenv("API_URL", "http://localhost:5000/api")


def get_setting(key):
    env_val = os.getenv(key.upper(), "")
    if env_val:
        return env_val
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            for s in settings:
                if s.get("key") == key and s.get("value"):
                    return s["value"]
    except:
        pass
    return ""


def load_providers_config():
    try:
        req = urllib.request.Request(f"{API_URL}/settings?internal=true")
        with urllib.request.urlopen(req, timeout=5) as resp:
            settings = json.loads(resp.read().decode())
            for s in settings:
                if s.get("key") == "price_providers" and s.get("value"):
                    return json.loads(s["value"])
    except:
        pass
    return [{"id": "yfinance", "name": "Yahoo Finance", "apiKey": "", "requiresKey": False}]

PROVIDERS_CONFIG = load_providers_config()

def load_verification_interval():
    interval = get_setting("verification_interval")
    if interval in ("15m", "30m", "1h"):
        return interval
    return "1h"

CANDLE_INTERVAL = load_verification_interval()

YFINANCE_INTERVAL_MAP = {"15m": "15m", "30m": "30m", "1h": "1h"}
TWELVEDATA_INTERVAL_MAP = {"15m": "15min", "30m": "30min", "1h": "1h"}
FINNHUB_RESOLUTION_MAP = {"15m": "15", "30m": "30", "1h": "60"}

def get_provider_key(provider_id):
    for p in PROVIDERS_CONFIG:
        if p.get("id") == provider_id:
            return p.get("apiKey", "")
    env_map = {
        "finnhub": "FINNHUB_API_KEY",
        "twelvedata": "TWELVE_DATA_API_KEY",
        "twelve_data": "TWELVE_DATA_API_KEY",
    }
    return os.getenv(env_map.get(provider_id, ""), "")

TWELVE_DATA_KEY = get_provider_key("twelvedata") or get_provider_key("twelve_data") or os.getenv("TWELVE_DATA_API_KEY", "")
FINNHUB_KEY = get_provider_key("finnhub") or os.getenv("FINNHUB_API_KEY", "")

YFINANCE_SYMBOL_MAP = {
    "XAUUSD": "GC=F",
    "GOLD": "GC=F",
    "XAGUSD": "SI=F",
    "SILVER": "SI=F",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "USDCAD=X",
    "USDCHF": "USDCHF=X",
    "NZDUSD": "NZDUSD=X",
    "GBPJPY": "GBPJPY=X",
    "EURJPY": "EURJPY=X",
    "EURGBP": "EURGBP=X",
    "EURCHF": "EURCHF=X",
    "AUDCAD": "AUDCAD=X",
    "AUDJPY": "AUDJPY=X",
    "CADCHF": "CADCHF=X",
    "CADJPY": "CADJPY=X",
    "CHFJPY": "CHFJPY=X",
    "EURAUD": "EURAUD=X",
    "EURCAD": "EURCAD=X",
    "EURNZD": "EURNZD=X",
    "GBPAUD": "GBPAUD=X",
    "GBPCAD": "GBPCAD=X",
    "GBPCHF": "GBPCHF=X",
    "GBPNZD": "GBPNZD=X",
    "NZDJPY": "NZDJPY=X",
    "US30": "YM=F",
    "NAS100": "NQ=F",
    "SPX500": "ES=F",
    "SP500": "ES=F",
    "BTCUSD": "BTC-USD",
    "ETHUSD": "ETH-USD",
}

TWELVE_DATA_SYMBOL_MAP = {
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


def get_yfinance_symbol(symbol):
    upper = symbol.upper().replace("/", "")
    if upper in YFINANCE_SYMBOL_MAP:
        return YFINANCE_SYMBOL_MAP[upper]
    if len(upper) == 6 and upper.isalpha():
        return f"{upper}=X"
    return upper


def get_twelve_data_symbol(symbol):
    upper = symbol.upper().replace("/", "")
    if upper in TWELVE_DATA_SYMBOL_MAP:
        return TWELVE_DATA_SYMBOL_MAP[upper]
    if "/" in symbol:
        return symbol.upper()
    if len(upper) == 6:
        return f"{upper[:3]}/{upper[3:]}"
    return upper


def fetch_candles_yfinance(symbol, start_date, end_date):
    try:
        import yfinance as yf
        ticker_symbol = get_yfinance_symbol(symbol)
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = (end_date + timedelta(days=1)).strftime("%Y-%m-%d")
        yf_interval = YFINANCE_INTERVAL_MAP.get(CANDLE_INTERVAL, "1h")

        ticker = yf.Ticker(ticker_symbol)
        df = ticker.history(start=start_str, end=end_str, interval=yf_interval)

        if df is None or df.empty:
            print(f"    [yfinance] No data for {ticker_symbol}")
            return None

        candles = []
        for idx, row in df.iterrows():
            candles.append({
                "datetime": idx.strftime("%Y-%m-%d %H:%M"),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
            })

        candles.sort(key=lambda c: c["datetime"])
        if len(candles) > 0:
            print(f"    [yfinance] Got {len(candles)} candles for {ticker_symbol}")
            return candles
        return None

    except Exception as e:
        print(f"    [yfinance] Error: {e}")
        return None


twelve_data_calls = 0

def fetch_candles_twelvedata(symbol, start_date, end_date):
    global twelve_data_calls
    if not TWELVE_DATA_KEY:
        print(f"    [twelvedata] No API key configured, skipping")
        return None

    if twelve_data_calls >= 780:
        print(f"    [twelvedata] Daily limit approaching ({twelve_data_calls}/800), skipping")
        return None

    if twelve_data_calls > 0 and twelve_data_calls % 7 == 0:
        print(f"    [twelvedata] Rate limit pause (8/min)... waiting 65s")
        time.sleep(65)

    td_symbol = get_twelve_data_symbol(symbol)
    start_str = start_date.strftime("%Y-%m-%d %H:%M:%S")
    end_str = end_date.strftime("%Y-%m-%d %H:%M:%S")

    td_interval = TWELVEDATA_INTERVAL_MAP.get(CANDLE_INTERVAL, "1h")
    params = urllib.parse.urlencode({
        "symbol": td_symbol,
        "interval": td_interval,
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

        twelve_data_calls += 1

        if data.get("status") == "error":
            msg = data.get("message", "Unknown error")
            if "API credits" in msg or "rate" in msg.lower():
                print(f"    [twelvedata] Rate limited, waiting 60s...")
                time.sleep(60)
                req2 = urllib.request.Request(url)
                with urllib.request.urlopen(req2, timeout=15) as resp2:
                    data = json.loads(resp2.read().decode())
                twelve_data_calls += 1
                if data.get("status") == "error":
                    print(f"    [twelvedata] Still failing: {data.get('message')}")
                    return None
            else:
                print(f"    [twelvedata] API Error: {msg}")
                return None

        values = data.get("values", [])
        if not values:
            print(f"    [twelvedata] No data for {td_symbol}")
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
        print(f"    [twelvedata] Got {len(candles)} candles for {td_symbol}")
        return candles

    except Exception as e:
        print(f"    [twelvedata] Error: {e}")
        return None


def fetch_candles_finnhub(symbol, start_date, end_date):
    if not FINNHUB_KEY:
        print(f"    [finnhub] No API key configured, skipping")
        return None

    upper = symbol.upper().replace("/", "")
    if len(upper) == 6 and upper.isalpha():
        fh_symbol = f"OANDA:{upper[:3]}_{upper[3:]}"
    elif upper in ("XAUUSD", "GOLD"):
        fh_symbol = "OANDA:XAU_USD"
    elif upper in ("XAGUSD", "SILVER"):
        fh_symbol = "OANDA:XAG_USD"
    elif upper in ("US30",):
        fh_symbol = "FOREXCOM:DJI"
    elif upper in ("NAS100",):
        fh_symbol = "FOREXCOM:NSXUSD"
    elif upper in ("SPX500", "SP500"):
        fh_symbol = "FOREXCOM:SPXUSD"
    else:
        fh_symbol = upper

    from_ts = int(start_date.timestamp())
    to_ts = int(end_date.timestamp())

    fh_resolution = FINNHUB_RESOLUTION_MAP.get(CANDLE_INTERVAL, "60")
    params = urllib.parse.urlencode({
        "symbol": fh_symbol,
        "resolution": fh_resolution,
        "from": from_ts,
        "to": to_ts,
        "token": FINNHUB_KEY,
    })
    url = f"https://finnhub.io/api/v1/forex/candle?{params}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        if data.get("s") == "no_data" or not data.get("o"):
            print(f"    [finnhub] No data for {fh_symbol}")
            return None

        candles = []
        for i in range(len(data["o"])):
            ts = data["t"][i]
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            candles.append({
                "datetime": dt.strftime("%Y-%m-%d %H:%M"),
                "open": float(data["o"][i]),
                "high": float(data["h"][i]),
                "low": float(data["l"][i]),
                "close": float(data["c"][i]),
            })

        candles.sort(key=lambda c: c["datetime"])
        print(f"    [finnhub] Got {len(candles)} candles for {fh_symbol}")
        return candles

    except Exception as e:
        print(f"    [finnhub] Error: {e}")
        return None


BUILTIN_FETCHERS = {
    "yfinance": fetch_candles_yfinance,
    "finnhub": fetch_candles_finnhub,
    "twelvedata": fetch_candles_twelvedata,
    "twelve_data": fetch_candles_twelvedata,
}

def build_provider_chain():
    chain = []
    for p in PROVIDERS_CONFIG:
        pid = p.get("id", "")
        requires_key = p.get("requiresKey", False)
        api_key = p.get("apiKey", "")
        if requires_key and not api_key:
            print(f"  Skipping provider '{p.get('name', pid)}' — no API key configured")
            continue
        fetcher = BUILTIN_FETCHERS.get(pid)
        if fetcher:
            chain.append((pid, fetcher))
        else:
            print(f"  Skipping provider '{p.get('name', pid)}' — no built-in fetcher for '{pid}'")
    if not chain:
        chain.append(("yfinance", fetch_candles_yfinance))
        print("  No valid providers configured, falling back to yfinance")
    return chain

PROVIDERS = build_provider_chain()


def fetch_candles_with_fallback(symbol, start_date, end_date):
    for name, fetcher in PROVIDERS:
        candles = fetcher(symbol, start_date, end_date)
        if candles and len(candles) > 0:
            return candles, name
    return None, None


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
    available = []
    try:
        import yfinance
        available.append("yfinance (free, no key)")
    except ImportError:
        print("WARNING: yfinance not installed. Run: pip install yfinance")

    if FINNHUB_KEY:
        available.append("Finnhub")
    if TWELVE_DATA_KEY:
        available.append("Twelve Data")

    if not available:
        print("ERROR: No price data providers available.")
        print("Install yfinance (pip install yfinance) or set FINNHUB_API_KEY / TWELVE_DATA_API_KEY")
        return

    interval_label = {"15m": "15-minute", "30m": "30-minute", "1h": "1-hour"}.get(CANDLE_INTERVAL, "1-hour")
    print(f"Price providers available: {', '.join(available)}")
    print(f"Candle interval: {interval_label}")
    print(f"Fallback order: {' -> '.join(p[0] for p in PROVIDERS)}\n")

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
    log_to_api("INFO", f"Price Verification: Starting {len(signals_to_verify)} signals across {len(grouped)} symbols using {interval_label} candles (providers: {', '.join(available)})")

    verified_count = 0
    win_count = 0
    loss_count = 0
    pending_count = 0
    provider_stats = {}

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

            candles, provider_used = fetch_candles_with_fallback(symbol, fetch_start, fetch_end)

            if not candles:
                print(f"  All providers failed for {symbol}, skipping batch")
                continue

            if provider_used:
                provider_stats[provider_used] = provider_stats.get(provider_used, 0) + 1

            print(f"  Using data from: {provider_used}")

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

                result = update_signal_outcome(sig["id"], outcome, f"Price verified ({provider_used}): {reason}")
                if result:
                    verified_count += 1
                    if outcome == "WIN":
                        win_count += 1
                    elif outcome == "LOSS":
                        loss_count += 1
                    else:
                        pending_count += 1

            time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"VERIFICATION COMPLETE")
    print(f"{'='*60}")
    print(f"Total verified: {verified_count}")
    print(f"  Wins:    {win_count}")
    print(f"  Losses:  {loss_count}")
    print(f"  Pending: {pending_count}")
    print(f"\nProvider usage:")
    for prov, count in sorted(provider_stats.items(), key=lambda x: -x[1]):
        print(f"  {prov}: {count} API calls")
    if TWELVE_DATA_KEY:
        print(f"  Twelve Data credits used: {twelve_data_calls}")

    decided = win_count + loss_count
    if decided > 0:
        real_win_rate = (win_count / decided) * 100
        print(f"\n  Real Win Rate: {real_win_rate:.1f}%")

    log_to_api("SUCCESS", f"Price Verification: Verified {verified_count} signals ({win_count}W/{loss_count}L/{pending_count}P). Providers: {dict(provider_stats)}")


if __name__ == "__main__":
    main()
