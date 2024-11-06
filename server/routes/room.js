import express from "express";
import { makeRoom, joinRoom } from "../controller/room.js";

const router = express.Router();

// Route to create a new room
router.post("/create", makeRoom);

// Route to join an existing room
router.post("/join", joinRoom);

export default router;
