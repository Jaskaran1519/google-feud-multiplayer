// game.ts (Game Model)
import mongoose from "mongoose";
import { GAME_CONFIG } from "../config/config.js";

const playerStateSchema = new mongoose.Schema({
  lives: { type: Number, default: GAME_CONFIG.LIVES_PER_PLAYER },
  score: { type: Number, default: 0 },
  attempts: [String], 
});

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  suggestions: { type: [String], required: true },
  keywords: { type: [String], required: true },
  answered: { type: Boolean, default: false },
});

const gameSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  round: { type: Number, default: 0 },
  totalRounds: { type: Number, default: GAME_CONFIG.TOTAL_ROUNDS },
  currentQuestion: questionSchema,
  playerStates: {
    type: Map,
    of: playerStateSchema,
  },
  startTime: Date,
  revealedOptions: {
    type: [String],
    default: [], 
  },
});

gameSchema.methods.addRevealedOption = function (option) {
  if (!this.revealedOptions.includes(option)) {
    this.revealedOptions.push(option);
  }
};

gameSchema.methods.hasRevealedOption = function (option) {
  return this.revealedOptions.includes(option);
};

gameSchema.methods.getRevealedOptionsCount = function () {
  return this.revealedOptions.length;
};

const Game = mongoose.model("Game", gameSchema);

export default Game;