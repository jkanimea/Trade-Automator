import sys
import os

# Add python directory to path so we can import the scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../python')))

from telegram_listener import parse_signal

def test_parse_s2t_signal():
    text = "🚀 BTC/USDT - BUY 🚀\nEntry: 65000\nSL: 64000\nTP 1: 66000\nTP 2: 67000"
    result = parse_signal(text)
    assert result is not None
    assert result["symbol"] == "BTC/USDT"
    assert result["direction"] == "BUY"
    assert result["entry"] == 65000.0
    assert result["stopLoss"] == 64000.0
    # The regex logic automatically includes the first TP and matches trailing ones
    assert result["takeProfits"] == [66000.0, 67000.0]

def test_parse_irshad_signal():
    text = "BTC Sell 65000\nSL @ 66000\nTP @ 64000"
    result = parse_signal(text)
    assert result is not None
    assert result["symbol"] == "BTC"
    assert result["direction"] == "SELL"
    assert result["entry"] == 65000.0
    assert result["stopLoss"] == 66000.0
    assert result["takeProfits"] == [64000.0]

def test_parse_generic_signal():
    text = "ETH Buy 3000\nStop Loss 2900\nTP 3100"
    result = parse_signal(text)
    assert result is not None
    assert result["symbol"] == "ETH"
    assert result["direction"] == "BUY"
    assert result["entry"] == 3000.0
    assert result["stopLoss"] == 2900.0
    assert result["takeProfits"] == [3100.0]

def test_parse_invalid_signal():
    text = "Hey guys, what do you think of BTC right now?"
    result = parse_signal(text)
    assert result is None
