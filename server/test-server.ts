import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const app = express();

app.get('/', (req, res) => {
  res.json({ message: "AlgoTrade Pro API is running" });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: "running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

const httpServer = createServer(app);

registerRoutes(httpServer, app).then(() => {
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
});