import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, real, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  telegramMessageId: text("telegram_message_id"),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  entry: real("entry").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfits: real("take_profits").array().notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("PENDING"),
  pnl: real("pnl"),
  ctraderTicketId: integer("ctrader_ticket_id"),
});

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  timestamp: true,
});

export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signals.$inferSelect;

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").references(() => signals.id),
  ticketId: integer("ticket_id").notNull(),
  symbol: text("symbol").notNull(),
  volume: real("volume").notNull(),
  direction: text("direction").notNull(),
  entryPrice: real("entry_price").notNull(),
  currentPrice: real("current_price").notNull(),
  sl: real("sl").notNull(),
  tp: real("tp").notNull(),
  profit: real("profit").notNull(),
  status: text("status").notNull().default("OPEN"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  openedAt: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export const channelSignals = pgTable("channel_signals", {
  id: serial("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  messageId: text("message_id").notNull(),
  messageDate: timestamp("message_date").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  entry: real("entry").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfits: real("take_profits").array().notNull(),
  outcome: text("outcome").notNull().default("PENDING"),
  verificationNote: text("verification_note"),
  rawMessage: text("raw_message"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const insertChannelSignalSchema = createInsertSchema(channelSignals).omit({
  id: true,
  analyzedAt: true,
});

export type InsertChannelSignal = z.infer<typeof insertChannelSignalSchema>;
export type ChannelSignal = typeof channelSignals.$inferSelect;
