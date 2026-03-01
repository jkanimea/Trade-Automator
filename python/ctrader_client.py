import os
import asyncio
import aiohttp
from typing import Optional
from datetime import datetime, timedelta
from notifier import send_alert

API_URL = os.getenv("API_URL", "http://localhost:5000/api")
CTRADER_API_BASE = "https://api.ctrader.com"

class CTraderClient:
    def __init__(self):
        self.api_url = os.getenv("API_URL", "http://localhost:5000/api")
        self.client_id = os.getenv("CTRADER_CLIENT_ID")
        self.client_secret = os.getenv("CTRADER_CLIENT_SECRET")
        self.account_id = os.getenv("CTRADER_ACCOUNT_ID")
        self.access_token = None
        self.token_expires_at = None
        self._settings = None
        
    async def get_settings(self):
        """Fetch settings from the dashboard API"""
        if self._settings:
            return self._settings
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_url}/settings?internal=true") as response:
                    if response.status == 200:
                        data = await response.json()
                        self._settings = {s["key"]: s["value"] for s in data if s.get("key") and s.get("value")}
                        return self._settings
        except Exception as e:
            print(f"Failed to fetch settings from API: {e}")
        return {}

    async def log_to_api(self, level: str, message: str, metadata: dict = None):
        """Send log to Node.js API"""
        try:
            async with aiohttp.ClientSession() as session:
                await session.post(f"{self.api_url}/logs", json={
                    "level": level,
                    "message": message,
                    "metadata": metadata
                })
        except Exception as e:
            print(f"Failed to log to API: {e}")
    
    async def authenticate(self):
        """OAuth2 authentication with cTrader"""
        settings = await self.get_settings()
        
        # Use env vars first, then dashboard settings
        client_id = self.client_id or settings.get("ctrader_client_id")
        client_secret = self.client_secret or settings.get("ctrader_client_secret")
        
        if not client_id or not client_secret:
            await self.log_to_api("ERROR", "cTrader credentials not configured. Set them in .env or Settings.")
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret
                }
                
                async with session.post(f"{CTRADER_API_BASE}/oauth2/token", data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.access_token = result["access_token"]
                        expires_in = result.get("expires_in", 3600)
                        self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
                        await self.log_to_api("SUCCESS", "cTrader API: Authentication successful")
                        return True
                    else:
                        error = await response.text()
                        await self.log_to_api("ERROR", f"cTrader API: Authentication failed - {error}")
                        return False
        except Exception as e:
            await self.log_to_api("ERROR", f"cTrader API: Authentication error - {str(e)}")
            return False
    
    async def ensure_authenticated(self):
        """Ensure we have a valid access token"""
        if not self.access_token or (self.token_expires_at and datetime.now() >= self.token_expires_at):
            return await self.authenticate()
        return True
    
    async def get_account_info(self):
        """Get account balance and information"""
        if not await self.ensure_authenticated():
            return None
        try:
            settings = await self.get_settings()
            account_id = self.account_id or settings.get("ctrader_account_id")
            client_id = self.client_id or settings.get("ctrader_client_id")
            
            if not account_id:
                await self.log_to_api("ERROR", "cTrader Account ID not configured")
                return None

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Client-Id": client_id
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{CTRADER_API_BASE}/api/v1/accounts/{account_id}",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        error = await response.text()
                        await self.log_to_api("ERROR", f"cTrader API: Failed to get account info - {error}")
                        return None
        except Exception as e:
            await self.log_to_api("ERROR", f"cTrader API: Error getting account info - {str(e)}")
            return None
    
    async def calculate_lot_size(self, signal: dict, risk_percent: float = 2.0):
        """Calculate lot size based on risk management"""
        account_info = await self.get_account_info()
        if not account_info:
            await self.log_to_api("WARNING", "Risk Manager: Unable to get account balance, using default lot size")
            return 0.01
        
        balance = account_info.get("balance", 10000)
        risk_amount = balance * (risk_percent / 100)
        
        # Calculate pip difference for risk
        pip_diff = abs(signal["entry"] - signal["stopLoss"])
        
        # Simple lot calculation (this would need to be refined per symbol)
        if pip_diff > 0:
            lot_size = round(risk_amount / (pip_diff * 1000), 2)
            lot_size = max(0.01, min(lot_size, 1.0))  # Clamp between 0.01 and 1.0
        else:
            lot_size = 0.01
        
        await self.log_to_api("INFO", f"Risk Manager: Account Balance ${balance:.2f}. Calculating {risk_percent}% risk = ${risk_amount:.2f}, Lot size: {lot_size}")
        return lot_size
    
    async def place_market_order(self, signal: dict):
        """Place a market order on cTrader"""
        if not await self.ensure_authenticated():
            await self.log_to_api("ERROR", "cTrader API: Cannot place order - not authenticated")
            return None
        
        # Calculate lot size
        lot_size = await self.calculate_lot_size(signal)
        
        try:
            settings = await self.get_settings()
            account_id = self.account_id or settings.get("ctrader_account_id")
            client_id = self.client_id or settings.get("ctrader_client_id")

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Client-Id": client_id,
                "Content-Type": "application/json"
            }
            
            # Prepare order payload
            order_data = {
                "accountId": account_id,
                "symbol": signal["symbol"],
                "tradeSide": signal["direction"],
                "volume": int(lot_size * 100000),  # Convert to micro lots
                "stopLoss": signal["stopLoss"],
                "takeProfit": signal["takeProfits"][0] if signal["takeProfits"] else None
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{CTRADER_API_BASE}/api/v1/accounts/{self.account_id}/orders",
                    headers=headers,
                    json=order_data
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        ticket_id = result.get("orderId", result.get("ticketId", 0))
                        
                        await self.log_to_api("SUCCESS", f"cTrader API: Order placed successfully. Ticket #{ticket_id}")
                        
                        # Create trade record in database
                        trade_data = {
                            "ticketId": ticket_id,
                            "symbol": signal["symbol"],
                            "volume": lot_size,
                            "direction": signal["direction"],
                            "entryPrice": signal["entry"],
                            "currentPrice": signal["entry"],
                            "sl": signal["stopLoss"],
                            "tp": signal["takeProfits"][0] if signal["takeProfits"] else signal["entry"],
                            "profit": 0.0,
                            "status": "OPEN"
                        }
                        
                        async with aiohttp.ClientSession() as api_session:
                            await api_session.post(f"{API_URL}/trades", json=trade_data)
                        
                        asyncio.create_task(send_alert(
                            f"⚡ <b>Trade Executed!</b>\n\n"
                            f"<b>Symbol:</b> {signal['symbol']}\n"
                            f"<b>Direction:</b> {signal['direction']}\n"
                            f"<b>Lot Size:</b> {lot_size}\n"
                            f"<b>Entry Price:</b> {signal['entry']}\n"
                            f"<b>Ticket ID:</b> #{ticket_id}"
                        ))
                        
                        return result
                    else:
                        error = await response.text()
                        await self.log_to_api("ERROR", f"cTrader API: Failed to place order - {error}")
                        asyncio.create_task(send_alert(
                            f"❌ <b>Execution Failed</b>\n\n"
                            f"<b>Symbol:</b> {signal['symbol']} ({signal['direction']})\n"
                            f"<b>Reason:</b> {error}"
                        ))
                        return None
        except Exception as e:
            await self.log_to_api("ERROR", f"cTrader API: Error placing order - {str(e)}")
            asyncio.create_task(send_alert(
                f"❌ <b>Execution Error</b>\n\n"
                f"<b>Symbol:</b> {signal['symbol']} ({signal['direction']})\n"
                f"<b>Exception:</b> {str(e)}"
            ))
            return None

async def monitor_signals():
    """Monitor for new signals and execute trades"""
    client = CTraderClient()
    
    await client.log_to_api("INFO", "cTrader Trade Monitor: Starting...")
    
    # Authenticate on startup
    if await client.authenticate():
        await client.log_to_api("INFO", "cTrader Trade Monitor: Ready to execute trades")
    
    processed_signals = set()
    
    while True:
        try:
            # Fetch pending signals
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{client.api_url}/signals") as response:
                    if response.status == 200:
                        signals = await response.json()
                        
                        for signal in signals:
                            if signal["status"] == "PENDING" and signal["id"] not in processed_signals:
                                await client.log_to_api("INFO", f"Processing signal: {signal['symbol']} {signal['direction']}")
                                
                                # Place order
                                result = await client.place_market_order(signal)
                                
                                if result:
                                    # Update signal status
                                    await session.patch(
                                        f"{client.api_url}/signals/{signal['id']}",
                                        json={
                                            "status": "ACTIVE",
                                            "ctraderTicketId": result.get("orderId", result.get("ticketId"))
                                        }
                                    )
                                    processed_signals.add(signal["id"])
        except Exception as e:
            await client.log_to_api("ERROR", f"Trade Monitor: Error - {str(e)}")
        
        # Poll every 5 seconds
        await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(monitor_signals())
