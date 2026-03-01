import express from "express";

const app = express();
const port = 5000;

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});