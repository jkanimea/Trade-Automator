import { 
  type Signal, type InsertSignal, 
  type Trade, type InsertTrade,
  type SystemLog, type InsertSystemLog,
  type Setting, type InsertSetting,
  type ChannelSignal, type InsertChannelSignal,
  signals, trades, systemLogs, settings, channelSignals
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Signals
  getSignals(): Promise<Signal[]>;
  getSignal(id: number): Promise<Signal | undefined>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  updateSignal(id: number, signal: Partial<InsertSignal>): Promise<Signal | undefined>;
  
  // Trades
  getTrades(): Promise<Trade[]>;
  getActiveTrades(): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined>;
  
  // System Logs
  getSystemLogs(limit?: number): Promise<SystemLog[]>;
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  
  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  getSettings(): Promise<Setting[]>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  // Channel Signals
  getChannelSignals(): Promise<ChannelSignal[]>;
  getChannelSignalsByChannel(channelId: string): Promise<ChannelSignal[]>;
  createChannelSignal(signal: InsertChannelSignal): Promise<ChannelSignal>;
  clearChannelSignals(channelId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // Signals
  async getSignals(): Promise<Signal[]> {
    return await db.select().from(signals).orderBy(desc(signals.timestamp));
  }

  async getSignal(id: number): Promise<Signal | undefined> {
    const result = await db.select().from(signals).where(eq(signals.id, id));
    return result[0];
  }

  async createSignal(signal: InsertSignal): Promise<Signal> {
    const result = await db.insert(signals).values(signal).returning();
    return result[0];
  }

  async updateSignal(id: number, signal: Partial<InsertSignal>): Promise<Signal | undefined> {
    const result = await db.update(signals).set(signal).where(eq(signals.id, id)).returning();
    return result[0];
  }

  // Trades
  async getTrades(): Promise<Trade[]> {
    return await db.select().from(trades).orderBy(desc(trades.openedAt));
  }

  async getActiveTrades(): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.status, 'OPEN')).orderBy(desc(trades.openedAt));
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const result = await db.select().from(trades).where(eq(trades.id, id));
    return result[0];
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const result = await db.insert(trades).values(trade).returning();
    return result[0];
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined> {
    const result = await db.update(trades).set(trade).where(eq(trades.id, id)).returning();
    return result[0];
  }

  // System Logs
  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    return await db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(limit);
  }

  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const result = await db.insert(systemLogs).values(log).returning();
    return result[0];
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key));
    return result[0];
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async upsertSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(setting.key);
    if (existing) {
      const result = await db.update(settings)
        .set({ value: setting.value, updatedAt: new Date() })
        .where(eq(settings.key, setting.key))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(settings).values(setting).returning();
      return result[0];
    }
  }

  // Channel Signals
  async getChannelSignals(): Promise<ChannelSignal[]> {
    return await db.select().from(channelSignals).orderBy(desc(channelSignals.messageDate));
  }

  async getChannelSignalsByChannel(channelId: string): Promise<ChannelSignal[]> {
    return await db.select().from(channelSignals)
      .where(eq(channelSignals.channelId, channelId))
      .orderBy(desc(channelSignals.messageDate));
  }

  async createChannelSignal(signal: InsertChannelSignal): Promise<ChannelSignal> {
    const existing = await db.select().from(channelSignals)
      .where(and(
        eq(channelSignals.channelId, signal.channelId),
        eq(channelSignals.messageId, signal.messageId)
      ));
    if (existing.length > 0) return existing[0];
    const result = await db.insert(channelSignals).values(signal).returning();
    return result[0];
  }

  async clearChannelSignals(channelId: string): Promise<void> {
    await db.delete(channelSignals).where(eq(channelSignals.channelId, channelId));
  }
}

export const storage = new DbStorage();
