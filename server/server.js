import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// HTTP Server and Socket.io setup
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust this based on your client setup
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Example event listener
  socket.on("message", (data) => {
    console.log("Message received:", data);
    io.emit("message", data); // Broadcast message to all connected clients
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
