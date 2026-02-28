import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSignalSchema, insertTradeSchema, insertSystemLogSchema, insertSettingSchema, insertChannelSignalSchema } from "@shared/schema";
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

      const signalData = parsed.data;

      // Duplicate prevention: check if a signal for the same symbol & direction exists in the last 2 hours
      const existingSignals = await storage.getSignals();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const isDuplicate = existingSignals.some(s =>
        s.symbol === signalData.symbol &&
        s.direction === signalData.direction &&
        new Date(s.timestamp) > twoHoursAgo
      );

      if (isDuplicate) {
        console.log(`Blocked duplicate signal for ${signalData.symbol} ${signalData.direction}`);
        return res.status(409).json({ error: "Duplicate signal detected within the last 2 hours" });
      }

      const signal = await storage.createSignal(signalData);
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

  // Channel Signals (analytics)
  app.get("/api/channel-signals", async (req, res) => {
    try {
      const channelId = req.query.channelId as string | undefined;
      const data = channelId
        ? await storage.getChannelSignalsByChannel(channelId)
        : await storage.getChannelSignals();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/channel-signals", async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.messageDate === "string") body.messageDate = new Date(body.messageDate);
      const parsed = insertChannelSignalSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromZodError(parsed.error).message });
      }
      const signal = await storage.createChannelSignal(parsed.data);
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/channel-signals/batch", async (req, res) => {
    try {
      const signals = req.body.signals;
      if (!Array.isArray(signals)) {
        return res.status(400).json({ error: "Expected { signals: [...] }" });
      }
      const results = [];
      for (const sig of signals) {
        const body = { ...sig };
        if (typeof body.messageDate === "string") body.messageDate = new Date(body.messageDate);
        const parsed = insertChannelSignalSchema.safeParse(body);
        if (parsed.success) {
          const created = await storage.createChannelSignal(parsed.data);
          results.push(created);
        }
      }
      res.json({ created: results.length, signals: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/channel-signals/:id/verify", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { outcome, verificationNote, takeProfits } = req.body;
      if (!outcome) {
        return res.status(400).json({ error: "outcome is required" });
      }
      const updated = await storage.updateChannelSignalOutcome(id, outcome, verificationNote || "", takeProfits);
      if (!updated) {
        return res.status(404).json({ error: "Signal not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/channel-signals/:channelId", async (req, res) => {
    try {
      await storage.clearChannelSignals(req.params.channelId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-signals", async (req, res) => {
    try {
      const { exec } = await import("child_process");
      exec("py python/verify_signals.py", { env: process.env, cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          console.error("Verification error:", stderr);
        }
        console.log("Verification output:", stdout);
      });
      res.json({ message: "Signal verification started with multi-provider fallback. Check the Logs page for progress." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/fetch-history", async (req, res) => {
    try {
      const channelId = req.body.channelId;
      const { exec } = await import("child_process");
      const cmd = channelId ? `py python/fetch_history.py --channelId "${channelId}"` : "py python/fetch_history.py";

      exec(cmd, { env: process.env, cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          console.error("Fetch history error:", stderr);
        }
        console.log("Fetch history output:", stdout);
      });
      res.json({ message: "History fetch started. Check the Logs page for progress." });
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
