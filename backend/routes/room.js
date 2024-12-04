import express from "express";
import { makeRoom, joinRoom, getPlayersInRoom } from "../controller/room.js";

const router = express.Router();

// Route to create a new room
router.post("/create", makeRoom);

// Route to join an existing room
router.post("/join", joinRoom);

//Routeto get the players in the room
router.get("/players/:roomName", getPlayersInRoom)

export default router;
