import express from "express";
import { saveMessage, getMessagesByRoom } from "../controller/message.js";

const router = express.Router();

router.post("/", saveMessage); // Route for saving messages
router.get("/:roomId", getMessagesByRoom); // Route for getting messages by room

export default router;
