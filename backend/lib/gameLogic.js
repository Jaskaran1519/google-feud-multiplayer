import Game from "../model/game.js";
import { generateQuestion } from "../services/openRouterService.js";
import { getAutocompleteSuggestions } from "../services/googleSearchService.js";
import { GAME_CONFIG } from "../config/config.js";

const roomTimers = new Map();
// Track whether a round-end is already in progress to prevent double triggers
const roundEndingLock = new Map();
// Pre-fetched question data for the next round
const prefetchedQuestions = new Map();
// Cache room settings so they persist through round transitions
const roomSettingsCache = new Map();

export function extractAnswer(suggestion, question) {
  const baseQuestion = question.replace(/\.\.\.$/, '').trim().toLowerCase();
  const result = suggestion.toLowerCase().trim();

  // 1. Try exact regex match first
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

/**
 * Fetches a question + suggestions from OpenRouter + Google Autocomplete.
 * Returns { question, suggestions, keywords } or null on failure.
 */
async function fetchQuestionData() {
  let question = "";
  let suggestions = [];

  // Attempt 1: generate a question and get Google autocomplete results
  question = await generateQuestion();
  let rawSuggestions = await getAutocompleteSuggestions(question);
  suggestions = [...new Set(rawSuggestions)];

  // If we got very few results (< 4), try ONE more time with a different question
  if (suggestions.length < 4) {
    console.log(`Only got ${suggestions.length} suggestions for "${question}", retrying once...`);
    question = await generateQuestion();
    rawSuggestions = await getAutocompleteSuggestions(question);
    suggestions = [...new Set(rawSuggestions)];
  }

  // Cap at 10 results
  if (suggestions.length > 10) {
    suggestions = suggestions.slice(0, 10);
  }

  const keywords = suggestions.map((suggestion) => extractAnswer(suggestion, question));

  console.log(`Question: "${question}" → ${suggestions.length} suggestions`);
  return { question, suggestions, keywords };
}

/**
 * Kick off a background pre-fetch for the next question.
 * Stores the promise in prefetchedQuestions so sendNewQuestion can await it.
 */
function startPrefetch(roomName) {
  const promise = fetchQuestionData().catch((err) => {
    console.error("Prefetch failed for room:", roomName, err);
    return null;
  });
  prefetchedQuestions.set(roomName, promise);
}

export async function sendNewQuestion(roomName, io, roomSettings = null) {
  console.log("Sending new question for room:", roomName);
  try {
    // Cache or retrieve room settings
    if (roomSettings) {
      roomSettingsCache.set(roomName, roomSettings);
    }
    const settings = roomSettingsCache.get(roomName) || {
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      roundDuration: GAME_CONFIG.ROUND_DURATION,
      livesPerPlayer: GAME_CONFIG.LIVES_PER_PLAYER,
    };

    let game = await Game.findOne({ roomId: roomName });

    if (!game) {
      console.error("Game not found for room:", roomName);
      return;
    }

    // Clear any existing timer and unlock round-ending
    clearRoomTimer(roomName);
    roundEndingLock.delete(roomName);

    // Increment round or initialize
    if (!game.round) {
      game.round = 1;
    } else {
      game.round++;
    }

    // Check if game should end
    if (game.round > settings.totalRounds) {
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
            lives: settings.livesPerPlayer,
            score: 0,
            attempts: [],
          });
        }
      });
    }

    // Ensure all players have full lives at the start of each round
    game.playerStates.forEach((playerState) => {
      playerState.lives = settings.livesPerPlayer;
    });

    // Use pre-fetched data if available, otherwise fetch on the spot
    let questionData;
    if (prefetchedQuestions.has(roomName)) {
      questionData = await prefetchedQuestions.get(roomName);
      prefetchedQuestions.delete(roomName);
    }

    // If prefetch failed or wasn't available, fetch now
    if (!questionData) {
      questionData = await fetchQuestionData();
    }

    const { question, suggestions, keywords } = questionData;

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
      totalRounds: settings.totalRounds,
      roundDuration: settings.roundDuration / 1000,
      livesPerPlayer: settings.livesPerPlayer,
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
      totalRounds: settings.totalRounds,
      roundDuration: settings.roundDuration / 1000,
      livesPerPlayer: settings.livesPerPlayer,
      isReviewing: false,
      reviewReason: null,
    });

    const timerId = setTimeout(async () => {
      await endRoundAndProceed(roomName, io, "time_up");
    }, settings.roundDuration + 2000); // Give 2 seconds of grace period for frontend lag

    roomTimers.set(roomName, timerId);

    // Start pre-fetching next question in background (if not the last round)
    if (game.round < settings.totalRounds) {
      startPrefetch(roomName);
    }
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
    roundEndingLock.delete(roomName);
    prefetchedQuestions.delete(roomName);

    const finalScores = {};
    if (game.playerStates) {
      for (const [username, playerState] of game.playerStates.entries()) {
        finalScores[username] = playerState.score;
      }
    }

    game.isActive = false;
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
    // Prevent double trigger: if a round-end is already in progress, skip
    if (roundEndingLock.has(roomName)) {
      console.log(`Round end already in progress for room: ${roomName}, skipping duplicate (reason: ${reason})`);
      return;
    }
    roundEndingLock.set(roomName, true);

    // Retrieve cached room settings
    const settings = roomSettingsCache.get(roomName) || {
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      roundDuration: GAME_CONFIG.ROUND_DURATION,
      livesPerPlayer: GAME_CONFIG.LIVES_PER_PLAYER,
    };

    let game = await Game.findOne({ roomId: roomName });
    if (!game || !game.isActive) {
      roundEndingLock.delete(roomName);
      return;
    }

    console.log(`Round ended for room: ${roomName}, Reason: ${reason}`);

    // Clear the timer so it doesn't double trigger
    clearRoomTimer(roomName);

    // Reveal all remaining answers for review
    if (reason === "lives_exhausted" || reason === "time_up") {
      game.revealedOptions = game.currentQuestion.keywords;
      await game.save();
    }
    // For "all_guessed", revealedOptions is already complete from submitAnswer

    // Emit the state update for review phase
    io.to(roomName).emit("gameStateUpdate", {
      revealedOptions: game.revealedOptions,
      isReviewing: true,
      reviewReason: reason,
    });

    // Wait 5 seconds for review before moving to next question
    setTimeout(async () => {
      try {
        // Unlock so the next round can proceed
        roundEndingLock.delete(roomName);

        let updatedGame = await Game.findOne({ roomId: roomName });
        if (!updatedGame || !updatedGame.isActive) return;

        if (updatedGame.round >= settings.totalRounds) {
          console.log("Reached total rounds, calling game completion");
          await handleGameCompletion(roomName, io);
        } else {
          console.log("Proceeding to next question");
          await sendNewQuestion(roomName, io);
        }
      } catch (error) {
        console.error("Error in next round transition:", error);
        roundEndingLock.delete(roomName);
      }
    }, 5000);
  } catch (error) {
    console.error("Error ending round:", error);
    roundEndingLock.delete(roomName);
  }
}

function clearRoomTimer(roomName) {
  if (roomTimers.has(roomName)) {
    clearTimeout(roomTimers.get(roomName));
    roomTimers.delete(roomName);
  }
}
