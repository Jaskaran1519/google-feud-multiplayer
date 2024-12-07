import Game from "../model/game.js";
import { generateQuestion } from "../services/geminiService.js";
import { getAutocompleteSuggestions } from "../services/googleSearchService.js";
import { GAME_CONFIG } from "../config/config.js";

const ROUND_DURATION = GAME_CONFIG.ROUND_DURATION;
const TOTAL_ROUNDS = GAME_CONFIG.TOTAL_ROUNDS;

const roomTimers = new Map();

export async function sendNewQuestion(roomName, io) {
  console.log("Sending new question for room:", roomName);
  try {
    let game = await Game.findOne({ roomId: roomName });

    if (!game) {
      console.error("Game not found for room:", roomName);
      return;
    }

    const question = await generateQuestion();
    const suggestions = await getAutocompleteSuggestions(question);

    // Update game state (increment round, set current question) *before* emitting newQuestion
    game.round++;
    game.currentQuestion = { question, suggestions, answered: false };
    await game.save(); // Important: Save the updated game state immediately

    io.to(roomName).emit("newQuestion", {
      question,
      suggestions,
      round: game.round, // Send the *updated* round number
      totalRounds: TOTAL_ROUNDS,
    });

    if (game.round >= TOTAL_ROUNDS) {
      // Clear any existing timeout for this room
      if (roomTimers.has(roomName)) {
        clearTimeout(roomTimers.get(roomName));
        roomTimers.delete(roomName);
      }

      // Call handleGameCompletion directly after the round duration
      setTimeout(() => handleGameCompletion(roomName, io), ROUND_DURATION);
      return; // Don't set another timeout
    }

    // Set timeout for the next round (if not the last round)
    const timerId = setTimeout(() => {
      sendNewQuestion(roomName, io);
    }, ROUND_DURATION);
    roomTimers.set(roomName, timerId);
  } catch (error) {
    console.error("Error sending new question:", error);
    io.to(roomName).emit("gameError", {
      message: "Failed to load question",
    });
  }
}

export const handleGameCompletion = async (roomName, io) => {
  try {
    let game = await Game.findOne({ roomId: roomName });

    if (!game) {
      console.error("No game found to complete");
      return;
    }

    // Clear the timeout for this room
    if (roomTimers.has(roomName)) {
      clearTimeout(roomTimers.get(roomName));
      roomTimers.delete(roomName);
    }

    // Correctly collect final scores from playerStates
    const finalScores = {};
    if (game.playerStates) {
      for (const [username, playerState] of game.playerStates.entries()) {
        finalScores[username] = playerState.score;
      }
    }

    // Update game state
    game.isActive = false;
    await game.save();

    // Emit game over event with final scores
    io.to(roomName).emit("gameOver", {
      finalScores: finalScores,
      message: "Game completed!",
    });
  } catch (error) {
    console.error("Error in game completion:", error);
    io.to(roomName).emit("gameError", {
      message: "Error completing the game",
    });
  }
};
