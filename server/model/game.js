import mongoose from "mongoose";
import { GAME_CONFIG } from '../config/config.js';

const playerStateSchema = new mongoose.Schema({
  lives: { type: Number, default: GAME_CONFIG.LIVES_PER_PLAYER },
  score: { type: Number, default: 0 },
  attempts: [String] // Store previous attempts for this question
});

const gameSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  round: { type: Number, default: 0 },
  totalRounds: { type: Number, default: GAME_CONFIG.TOTAL_ROUNDS },
  currentQuestion: {
    question: String,
    suggestions: [String],
    answered: { type: Boolean, default: false }
  },
  playerStates: {
    type: Map,
    of: playerStateSchema
  },
  startTime: Date
});

export default mongoose.model("Game", gameSchema);