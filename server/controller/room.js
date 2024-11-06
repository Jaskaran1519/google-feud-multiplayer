import Room from "../model/room.js";

// make a room
export const makeRoom = async (req, res) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({ message: "Room name is required" });
  }

  try {
    const room = new Room({ roomName });
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: "Error creating room", error });
  }
};

// join a room
export const joinRoom = async (req, res) => {
  const { roomName, userId } = req.body;

  if (!roomName || !userId) {
    return res
      .status(400)
      .json({ message: "Room name and user ID are required" });
  }

  try {
    const room = await Room.findOne({ roomName });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if user is already in the room
    if (!room.participants.includes(userId)) {
      room.participants.push(userId); // Add user to participants
      await room.save();
    }

    res.status(200).json({ message: "Joined room successfully", room });
  } catch (error) {
    res.status(500).json({ message: "Error joining room", error });
  }
};
