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

    // Clear any existing timer for this room
    clearRoomTimer(roomName);

    // Increment round or initialize
    if (!game.round) {
      game.round = 1;
    } else {
      game.round++;
    }

    // Check if game should end
    if (game.round > GAME_CONFIG.TOTAL_ROUNDS) {
      await handleGameCompletion(roomName, io);
      return;
    }

    // Initialize player states for first round
    if (game.round === 1) {
      game.playerStates = new Map();

      // Get players in the room
      const sockets = await io.in(roomName).fetchSockets();
      const playersInRoom = sockets
        .map((socket) => socket.data.username)
        .filter((username) => username !== undefined);

      playersInRoom.forEach((username) => {
        if (username) {
          game.playerStates.set(username, {
            lives: GAME_CONFIG.LIVES_PER_PLAYER,
            score: 0,
            attempts: [],
          });
        }
      });
    }

    // Ensure all players have full lives at the start of each round
    game.playerStates.forEach((playerState) => {
      playerState.lives = GAME_CONFIG.LIVES_PER_PLAYER;
    });

    // Generate question and suggestions
    const question = await generateQuestion();
    const suggestions = await getAutocompleteSuggestions(question);

    // Extract keywords from suggestions
    const keywords = suggestions.map((suggestion) => {
      // Create a shortened question by removing the last 3 characters
      const shortenedQuestion = question.slice(0, -3);

      // Remove the shortened question from the beginning of each suggestion
      const keyword = suggestion
        .toLowerCase()
        .replace(new RegExp(`^${shortenedQuestion.toLowerCase()}\\s*`, "i"), "")
        .trim();
      return keyword;
    });

    // Update game state
    game.currentQuestion = {
      question,
      suggestions,
      keywords,
      answered: false,
    };
    game.revealedOptions = []; // Reset revealed options
    game.isActive = true;

    game.markModified("playerStates");
    await game.save();

    // Emit comprehensive game state update
    io.to(roomName).emit("gameStateUpdate", {
      round: game.round,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      isActive: true,
      currentQuestion: {
        question,
        suggestions,
        keywords,
      },
      revealedOptions: [],
      playerStates: Array.from(game.playerStates.entries()).map(
        ([username, state]) => ({
          username,
          lives: state.lives,
          score: state.score,
        })
      ),
    });

    // Emit new question details
    io.to(roomName).emit("newQuestion", {
      question,
      suggestions,
      round: game.round,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
    });

    const timerId = setTimeout(async () => {
      try {
        let updatedGame = await Game.findOne({ roomId: roomName });

        if (!updatedGame || !updatedGame.isActive) return;

        console.log("Timer expired for room:", roomName);
        console.log("Current Game State:", {
          round: updatedGame.round,
          totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
        });

        // Directly proceed to next question or game completion
        if (updatedGame.round >= GAME_CONFIG.TOTAL_ROUNDS) {
          console.log("Reached total rounds, calling game completion");
          await handleGameCompletion(roomName, io);
        } else {
          console.log("Proceeding to next question");
          await sendNewQuestion(roomName, io);
        }
      } catch (error) {
        console.error("Error in round transition:", error);
      }
    }, ROUND_DURATION );

    roomTimers.set(roomName, timerId);
  } catch (error) {
    console.error("Error sending new question:", error);
    io.to(roomName).emit("gameError", {
      message: error.message || "Failed to load the next question.",
    });
  }
}
export const handleGameCompletion = async (roomName, io) => {
  console.log(`Handling game completion for room: ${roomName}`);
  try {
    let game = await Game.findOne({ roomId: roomName });

    if (!game) {
      console.error("No game found to complete");
      return;
    }

    clearRoomTimer(roomName);

    const finalScores = {};
    if (game.playerStates) {
      for (const [username, playerState] of game.playerStates.entries()) {
        finalScores[username] = playerState.score;
      }
    }

    // game.isActive = false;
    await game.save();

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

function clearRoomTimer(roomName) {
  if (roomTimers.has(roomName)) {
    clearTimeout(roomTimers.get(roomName));
    roomTimers.delete(roomName);
  }
}
