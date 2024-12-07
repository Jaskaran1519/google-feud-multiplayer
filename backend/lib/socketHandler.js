// index.ts (or wherever your socket.io setup is)
import Message from "../model/message.js";
import Game from "../model/game.js";
import { GAME_CONFIG } from "../config/config.js";
import { sendNewQuestion, handleGameCompletion } from "./gameLogic.js";

const SYSTEM_USER = "Jaskaran@1519123";

export const initSocketHandlers = (io) => {
  const usernames = new Map();
  const roomPlayers = new Map();

  io.on("connection", (socket) => {
    // Join Room Handler
    socket.on("joinRoom", async ({ roomName, username }) => {
      socket.join(roomName);
      usernames.set(socket.id, username);

      // Emit initial room data
      const game = await Game.findOne({ roomId: roomName });
      const messages = await Message.findOne({ roomId: roomName });

      socket.emit("initialRoomSync", {
        messages: messages ? messages.messages : [],
        gameState: game
          ? {
          isActive: game.isActive,
          round: game.round,
          totalRounds: game.totalRounds,
          currentQuestion: game.currentQuestion,
          playerStates: game.playerStates
            ? Array.from(game.playerStates)
            : [],
          startTime: game.startTime,
        }
          : null, // Or a default game state if no game exists yet
      });

      // Manage room players and emit updates
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

        try {
          await Message.findOneAndUpdate(
            { roomId: roomName },
            { $push: { messages: joinMessage } },
            { upsert: true }
          );

          io.to(roomName).emit("message", joinMessage);
          io.to(roomName).emit("updatePlayers", Array.from(roomPlayerSet));
        } catch (error) {
          console.error("Error handling join message:", error);
        }
      }
    });

    // Message Handler
    socket.on("message", async ({ roomName, username, message }) => {
      console.log("Message received:", { roomName, username, message });
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
            round: 0, // Start at round 0
            totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
            playerStates: new Map(),
            startTime: new Date(),
          });
        } else {
          // Reset the existing game
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

        // Start the game logic
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
          socket.emit("gameError", { message: "No active game found" });
          return;
        }

        // Ensure player state exists
        if (!game.playerStates || !game.playerStates.has(username)) {
          game.playerStates = game.playerStates || new Map();
          game.playerStates.set(username, {
            lives: GAME_CONFIG.LIVES_PER_PLAYER,
            score: 0,
            attempts: [],
          });
        }

        const playerState = game.playerStates.get(username);

        // Check for duplicate answers
        if (playerState.attempts.includes(answer.toLowerCase())) {
          socket.emit("answerResult", {
            correct: false,
            message: "You've already tried this answer",
          });
          return;
        }

        // Check if player has lives left
        if (playerState.lives <= 0) {
          socket.emit("answerResult", {
            correct: false,
            message: "No more lives left for this round",
          });
          return;
        }

        // Check the answer against the current question
        const isCorrect = game.currentQuestion.suggestions.some(
          (suggestion) => suggestion.toLowerCase() === answer.toLowerCase()
        );

        // Track the attempt
        playerState.attempts.push(answer.toLowerCase());

        if (isCorrect) {
          // Correct answer
          const index = game.currentQuestion.suggestions.findIndex(
            (s) => s.toLowerCase() === answer.toLowerCase()
          );
          const pointValues = Object.values(GAME_CONFIG.POINTS_PER_ANSWER);
          const score =
            pointValues[index] || GAME_CONFIG.POINTS_PER_ANSWER.TENTH;
          playerState.score += score;

          io.to(roomName).emit("answerResult", {
            correct: true,
            player: username,
            score,
            answer,
            totalScore: playerState.score,
          });
        } else {
          // Incorrect answer
          playerState.lives--;

          socket.emit("answerResult", {
            correct: false,
            player: username,
            livesLeft: playerState.lives,
            message: `Wrong answer! ${playerState.lives} lives left`,
          });
        }

        // Save the updated game state
        game.markModified("playerStates");
        await game.save();

        io.to(roomName).emit("playerStatsUpdate", {
          [username]: {
            lives: playerState.lives,
            score: playerState.score,
          },
        });
      } catch (error) {
        console.error("Error processing answer:", error);
        socket.emit("gameError", { message: "Error processing answer" });
      }
    });

    // Get Full Game State Handler
    socket.on("getFullGameState", async ({ roomId }, callback) => {
      try {
        let game = await Game.findOne({ roomId });

        if (!game) {
          // Create a default inactive game state if no game is found
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