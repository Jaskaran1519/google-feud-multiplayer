import Room from "../model/room.js";
import { ROOMNAME_SIZE } from "../config/config.js";

// Helper function to generate a random 6-letter string
const generateRoomName = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let roomName = "";
  for (let i = 0; i < ROOMNAME_SIZE; i++) {
    roomName += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return roomName;
};

// make a room
export const makeRoom = async (req, res) => {
  const { userName } = req.body;

  if (!userName) {
    return res
      .status(400)
      .json({ message: "User name is required to create a room" });
  }

  try {
    let roomName;
    let roomExists;

    // Ensure unique room name
    do {
      roomName = generateRoomName();
      roomExists = await Room.findOne({ roomName });
    } while (roomExists);

    const room = new Room({ roomName, participants: [userName] }); // Add userName to participants
    await room.save();

    res.status(201).json({ roomName });
  } catch (error) {
    res.status(500).json({ message: "Error creating room", error });
  }
};
// join a room
export const joinRoom = async (req, res) => {
  const { roomName, userName } = req.body;

  if (!roomName || !userName) {
    return res
      .status(400)
      .json({ message: "Room name and user name are required" });
  }

  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if the user is already in the room
    if (!room.participants.includes(userName)) {
      room.participants.push(userName); // Add user to participants
      await room.save();
    }

    res.status(200).json({ message: "Joined room successfully", room });
  } catch (error) {
    res.status(500).json({ message: "Error joining room", error });
  }
};

export const getPlayersInRoom = async (req, res) => {
  const { roomName } = req.params;

  if (!roomName) {
    return res
      .status(400)
      .json({ message: "Room name is required to get players" });
  }

  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json({ players: room.participants });
  } catch (error) {
    res.status(500).json({ message: "Error getting players in room", error });
  }
};
