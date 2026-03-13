"use client";
import React, { useState, useEffect, useCallback } from "react";
import { GameState, PlayerStats } from "@/types/game";
import { Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CONFIG = {
  ROUND_DURATION: 30, // fallback
  LIVES_PER_PLAYER: 3, // fallback
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
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [answer, setAnswer] = useState("");
  const roundDuration = gameState.roundDuration || DEFAULT_CONFIG.ROUND_DURATION;
  const [timeLeft, setTimeLeft] = useState(roundDuration);
  const [playerStats, setPlayerStats] = useState(initialPlayerStats);
  const [finalScores, setFinalScores] = useState<{ [key: string]: number }>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [revealedOptions, setRevealedOptions] = useState<string[]>([]);
  const { toast } = useToast();

  // Reset timer and revealed options when a new question is received
  useEffect(() => {
    if (gameState.currentQuestion) {
      setTimeLeft(gameState.roundDuration || DEFAULT_CONFIG.ROUND_DURATION);
      setIsGameOver(false);
      setRevealedOptions([]); // Reset revealed options
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

    const handleGameStateUpdate = (updatedGameState: Partial<GameState> & { revealedOptions?: string[] }) => {
      console.log("Game state update received:", updatedGameState);
      setGameState((prev) => ({ ...prev, ...updatedGameState }));
      if (updatedGameState.revealedOptions) {
        setRevealedOptions(updatedGameState.revealedOptions);
      }
      if (updatedGameState.isReviewing) {
        setTimeLeft(0);
      }
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
        roundDuration: questionData.roundDuration || prev.roundDuration,
        livesPerPlayer: questionData.livesPerPlayer || prev.livesPerPlayer,
      }));
      setTimeLeft(questionData.roundDuration || DEFAULT_CONFIG.ROUND_DURATION);
      setAnswer("");
      setIsGameOver(false);
      setRevealedOptions([]); // Reset revealed options
    };

    const handleGameOver = (gameOverData: any) => {
      console.log("Game over event received:", gameOverData);
      setGameState((prev) => ({ ...prev, isActive: false }));
      setFinalScores(gameOverData.finalScores || {});
      setIsGameOver(true);
    };

    const handleGameError = (error: any) => {
      console.error("Game error:", error);
      alert(error.message || "A game error occurred."); 
  };

    const handleAnswerResult = (result: any) => {
      if (result.correct) {
        // Reveal the full suggestion
        setRevealedOptions((prev) => [...prev, result.answer]);
      } else {
        // Just got it wrong, let's check lives internally to show toast
        const newLivesCount = result.livesLeft;
        if (newLivesCount <= 0) {
          toast({
            title: "Out of Lives!",
            description: "You have no lives left for this round.",
            variant: "destructive",
          });
        }
      }
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("playerStatsUpdate", handlePlayerStatsUpdate);
    socket.on("newQuestion", handleNewQuestion);
    socket.on("gameOver", handleGameOver);
    socket.on("gameError", handleGameError);
    socket.on("answerResult", handleAnswerResult);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("playerStatsUpdate", handlePlayerStatsUpdate);
      socket.off("newQuestion", handleNewQuestion);
      socket.off("gameOver", handleGameOver);
      socket.off("gameError", handleGameError);
      socket.off("answerResult", handleAnswerResult);
    };
  }, [socket]);

  const handleSubmit = useCallback(() => {
    if (!socket || !answer.trim() || playerStats.lives <= 0) return;

    socket.emit("submitAnswer", {
      roomName: roomId,
      username: localStorage.getItem("playerName"),
      answer: answer.trim(),
    });
    setAnswer("");
  }, [answer, roomId, socket, playerStats.lives]);

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
              <p className="text-gray-600">Lives: {Math.max(0, playerStats.lives)}</p>
              <p className="text-gray-600">Score: {playerStats.score}</p>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              {gameState.currentQuestion.question}
            </h3>
            <div className="mt-4 space-y-2">
              {gameState.currentQuestion.keywords &&
                gameState.currentQuestion.keywords.map(
                  (keyword, index) => {
                    const isRevealed = revealedOptions.includes(keyword);
                    return (
                      <div
                        key={index}
                        className="relative p-2 rounded overflow-hidden min-h-[40px] bg-gray-100 flex items-center"
                      >
                        {/* The Actual Text */}
                        <div className="z-10 relative">
                          {keyword}
                        </div>
                        
                        {/* The Grey Cover Strip that slides to the left */}
                        <div 
                          className="absolute inset-0 bg-gray-300 z-20 origin-left transition-transform duration-700 ease-in-out"
                          style={{
                            transform: isRevealed ? 'scaleX(0)' : 'scaleX(1)'
                          }}
                        />
                      </div>
                    );
                  }
                )}
            </div>
          </div>
          {gameState.isReviewing || (gameState.currentQuestion.keywords && revealedOptions.length === gameState.currentQuestion.keywords.length) ? (
            <div className="flex flex-col gap-2 justify-center items-center bg-gray-100 p-4 rounded-lg mt-6">
              <div className="text-lg font-semibold text-gray-700">
                {gameState.reviewReason === "lives_exhausted" ? "Out of Lives! Reviewing answers..." : 
                 gameState.reviewReason === "time_up" ? "Time's Up! Next round starting soon..." : 
                 "Round Ended! Next round starting soon."}
              </div>
            </div>
          ) : (
            <div className={`flex gap-2 mt-6 transition-opacity ${playerStats.lives <= 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                className="flex-1 p-2 border rounded disabled:bg-gray-100"
                placeholder={playerStats.lives <= 0 ? "You're out of lives..." : "Type your answer..."}
                disabled={playerStats.lives <= 0}
              />
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
                disabled={playerStats.lives <= 0}
              >
                Submit
              </button>
            </div>
          )}
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