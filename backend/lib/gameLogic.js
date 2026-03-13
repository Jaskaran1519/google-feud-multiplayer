import Game from "../model/game.js";
import { generateQuestion } from "../services/openRouterService.js";
import { getAutocompleteSuggestions } from "../services/googleSearchService.js";
import { GAME_CONFIG } from "../config/config.js";

const ROUND_DURATION = GAME_CONFIG.ROUND_DURATION;
const TOTAL_ROUNDS = GAME_CONFIG.TOTAL_ROUNDS;

const roomTimers = new Map();

export function extractAnswer(suggestion, question) {
  const baseQuestion = question.replace(/\.\.\.$/, '').trim().toLowerCase();
  const result = suggestion.toLowerCase().trim();

  // 1. Try exact exact regex match first
  const exactMatchRegex = new RegExp(`^${baseQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, "i");
  if (exactMatchRegex.test(result)) {
    return result.replace(exactMatchRegex, "").trim();
  }

  // 2. If Google autocorrected the end of the seed, we word-by-word match
  const qWords = baseQuestion.split(/\s+/);
  const sWords = result.split(/\s+/);

  let matchCount = 0;
  while (matchCount < qWords.length && matchCount < sWords.length) {
    if (qWords[matchCount] === sWords[matchCount]) {
      matchCount++;
    } else {
      break;
    }
  }

  // If we matched at least one word from the prefix, strip those matched words
  if (matchCount > 0) {
    return sWords.slice(matchCount).join(" ").trim();
  }

  // Fallback: just return the raw suggestion
  return result;
}

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

    // Generate question and suggestions with retry logic to ensure 10 results
    let question = "";
    let suggestions = [];
    let attempts = 0;
    
    while (suggestions.length < 10 && attempts < 4) {
      question = await generateQuestion();
      const rawSuggestions = await getAutocompleteSuggestions(question);
      suggestions = [...new Set(rawSuggestions)]; // Remove duplicates
      if (suggestions.length > 10) suggestions = suggestions.slice(0, 10);
      attempts++;
    }

    // Pad with fallbacks if we still didn't get 10
    if (suggestions.length < 10) {
      const fallbacks = [
        "today", "now", "near me", "for free", "online", 
        "meaning", "pdf", "wiki", "reddit", "youtube"
      ];
      for (const fallback of fallbacks) {
        if (suggestions.length >= 10) break;
        const padded = `${question.slice(0, -3)} ${fallback}`;
        if (!suggestions.includes(padded)) suggestions.push(padded);
      }
    }

    // Extract keywords from suggestions
    const keywords = suggestions.map((suggestion) => extractAnswer(suggestion, question));

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
      roundDuration: GAME_CONFIG.ROUND_DURATION / 1000,
      livesPerPlayer: GAME_CONFIG.LIVES_PER_PLAYER,
      isActive: true,
      currentQuestion: {
        question,
        suggestions,
        keywords,
      },
      revealedOptions: [],
      isReviewing: false,
      reviewReason: null,
      playerStates: Array.from(game.playerStates.entries()).map(
        ([username, state]) => ({
          username,
          lives: state.lives,
          score: state.score,
        })
      ),
    });

    // Also explicitly fire a stats update so frontends immediately reset lives to Max
    const statsUpdate = {};
    for (const [username, state] of game.playerStates.entries()) {
      statsUpdate[username] = { lives: state.lives, score: state.score };
    }
    io.to(roomName).emit("playerStatsUpdate", statsUpdate);

    // Emit new question details
    io.to(roomName).emit("newQuestion", {
      question,
      suggestions,
      keywords,
      round: game.round,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      roundDuration: GAME_CONFIG.ROUND_DURATION / 1000,
      livesPerPlayer: GAME_CONFIG.LIVES_PER_PLAYER,
      isReviewing: false,
      reviewReason: null,
    });

    const timerId = setTimeout(async () => {
      await endRoundAndProceed(roomName, io, "time_up");
    }, ROUND_DURATION + 2000); // Give 2 seconds of grace period for frontend lag

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

export async function endRoundAndProceed(roomName, io, reason = "time_up") {
  try {
    let game = await Game.findOne({ roomId: roomName });
    if (!game || !game.isActive) return;

    console.log(`Round ended for room: ${roomName}, Reason: ${reason}`);

    // Clear the timer so it doesn't double trigger
    clearRoomTimer(roomName);

    // ONLY reveal all options to players if they exhausted their lives
    if (reason === "lives_exhausted") {
      game.revealedOptions = game.currentQuestion.keywords;
      await game.save();
    }

    // Emit the state update. Front-end will check isReviewing to show "Time's up" or "Out of lives" round over UI
    io.to(roomName).emit("gameStateUpdate", {
      revealedOptions: game.revealedOptions,
      isReviewing: true,
      reviewReason: reason,
    });

    // Wait 5 seconds for review before moving to next question
    setTimeout(async () => {
      try {
        let updatedGame = await Game.findOne({ roomId: roomName });
        if (!updatedGame || !updatedGame.isActive) return;

        if (updatedGame.round >= GAME_CONFIG.TOTAL_ROUNDS) {
          console.log("Reached total rounds, calling game completion");
          await handleGameCompletion(roomName, io);
        } else {
          console.log("Proceeding to next question");
          await sendNewQuestion(roomName, io);
        }
      } catch (error) {
        console.error("Error in next round transition:", error);
      }
    }, 5000);
  } catch (error) {
    console.error("Error ending round:", error);
  }
}

function clearRoomTimer(roomName) {
  if (roomTimers.has(roomName)) {
    clearTimeout(roomTimers.get(roomName));
    roomTimers.delete(roomName);
  }
}
