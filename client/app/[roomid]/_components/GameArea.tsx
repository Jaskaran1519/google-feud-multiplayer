"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { GameState, PlayerStats } from "@/types/game";
import { Socket } from "socket.io-client";

const GAME_CONFIG = {
  LIVES_PER_PLAYER: 3,
  ROUND_DURATION: 30, // seconds
};

interface GameAreaProps {
  socket?: Socket; // Make socket optional
  roomId: string;
  gameState: GameState;
  playerStats: PlayerStats;
}

export const GameArea: React.FC<GameAreaProps> = ({
  socket,
  roomId,
  gameState: initialGameState,
  playerStats: initialPlayerStats,
}) => {
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.ROUND_DURATION);
  const [playerStats, setPlayerStats] = useState(initialPlayerStats);
  const [gameState, setGameState] = useState(initialGameState);

  // Comprehensive socket event handling
  useEffect(() => {
    // Add a null check before adding listeners
    if (!socket) {
      console.warn("Socket is not initialized");
      return;
    }

    const handleGameStateUpdate = (updatedGameState: any) => {
      console.log("Game state update received:", updatedGameState);
      setGameState((prev) => ({
        ...prev,
        ...updatedGameState,
      }));
    };

    const handlePlayerStatsUpdate = (statsUpdate: any) => {
      const currentUsername = localStorage.getItem("playerName");
      if (currentUsername && statsUpdate[currentUsername]) {
        console.log("Player stats update received:", statsUpdate);
        setPlayerStats((prev) => ({
          lives: statsUpdate[currentUsername].lives,
          score: statsUpdate[currentUsername].score,
        }));
      }
    };

    const handleNewQuestion = (questionData: any) => {
      console.log("New question received:", questionData);
      setGameState((prev) => ({
        ...prev,
        ...questionData,
        isActive: true,
      }));
      setTimeLeft(GAME_CONFIG.ROUND_DURATION);
      setAnswer("");
    };

    const handleGameOver = (gameOverData: any) => {
      console.log("Game over:", gameOverData);
      setGameState((prev) => ({
        ...prev,
        isActive: false,
      }));
    };

    const handleAnswerResult = (result: any) => {
      console.log("Answer result:", result);
      // Optional: Add specific handling for answer results
    };

    // Add socket listeners
    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("playerStatsUpdate", handlePlayerStatsUpdate);
    socket.on("newQuestion", handleNewQuestion);
    socket.on("gameOver", handleGameOver);
    socket.on("answerResult", handleAnswerResult);

    // Error handling
    socket.on("gameError", (error: any) => {
      console.error("Game error:", error);
      alert(error.message);
    });

    // Cleanup listeners
    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("playerStatsUpdate", handlePlayerStatsUpdate);
      socket.off("newQuestion", handleNewQuestion);
      socket.off("gameOver", handleGameOver);
      socket.off("answerResult", handleAnswerResult);
      socket.off("gameError");
    };
  }, [socket]); // Depend on socket to re-run if socket changes

  // Timer and round management
  useEffect(() => {
    // Reset timer when a new question arrives
    if (gameState.currentQuestion) {
      setTimeLeft(GAME_CONFIG.ROUND_DURATION);
    }

    // Timer countdown logic
    if (gameState.isActive && timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timerId);
    }
  }, [gameState.isActive, gameState.currentQuestion, timeLeft]);

  // Answer submission handler
  const handleSubmit = useCallback(() => {
    // Additional null check for socket
    if (!socket || !answer.trim()) return;

    socket.emit("submitAnswer", {
      roomName: roomId,
      username: localStorage.getItem("playerName"),
      answer: answer.trim(),
    });
    setAnswer("");
  }, [answer, roomId, socket]);

  // Start game handler
  const handleStartGame = () => {
    // Additional null check for socket
    if (!socket) {
      console.warn("Cannot start game: Socket not initialized");
      return;
    }

    console.log("Attempting to start game in room:", roomId);
    socket.emit("startGame", { roomName: roomId });
  };

  // Debug logging
  useEffect(() => {
    console.log("Current Game State:", gameState);
  }, [gameState]);

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow">
      {gameState.isActive && gameState.currentQuestion ? (
        <>
          <div className="flex justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">
                Round {gameState.round}/{gameState.totalRounds}
              </h2>
              <p className="text-gray-600">Time left: {timeLeft}s</p>
            </div>
            <div>
              <p className="text-gray-600">Lives: {playerStats.lives}</p>
              <p className="text-gray-600">Score: {playerStats.score}</p>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {gameState.currentQuestion.question}
            </h3>
            <div className="mt-4 space-y-2">
              {gameState.currentQuestion.suggestions &&
                gameState.currentQuestion.suggestions.map(
                  (suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                      onClick={() => {
                        setAnswer(suggestion);
                        handleSubmit();
                      }}
                    >
                      {suggestion}
                    </div>
                  )
                )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
              className="flex-1 p-2 border rounded"
              placeholder="Type your answer..."
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Submit
            </button>
          </div>
        </>
      ) : (
        <div
          className="text-center min-h-[400px] flex justify-center items-center"
        >
          <button
            onClick={handleStartGame}
            className="p-20  bg-green-500 text-white text-xl font-semibold rounded-full"
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
};

export default GameArea;
