import Game from "../model/game.js";
import { generateQuestion } from "../services/geminiService.js";
import { getAutocompleteSuggestions } from "../services/googleSearchService.js";
import { GAME_CONFIG } from "../config/config.js";

const ROUND_DURATION = GAME_CONFIG.ROUND_DURATION; 
const TOTAL_ROUNDS = GAME_CONFIG.TOTAL_ROUNDS;

export async function sendNewQuestion(roomName, io) {
  console.log("Sending new question for room:", roomName);
  try {
    const question = await generateQuestion();

    const suggestions = await getAutocompleteSuggestions(question);

    const game = await Game.findOneAndUpdate(
      { roomId: roomName },
      {
        $inc: { round: 1 },
        currentQuestion: {
          question,
          suggestions,
          answered: false,
        },
      },
      { new: true }
    );

    io.to(roomName).emit("newQuestion", {
      question,
      suggestions,
      round: game.round,
      totalRounds: TOTAL_ROUNDS,
    });

    setTimeout(async () => {
      const currentGame = await Game.findOne({ roomId: roomName });
      if (currentGame && currentGame.round < TOTAL_ROUNDS) {
        await sendNewQuestion(roomName, io);
      } else {
        console.log("Game over for room:", roomName);
        io.to(roomName).emit("gameOver", {
          scores: currentGame.scores,
        });

        currentGame.isActive = false;
        await currentGame.save();
      }
    }, ROUND_DURATION);
  } catch (error) {
    console.error("Error sending new question:", error);
    io.to(roomName).emit("gameError", {
      message: "Failed to load question",
    });
  }
}