# Proposed Feature Improvements for TradeAutomate

Based on my review of the codebase, recent commits, and the architecture combining a Node.js/React web dashboard with Python services (Telegram signal parsing & cTrader execution), here are several high-impact functionalities you could add to the system:

## 1. Advanced Risk & Trade Management
Currently, the system uses a flat 2% risk and supports multiple Take-Profits.
*   **Trailing Stop-Loss**: Automatically trail the stop loss behind the current price once the trade hits a certain profit threshold.
*   **Breakeven on TP1**: Automatically move the Stop-Loss to the entry price once "Take-Profit 1" is hit. This guarantees a risk-free trade for the remaining positions.
*   **Daily Drawdown Limits**: Pause trading automatically if the account loses a certain percentage of its balance in a single day, protecting the account during highly volatile or losing days.

## 2. Dashboard Analytics & Charting
The current dashboard displays signals and active trades, but can be expanded into a full analytical suite.
*   **Performance Metrics**: Calculate and display win-rate, average risk-to-reward ratio, and profit factor over time.
*   **Integrated Charting**: Embed [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) in the dashboard to visually display the signal's entry, SL, and TP levels directly on the price chart.
*   **Detailed Trade History**: Allow exporting trade history to CSV for separate analysis.

## 3. Enhanced Signal Processing
*   **AI/LLM-Assisted Parsing**: Currently, signals are parsed via regex. You could pass the message to a lightweight LLM (like OpenAI or Anthropic API) to reliably extract Entry, SL, and TPs even if the Telegram channel changes their formatting unexpectedly.
*   **Duplicate Signal Prevention**: Detect if a signal for the same asset at the same price was already parsed recently to avoid double-entering trades.

## 4. Notifications & Alerts
*   **Execution Alerts Bot**: Create a separate Telegram Bot (or Discord Webhook) that messages *you* privately whenever a signal is successfully executed on cTrader, or when a TP/SL is hit. This keeps you informed without needing to check the web dashboard constantly.

## 5. Multi-Account Support (Copy Trading)
*   **Account Management**: Allow connecting multiple cTrader API credentials in the Settings page.
*   **Trade Replication**: When a signal arrives, calculate the risk and place the order across *all* connected accounts simultaneously, effectively turning the tool into a personal copy-trading terminal.

---

> [!TIP]
> **Next Steps:** If any of these stand out to you, let me know! I can write up a detailed implementation plan and begin adding the feature to your codebase.
