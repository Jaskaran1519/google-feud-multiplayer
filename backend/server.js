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

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});