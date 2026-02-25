import type { Signal, Trade, SystemLog, Setting } from "@shared/schema";

const API_BASE = "/api";

// Signals
export async function getSignals(): Promise<Signal[]> {
  const response = await fetch(`${API_BASE}/signals`);
  if (!response.ok) throw new Error("Failed to fetch signals");
  return response.json();
}

export async function createSignal(signal: Partial<Signal>): Promise<Signal> {
  const response = await fetch(`${API_BASE}/signals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signal),
  });
  if (!response.ok) throw new Error("Failed to create signal");
  return response.json();
}

export async function updateSignal(id: number, signal: Partial<Signal>): Promise<Signal> {
  const response = await fetch(`${API_BASE}/signals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signal),
  });
  if (!response.ok) throw new Error("Failed to update signal");
  return response.json();
}

// Trades
export async function getTrades(activeOnly: boolean = false): Promise<Trade[]> {
  const url = activeOnly ? `${API_BASE}/trades?status=active` : `${API_BASE}/trades`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch trades");
  return response.json();
}

export async function createTrade(trade: Partial<Trade>): Promise<Trade> {
  const response = await fetch(`${API_BASE}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trade),
  });
  if (!response.ok) throw new Error("Failed to create trade");
  return response.json();
}

export async function updateTrade(id: number, trade: Partial<Trade>): Promise<Trade> {
  const response = await fetch(`${API_BASE}/trades/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trade),
  });
  if (!response.ok) throw new Error("Failed to update trade");
  return response.json();
}

// System Logs
export async function getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
  const response = await fetch(`${API_BASE}/logs?limit=${limit}`);
  if (!response.ok) throw new Error("Failed to fetch logs");
  return response.json();
}

export async function createSystemLog(log: Partial<SystemLog>): Promise<SystemLog> {
  const response = await fetch(`${API_BASE}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
  if (!response.ok) throw new Error("Failed to create log");
  return response.json();
}

// Settings
export async function getSettings(): Promise<Setting[]> {
  const response = await fetch(`${API_BASE}/settings`);
  if (!response.ok) throw new Error("Failed to fetch settings");
  return response.json();
}

export async function getSetting(key: string): Promise<Setting> {
  const response = await fetch(`${API_BASE}/settings/${key}`);
  if (!response.ok) throw new Error("Failed to fetch setting");
  return response.json();
}

export async function upsertSetting(setting: { key: string; value: string }): Promise<Setting> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(setting),
  });
  if (!response.ok) throw new Error("Failed to upsert setting");
  return response.json();
}

// Status
export async function getStatus(): Promise<any> {
  const response = await fetch(`${API_BASE}/status`);
  if (!response.ok) throw new Error("Failed to fetch status");
  return response.json();
}

// Channel Signals (analytics)
export async function getChannelSignals(channelId?: string): Promise<any[]> {
  const url = channelId 
    ? `${API_BASE}/channel-signals?channelId=${encodeURIComponent(channelId)}`
    : `${API_BASE}/channel-signals`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch channel signals");
  return response.json();
}
