# AlgoTrade Pro - Setup Guide

## Overview

AlgoTrade Pro is a complete trading automation system that connects Telegram signal channels with the cTrader trading platform. The system consists of three main components:

1. **Web Dashboard** (React + Node.js) - Real-time monitoring and control
2. **Telegram Listener** (Python) - Monitors Telegram channels for trading signals
3. **cTrader Bridge** (Python) - Executes trades via cTrader Open API

## Quick Start

### 1. Install Dependencies

All Node.js and Python dependencies are already installed.

### 2. Database Setup

The PostgreSQL database is already created and connected. To populate it with test data:

```bash
tsx scripts/seed_data.ts
```

### 3. Start the Web Application

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5000`

## Python Services Setup

### Required Environment Variables

Before running the Python services, you need to configure the following secrets:

#### Telegram Bot Setup

1. **Create a Telegram Bot**:
   - Message @BotFather on Telegram
   - Send `/newbot` and follow the instructions
   - Copy the bot token

2. **Add Bot to Your Signal Channel**:
   - Add your bot as an administrator to the Telegram channel where signals are posted
   - The bot needs permission to read messages

3. **Set Environment Variable**:
   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

#### cTrader API Setup

1. **Register for cTrader Open API**:
   - Visit https://openapi.ctrader.com/
   - Create an account and register an application
   - Note your Client ID and Client Secret

2. **Get Account ID**:
   - Log into your cTrader account
   - Find your account ID in the account settings

3. **Set Environment Variables**:
   ```bash
   CTRADER_CLIENT_ID=your_client_id
   CTRADER_CLIENT_SECRET=your_client_secret
   CTRADER_ACCOUNT_ID=your_account_id
   ```

### Running the Python Services

#### Option 1: Run Both Services Together

```bash
# Terminal 1: Start Telegram Listener
python python/telegram_listener.py

# Terminal 2: Start cTrader Bridge
python python/ctrader_client.py
```

#### Option 2: Test Without Real Trading

If you want to test the system without connecting to real trading:

1. Only run the Telegram listener:
   ```bash
   python python/telegram_listener.py
   ```

2. Signals will be parsed and stored in the database, but no trades will be executed

## How It Works

### Signal Flow

1. **Telegram Channel** posts a signal like:
   ```
   🚀AUDCAD - BUY🚀
   Entry: 0.91169
   Stopp-Loss: 0.90869
   Take-Profit 1: 0.91369
   Take-Profit 2: 0.91569
   Take-Profit 3: 0.91769
   ```

2. **Telegram Listener** (Python):
   - Monitors the channel for new messages
   - Parses the signal using regex pattern matching
   - Sends parsed signal to the Node.js API

3. **Database** (PostgreSQL):
   - Stores the signal with status "PENDING"
   - Logs all system events

4. **cTrader Bridge** (Python):
   - Polls the database every 5 seconds for PENDING signals
   - Calculates lot size based on 2% risk management
   - Places market order via cTrader Open API
   - Updates signal status to "ACTIVE"
   - Creates trade record in database

5. **Web Dashboard** (React):
   - Displays signals, trades, and logs in real-time
   - Updates automatically via WebSocket connection

## Features

### Risk Management
- Default 2% risk per trade
- Configurable in Settings page
- Automatic lot size calculation based on account balance
- Stop loss distance calculation

### Real-Time Updates
- WebSocket connection for instant updates
- Live P&L tracking
- Real-time system logs

### Multi-Take-Profit Support
- Supports up to 3 take-profit levels
- First TP automatically set when placing order
- Manual adjustment available in cTrader

## Testing the System

### 1. Test Signal Parsing

Send a test message to your Telegram channel in this format:
```
🚀EURUSD - SELL🚀
Entry: 1.0850
Stopp-Loss: 1.0890
Take-Profit 1: 1.0810
Take-Profit 2: 1.0780
```

### 2. Monitor Logs

Check the System Logs page in the dashboard to see:
- Signal detection confirmation
- Parsing success
- Risk calculation
- Order placement (if cTrader is connected)

### 3. View Dashboard

- **Dashboard**: Overview of performance and active positions
- **Signals**: History of all received signals
- **Active Trades**: Real-time position monitor
- **System Logs**: Complete system activity log
- **Settings**: Configure API credentials and risk parameters

## Troubleshooting

### Telegram Listener Not Receiving Messages

- Verify the bot token is correct
- Ensure the bot is added to the channel as an administrator
- Check that the bot has permission to read messages

### cTrader API Connection Failed

- Verify Client ID and Client Secret
- Check that your cTrader account is active
- Ensure you have sufficient balance for trading

### No Trades Being Placed

- Check that both Python services are running
- Verify signals are being created in the database (check Signals page)
- Review system logs for error messages

## Security Notes

- Never commit API keys or bot tokens to version control
- Use Replit Secrets to store sensitive credentials
- Test with a demo cTrader account before using real money
- Start with small lot sizes and low risk percentages

## Support

For issues or questions:
- Check the System Logs page for error messages
- Review the database for signal and trade records
- Ensure all environment variables are properly set
