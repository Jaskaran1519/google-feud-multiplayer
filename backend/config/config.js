import dotenv from "dotenv";

dotenv.config();

export const ROOMNAME_SIZE = 6;

export const INACTIVE_TIME = 30 * 60 * 1000;

// Game Configuration
export const GAME_CONFIG = {
  TOTAL_ROUNDS: 3,
  ROUND_DURATION: 20000, // 30 seconds per round
  LIVES_PER_PLAYER: 3,
  POINTS_PER_ANSWER: {
    FIRST: 100, // First suggestion
    SECOND: 90, // Second suggestion
    THIRD: 80, // and so on...
    FOURTH: 70,
    FIFTH: 60,
    SIXTH: 50,
    SEVENTH: 40,
    EIGHTH: 30,
    NINTH: 20,
    TENTH: 10,
  },
  MAX_OPTIONS: 10, // Number of autocomplete suggestions to show
};

// Google Custom Search API Configuration
export const GOOGLE_CONFIG = {
  API_KEY: process.env.GOOGLE_SEARCH_KEY,
  SEARCH_ENGINE_ID: process.env.SEARCH_ENGINE_ID,
};
