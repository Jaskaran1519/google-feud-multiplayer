import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import roomRoutes from "./routes/room.js";
import messageRoutes from "./routes/message.js";
import { connectDatabase } from "./config/database.js";
import { initSocketHandlers } from "./lib/socketHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint for keep-alive ping
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
});

// Create HTTP and Socket servers
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Database connection
connectDatabase();

// Initialize socket handlers
initSocketHandlers(io);

// Keep-alive: Self-ping every 5 minutes to prevent Render free-tier cold starts
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

if (RENDER_URL) {
  setInterval(async () => {
    try {
      const response = await fetch(`${RENDER_URL}/api/ping`);
      const data = await response.json();
      console.log(`[Keep-Alive] Pinged at ${data.timestamp}`);
    } catch (error) {
      console.error("[Keep-Alive] Ping failed:", error.message);
    }
  }, PING_INTERVAL);
  console.log(`[Keep-Alive] Self-ping enabled every 5 minutes`);
} else {
  console.log("[Keep-Alive] RENDER_EXTERNAL_URL not set, self-ping disabled (local dev)");
}

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});