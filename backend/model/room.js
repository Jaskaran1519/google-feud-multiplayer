import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: { type: String, required: true },
  participants: [{ type: String }], // Array of user IDs or usernames
  createdBy: { type: String, required: true }, // Room admin/creator
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }, // Field to track activity
  // Game settings (configured by room creator)
  totalRounds: { type: Number, default: 3 },
  roundDuration: { type: Number, default: 30 }, // in seconds
  livesPerPlayer: { type: Number, default: 3 },
});

const Room = mongoose.model("Room", roomSchema);

export default Room;
