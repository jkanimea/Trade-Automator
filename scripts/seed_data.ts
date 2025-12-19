import { db } from "../server/db";
import { signals, trades, systemLogs } from "../shared/schema";

async function seedData() {
  console.log("Seeding database with test data...");

  // Clear existing data
  await db.delete(trades);
  await db.delete(signals);
  await db.delete(systemLogs);

  // Add sample signals
  const signal1 = await db.insert(signals).values({
    symbol: "AUDCAD",
    direction: "BUY",
    entry: 0.91169,
    stopLoss: 0.90869,
    takeProfits: [0.91369, 0.91569, 0.91769],
    status: "PENDING",
    telegramMessageId: "msg_001",
  }).returning();

  const signal2 = await db.insert(signals).values({
    symbol: "EURUSD",
    direction: "SELL",
    entry: 1.0850,
    stopLoss: 1.0890,
    takeProfits: [1.0810, 1.0780],
    status: "ACTIVE",
    pnl: 124.50,
    ctraderTicketId: 4459201,
  }).returning();

  const signal3 = await db.insert(signals).values({
    symbol: "GBPJPY",
    direction: "BUY",
    entry: 188.40,
    stopLoss: 187.90,
    takeProfits: [189.00, 189.50],
    status: "COMPLETED",
    pnl: 450.20,
    ctraderTicketId: 4459200,
  }).returning();

  // Add sample trades
  await db.insert(trades).values({
    signalId: signal2[0].id,
    ticketId: 4459201,
    symbol: "EURUSD",
    volume: 0.1,
    direction: "SELL",
    entryPrice: 1.0850,
    currentPrice: 1.0838,
    sl: 1.0890,
    tp: 1.0810,
    profit: 124.50,
    status: "OPEN",
  });

  // Add system logs
  const logs = [
    { level: "INFO", message: "Telegram Listener: Connected to channel \"Forex VIP Signals\"" },
    { level: "INFO", message: "Signal Parser: Detected pattern \"AUDCAD - BUY\"" },
    { level: "INFO", message: "Risk Manager: Account Balance $10,500. Calculating 2% risk..." },
    { level: "SUCCESS", message: "cTrader API: Order placed successfully. Ticket #4459202" },
    { level: "INFO", message: "Position Monitor: Trailing stop updated for EURUSD" },
  ];

  for (const log of logs) {
    await db.insert(systemLogs).values(log);
  }

  console.log("✅ Database seeded successfully!");
  console.log(`  - ${3} signals created`);
  console.log(`  - ${1} trade created`);
  console.log(`  - ${logs.length} system logs created`);

  process.exit(0);
}

seedData().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
