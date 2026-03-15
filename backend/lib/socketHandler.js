// socketHandler.js
import Message from "../model/message.js";
import Game from "../model/game.js";
import { GAME_CONFIG } from "../config/config.js";
import { sendNewQuestion, handleGameCompletion, endRoundAndProceed } from "./gameLogic.js";

const SYSTEM_USER = "Jaskaran@1519123";

export const initSocketHandlers = (io) => {
  const usernames = new Map();
  const roomPlayers = new Map();

  io.on("connection", (socket) => {
    // Join Room Handler
    socket.on("joinRoom", async ({ roomName, username }) => {
      try {
        socket.join(roomName);
        usernames.set(socket.id, username);
        socket.data.username = username;

        if (!roomPlayers.has(roomName)) {
          roomPlayers.set(roomName, new Set());
        }

        const roomPlayerSet = roomPlayers.get(roomName);
        const isNewUser = !roomPlayerSet.has(username);

        if (isNewUser) {
          roomPlayerSet.add(username);

          const joinMessage = {
            player: SYSTEM_USER,
            content: `${username} has joined the room`,
            timestamp: new Date(),
          };

          await Message.findOneAndUpdate(
            { roomId: roomName },
            { $push: { messages: joinMessage } },
            { upsert: true }
          );

          io.to(roomName).emit("message", joinMessage);
          io.to(roomName).emit("updatePlayers", Array.from(roomPlayerSet));

          const messages = await Message.findOne({ roomId: roomName });
          socket.emit("initialRoomSync", {
            messages: messages ? messages.messages : [],
            gameState: await Game.findOne({ roomId: roomName }),
            players: Array.from(roomPlayerSet),
          });
        }
      } catch (error) {
        console.error("Error handling joinRoom event:", error);
        socket.emit("gameError", { message: "Error joining room" });
      }
    });

    // Message Handler
    socket.on("message", async ({ roomName, username, message }) => {
      try {
        const newMessage = {
          player: username,
          content: message,
          timestamp: new Date(),
        };

        await Message.findOneAndUpdate(
          { roomId: roomName },
          { $push: { messages: newMessage } },
          { upsert: true }
        );

        io.to(roomName).emit("message", newMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    // Leave Room Handler
    socket.on("leaveRoom", (roomName) => {
      const username = usernames.get(socket.id);
      if (username && roomPlayers.has(roomName)) {
        const roomPlayerSet = roomPlayers.get(roomName);
        roomPlayerSet.delete(username);

        const leaveMessage = {
          player: SYSTEM_USER,
          content: `${username} has left the room`,
          timestamp: new Date(),
        };

        io.to(roomName).emit("message", leaveMessage);
        io.to(roomName).emit("updatePlayers", Array.from(roomPlayerSet));
      }
    });

    // Disconnect Handler
    socket.on("disconnect", () => {
      const username = usernames.get(socket.id);
      if (username) {
        for (const [roomName, players] of roomPlayers.entries()) {
          if (players.has(username)) {
            players.delete(username);
            io.to(roomName).emit("updatePlayers", Array.from(players));

            const disconnectMessage = {
              player: SYSTEM_USER,
              content: `${username} has disconnected`,
              timestamp: new Date(),
            };

            io.to(roomName).emit("message", disconnectMessage);
          }
        }
        usernames.delete(socket.id);
      }
    });

    // Start Game Handler
    socket.on("startGame", async ({ roomName }) => {
      try {
        let game = await Game.findOne({ roomId: roomName });

        if (!game) {
          game = new Game({
            roomId: roomName,
            isActive: true,
            round: 0,
            totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
            playerStates: new Map(),
            startTime: new Date(),
          });
        } else {
          game.isActive = true;
          game.round = 0;
          game.playerStates = new Map();
          game.startTime = new Date();
        }

        await game.save();

        io.to(roomName).emit("gameStateUpdate", {
          isActive: true,
          round: 0,
          totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
        });

        await sendNewQuestion(roomName, io);
      } catch (error) {
        console.error("Error in startGame:", error);
        socket.emit("gameError", { message: "Failed to start game" });
      }
    });

    // Submit Answer Handler
    socket.on("submitAnswer", async ({ roomName, username, answer }) => {
      try {
        let game = await Game.findOne({ roomId: roomName });

        if (!game || !game.isActive) {
          return socket.emit("gameError", { message: "No active game found" });
        }

        if (!game.playerStates || !game.playerStates.has(username)) {
          return socket.emit("gameError", {
            message: "You are not a participant in this game",
          });
        }

        let playerState = game.playerStates.get(username);
        if (playerState.lives <= 0) {
          return socket.emit("gameError", {
            message: "You have no lives left for this round!",
          });
        }

        // If round is already in review phase, reject submissions
        if (game.currentQuestion && game.currentQuestion.answered) {
          return socket.emit("gameError", {
            message: "Round is already over!",
          });
        }

        const normalizedAnswer = answer.toLowerCase().trim();

        if (!game.currentQuestion || !game.currentQuestion.keywords) {
          return socket.emit("gameError", {
            message: "Current question data is missing or incomplete",
          });
        }

        if (!Array.isArray(game.revealedOptions)) {
          game.revealedOptions = [];
        }

        // Check if answer has already been revealed
        const isRevealed = game.currentQuestion.keywords.some((kw) => {
          return kw.toLowerCase().trim() === normalizedAnswer && game.revealedOptions.includes(kw);
        });

        if (isRevealed) {
          return socket.emit("answerResult", {
            correct: false,
            message: "This option has already been revealed",
          });
        }

        // Check if the normalized answer matches any of the keywords
        const keywordIndex = game.currentQuestion.keywords.findIndex(
          (keyword) => keyword.toLowerCase().trim() === normalizedAnswer
        );

        if (keywordIndex !== -1) {
          const suggestion = game.currentQuestion.suggestions[keywordIndex];

          if (suggestion) {
            const pointValues = Object.values(GAME_CONFIG.POINTS_PER_ANSWER);
            const score =
              pointValues[keywordIndex] || GAME_CONFIG.POINTS_PER_ANSWER.TENTH;

            playerState.score += score;

            game.revealedOptions.push(game.currentQuestion.keywords[keywordIndex]);

            io.to(roomName).emit("answerResult", {
              correct: true,
              player: username,
              score,
              answer: game.currentQuestion.keywords[keywordIndex],
              totalScore: playerState.score,
            });

            // Save BEFORE triggering endRound to prevent race condition
            game.playerStates.set(username, playerState);
            game.markModified("playerStates");
            await game.save();

            // Broadcast updated player stats
            io.to(roomName).emit("playerStatsUpdate", {
              [username]: {
                lives: playerState.lives,
                score: playerState.score,
              },
            });

            // Check for round end AFTER save
            if (
              game.revealedOptions.length ===
              game.currentQuestion.keywords.length
            ) {
              endRoundAndProceed(roomName, io, "all_guessed");
            }

            return; // Early return since we already saved
          } else {
            return socket.emit("gameError", {
              message: "No matching suggestion found for your answer",
            });
          }
        } else {
          // Handle incorrect answer
          if (playerState.lives > 0) {
            playerState.lives--;
          }
          socket.emit("answerResult", {
            correct: false,
            message: `Incorrect. ${playerState.lives} lives remaining.`,
            livesLeft: playerState.lives,
          });

          // Check if all players are out of lives
          let allDead = true;
          for (const [pName, pState] of game.playerStates.entries()) {
            const lives = pName === username ? playerState.lives : pState.lives;
            if (lives > 0) {
              allDead = false;
              break;
            }
          }

          // Save BEFORE triggering endRound
          game.playerStates.set(username, playerState);
          game.markModified("playerStates");
          await game.save();

          // Broadcast updated player stats
          io.to(roomName).emit("playerStatsUpdate", {
            [username]: {
              lives: playerState.lives,
              score: playerState.score,
            },
          });

          if (allDead) {
            endRoundAndProceed(roomName, io, "lives_exhausted");
          }

          return; // Early return since we already saved
        }
      } catch (error) {
        console.error("Error processing answer:", error);
        socket.emit("gameError", {
          message:
            error.message || "An error occurred while processing your answer.",
        });
      }
    });

    // Get Full Game State Handler
    socket.on("getFullGameState", async ({ roomId }, callback) => {
      try {
        let game = await Game.findOne({ roomId });

        if (!game) {
          game = new Game({
            roomId: roomId,
            isActive: false,
            round: 0,
            totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
            playerStates: new Map(),
            currentQuestion: null,
            startTime: new Date(),
          });
          await game.save();
        }

        callback({
          success: true,
          gameState: {
            isActive: game.isActive,
            round: game.round,
            totalRounds: game.totalRounds,
            currentQuestion: game.currentQuestion,
            playerStates: game.playerStates
              ? Array.from(game.playerStates)
              : [],
            roundStartTime: game.startTime,
          },
        });
      } catch (error) {
        console.error("Error fetching game state:", error);
        callback({
          success: false,
          message: "Error fetching game state",
        });
      }
    });
  });
};
