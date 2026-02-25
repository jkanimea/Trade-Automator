import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalSchema, insertTradeSchema, insertSystemLogSchema, insertSettingSchema } from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";
import { fromZodError } from "zod-validation-error";

const wsClients = new Set<WebSocket>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    wsClients.add(ws);
    
    ws.on("close", () => {
      wsClients.delete(ws);
    });
  });

  // Helper to broadcast to all WS clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Signals routes
  app.get("/api/signals", async (req, res) => {
    try {
      const signals = await storage.getSignals();
      res.json(signals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/signals/:id", async (req, res) => {
    try {
      const signal = await storage.getSignal(parseInt(req.params.id));
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/signals", async (req, res) => {
    try {
      const parsed = insertSignalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromZodError(parsed.error).message });
      }
      const signal = await storage.createSignal(parsed.data);
      broadcast({ type: "signal", action: "created", data: signal });
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/signals/:id", async (req, res) => {
    try {
      const signal = await storage.updateSignal(parseInt(req.params.id), req.body);
      if (!signal) {
        return res.status(404).json({ error: "Signal not found" });
      }
      broadcast({ type: "signal", action: "updated", data: signal });
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Trades routes
  app.get("/api/trades", async (req, res) => {
    try {
      const trades = req.query.status === 'active' 
        ? await storage.getActiveTrades()
        : await storage.getTrades();
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const parsed = insertTradeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromZodError(parsed.error).message });
      }
      const trade = await storage.createTrade(parsed.data);
      broadcast({ type: "trade", action: "created", data: trade });
      res.json(trade);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/trades/:id", async (req, res) => {
    try {
      const trade = await storage.updateTrade(parseInt(req.params.id), req.body);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      broadcast({ type: "trade", action: "updated", data: trade });
      res.json(trade);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // System logs routes
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getSystemLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const parsed = insertSystemLogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromZodError(parsed.error).message });
      }
      const log = await storage.createSystemLog(parsed.data);
      broadcast({ type: "log", action: "created", data: log });
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const isInternal = req.query.internal === "true" && req.headers.host?.includes("localhost");
      const sensitiveKeys = ["telegram_bot_token", "telegram_api_hash"];
      const masked = settings.map(s => {
        if (sensitiveKeys.includes(s.key) && s.value && !isInternal) {
          return { ...s, value: s.value.slice(0, 4) + "••••••••" + s.value.slice(-4) };
        }
        return s;
      });
      res.json(masked);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const parsed = insertSettingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromZodError(parsed.error).message });
      }
      const setting = await storage.upsertSetting(parsed.data);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Python service status
  app.get("/api/status", async (req, res) => {
    res.json({
      telegram: "connected",
      ctrader: "connected",
      telegram_bot_token: !!process.env.TELEGRAM_BOT_TOKEN,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  return httpServer;
}
