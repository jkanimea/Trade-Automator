import { LucideIcon, TrendingUp, TrendingDown, Activity, DollarSign, ShieldAlert, Zap, Clock } from "lucide-react";

export interface Signal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  timestamp: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'STOPPED_OUT';
  pnl?: number;
}

export interface Trade {
  id: string;
  ticketId: number;
  symbol: string;
  volume: number;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  profit: number;
  status: 'OPEN' | 'CLOSED';
}

export const mockSignals: Signal[] = [
  {
    id: 'sig_1',
    symbol: 'AUDCAD',
    direction: 'BUY',
    entry: 0.91169,
    stopLoss: 0.90869,
    takeProfits: [0.91369, 0.91569, 0.91769],
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    status: 'PENDING'
  },
  {
    id: 'sig_2',
    symbol: 'EURUSD',
    direction: 'SELL',
    entry: 1.0850,
    stopLoss: 1.0890,
    takeProfits: [1.0810, 1.0780],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'ACTIVE',
    pnl: 124.50
  },
  {
    id: 'sig_3',
    symbol: 'GBPJPY',
    direction: 'BUY',
    entry: 188.40,
    stopLoss: 187.90,
    takeProfits: [189.00, 189.50],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    status: 'COMPLETED',
    pnl: 450.20
  }
];

export const mockTrades: Trade[] = [
  {
    id: 'trd_1',
    ticketId: 4459201,
    symbol: 'EURUSD',
    volume: 0.1,
    direction: 'SELL',
    entryPrice: 1.0850,
    currentPrice: 1.0838,
    sl: 1.0890,
    tp: 1.0810,
    profit: 124.50,
    status: 'OPEN'
  }
];

export const systemLogs = [
  { time: '10:30:05', level: 'INFO', message: 'Telegram Listener: Connected to channel "Forex VIP Signals"' },
  { time: '10:30:06', level: 'INFO', message: 'Signal Parser: Detected pattern "AUDCAD - BUY"' },
  { time: '10:30:06', level: 'INFO', message: 'Risk Manager: Account Balance $10,500. Calculating 2% risk...' },
  { time: '10:30:07', level: 'SUCCESS', message: 'cTrader API: Order placed successfully. Ticket #4459202' },
  { time: '10:31:00', level: 'INFO', message: 'Position Monitor: Trailing stop updated for EURUSD' },
];

export const performanceData = [
  { name: 'Mon', equity: 10000 },
  { name: 'Tue', equity: 10150 },
  { name: 'Wed', equity: 10080 },
  { name: 'Thu', equity: 10320 },
  { name: 'Fri', equity: 10544 },
];
