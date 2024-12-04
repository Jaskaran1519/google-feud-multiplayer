import Room from "../model/room.js";
import { INACTIVE_TIME } from "../config/config.js";

const cleanUpInactiveRooms = async () => {
  const expirationTime = 30 * 60 * 1000; // 30 minutes in milliseconds
  const now = new Date();

  try {
    const result = await Room.deleteMany({
      lastActive: { $lt: new Date(now - expirationTime) },
    });
    console.log(`${result.deletedCount} inactive rooms deleted.`);
  } catch (error) {
    console.error("Error during room cleanup:", error);
  }
};

setInterval(cleanUpInactiveRooms, INACTIVE_TIME); // Runs every x minutes

export default cleanUpInactiveRooms;
