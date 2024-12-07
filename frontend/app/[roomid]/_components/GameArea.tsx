// GameArea.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { GameState, PlayerStats } from "@/types/game";
import { Socket } from "socket.io-client";

const GAME_CONFIG = {
  LIVES_PER_PLAYER: 3,
  ROUND_DURATION: 30, // seconds
};

interface GameAreaProps {
  socket?: Socket;
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
  const [finalScores, setFinalScores] = useState<{ [key: string]: number }>({});
  const [isGameOver, setIsGameOver] = useState(false); // Track game over state

  // Reset timer when a new question is received
  useEffect(() => {
    if (gameState.currentQuestion) {
      setTimeLeft(GAME_CONFIG.ROUND_DURATION);
      setIsGameOver(false); // Reset game over state on new question
    }
  }, [gameState.currentQuestion]);

  // Timer countdown logic
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (gameState.isActive && timeLeft > 0 && !isGameOver) {
      timerId = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [gameState.isActive, timeLeft, isGameOver]);

  // Socket event handling
  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized");
      return;
    }

    const handleGameStateUpdate = (updatedGameState: any) => {
      console.log("Game state update received:", updatedGameState);
      setGameState((prev) => ({ ...prev, ...updatedGameState }));
    };

    const handlePlayerStatsUpdate = (statsUpdate: any) => {
      const currentUsername = localStorage.getItem("playerName");
      if (currentUsername && statsUpdate[currentUsername]) {
        console.log("Player stats update received:", statsUpdate);
        setPlayerStats(statsUpdate[currentUsername]);
      }
    };

    const handleNewQuestion = (questionData: any) => {
      console.log("New question received:", questionData);
      setGameState((prev) => ({
        ...prev,
        currentQuestion: questionData,
        isActive: true,
        round: questionData.round,
      }));
      setTimeLeft(GAME_CONFIG.ROUND_DURATION);
      setAnswer("");
      setIsGameOver(false); // Reset game over state
    };

    const handleGameOver = (gameOverData: any) => {
      console.log("Game over event received:", gameOverData); // Log the entire event
      console.log("Final scores:", gameOverData.finalScores);
      setGameState((prev) => ({ ...prev, isActive: false }));
      setFinalScores(gameOverData.finalScores || {});
      setIsGameOver(true); // Set game over state
    };

    const handleGameError = (error: any) => {
      console.error("Game error:", error);
      alert(error.message);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("playerStatsUpdate", handlePlayerStatsUpdate);
    socket.on("newQuestion", handleNewQuestion);
    socket.on("gameOver", handleGameOver);
    socket.on("gameError", handleGameError);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("playerStatsUpdate", handlePlayerStatsUpdate);
      socket.off("newQuestion", handleNewQuestion);
      socket.off("gameOver", handleGameOver);
      socket.off("gameError", handleGameError);
    };
  }, [socket]);

  const handleSubmit = useCallback(() => {
    if (!socket || !answer.trim()) return;

    socket.emit("submitAnswer", {
      roomName: roomId,
      username: localStorage.getItem("playerName"),
      answer: answer.trim(),
    });
    setAnswer("");
  }, [answer, roomId, socket]);

  const handleStartGame = () => {
    if (!socket) {
      console.warn("Cannot start game: Socket not initialized");
      return;
    }
    console.log("Attempting to start game in room:", roomId);
    socket.emit("startGame", { roomName: roomId });
  };

  // Sort scores in descending order
  const sortedScores = Object.entries(finalScores)
    .sort(([, a], [, b]) => b - a)
    .map(([player, score]) => ({ player, score }));

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow">
      {gameState.isActive && gameState.currentQuestion && !isGameOver ? (
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
        <div className="text-center min-h-[400px] flex flex-col justify-center items-center">
          {isGameOver && Object.keys(finalScores).length > 0 ? (
            <div className="w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Final Scores</h2>
              <div className="bg-gray-100 rounded-lg p-4">
                {sortedScores.map(({ player, score }, index) => (
                  <div
                    key={player}
                    className={`flex justify-between items-center p-2 ${
                      index === 0
                        ? "bg-yellow-200 font-bold"
                        : index === 1
                        ? "bg-gray-200"
                        : index === 2
                        ? "bg-orange-100"
                        : ""
                    }`}
                  >
                    <span>
                      {index === 0
                        ? "🥇"
                        : index === 1
                        ? "🥈"
                        : index === 2
                        ? "🥉"
                        : ""}{" "}
                      {player}
                    </span>
                    <span>{score}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 mb-4">
              {isGameOver
                ? "Game Over! Scores are being calculated..."
                : "Waiting for the game to start..."}
            </p>
          )}
          {!isGameOver && (
            <button
              onClick={handleStartGame}
              className="mt-6 p-4 bg-green-500 text-white text-xl font-semibold rounded-full hover:bg-green-600 transition-colors"
            >
              Start New Game
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GameArea;
