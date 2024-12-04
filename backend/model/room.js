import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: { type: String, required: true },
  participants: [{ type: String }], // Array of user IDs or usernames
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }, // Field to track activity
});

const Room = mongoose.model("Room", roomSchema);

export default Room;
