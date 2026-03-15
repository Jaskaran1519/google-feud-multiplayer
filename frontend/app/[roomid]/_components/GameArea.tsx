"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { GameState, PlayerStats } from "@/types/game";
import { Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Trophy,
  Clock,
  Zap,
  Send,
  Play,
  Crown,
  Medal,
  Award,
  Sparkles,
  Search,
} from "lucide-react";

const DEFAULT_CONFIG = {
  ROUND_DURATION: 30,
  LIVES_PER_PLAYER: 3,
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
  const roundDuration =
    gameState.roundDuration || DEFAULT_CONFIG.ROUND_DURATION;
  const [timeLeft, setTimeLeft] = useState(roundDuration);
  const [playerStats, setPlayerStats] = useState(initialPlayerStats);
  const [finalScores, setFinalScores] = useState<{ [key: string]: number }>({});
  const [isGameOver, setIsGameOver] = useState(false);
  const [revealedOptions, setRevealedOptions] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset timer and revealed options when a new question is received
  useEffect(() => {
    if (gameState.currentQuestion) {
      setTimeLeft(gameState.roundDuration || DEFAULT_CONFIG.ROUND_DURATION);
      setIsGameOver(false);
      setRevealedOptions([]);
    }
  }, [gameState.currentQuestion]);

  // Timer countdown logic
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (
      gameState.isActive &&
      timeLeft > 0 &&
      !isGameOver &&
      !gameState.isReviewing
    ) {
      timerId = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [gameState.isActive, timeLeft, isGameOver, gameState.isReviewing]);

  // Socket event handling
  useEffect(() => {
    if (!socket) return;

    const handleGameStateUpdate = (
      updatedGameState: Partial<GameState> & { revealedOptions?: string[] }
    ) => {
      // If we're entering a new round (isReviewing false + has question), do a smooth transition
      if (updatedGameState.isReviewing === false && updatedGameState.currentQuestion) {
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 400);
      }

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
        setPlayerStats(statsUpdate[currentUsername]);
      }
    };

    const handleNewQuestion = (questionData: any) => {
      setIsTransitioning(true);
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          currentQuestion: questionData,
          isActive: true,
          round: questionData.round,
          roundDuration: questionData.roundDuration || prev.roundDuration,
          livesPerPlayer: questionData.livesPerPlayer || prev.livesPerPlayer,
          isReviewing: false,
          reviewReason: undefined,
        }));
        setTimeLeft(questionData.roundDuration || DEFAULT_CONFIG.ROUND_DURATION);
        setAnswer("");
        setIsGameOver(false);
        setRevealedOptions([]);
        setIsTransitioning(false);
        // Focus input on new question
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 300);
    };

    const handleGameOver = (gameOverData: any) => {
      setGameState((prev) => ({ ...prev, isActive: false }));
      setFinalScores(gameOverData.finalScores || {});
      setIsGameOver(true);
    };

    const handleGameError = (error: any) => {
      toast({
        title: "Game Error",
        description: error.message || "A game error occurred.",
        variant: "destructive",
      });
    };

    const handleAnswerResult = (result: any) => {
      if (result.correct) {
        setRevealedOptions((prev) => [...prev, result.answer]);
      } else {
        const newLivesCount = result.livesLeft;
        if (newLivesCount !== undefined && newLivesCount <= 0) {
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
  }, [socket, toast]);

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
    if (!socket) return;
    socket.emit("startGame", { roomName: roomId });
  };

  // Sort scores in descending order
  const sortedScores = Object.entries(finalScores)
    .sort(([, a], [, b]) => b - a)
    .map(([player, score]) => ({ player, score }));

  // Timer progress percentage
  const timerPercent = (timeLeft / roundDuration) * 100;
  const timerColor =
    timeLeft > roundDuration * 0.5
      ? "from-emerald-400 to-emerald-600"
      : timeLeft > roundDuration * 0.25
      ? "from-amber-400 to-amber-600"
      : "from-red-400 to-red-600";

  // Lives hearts display
  const totalLives = gameState.livesPerPlayer || DEFAULT_CONFIG.LIVES_PER_PLAYER;
  const currentLives = Math.max(0, playerStats.lives);

  const isRoundActive =
    gameState.isActive &&
    gameState.currentQuestion &&
    !isGameOver &&
    !gameState.isReviewing;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {gameState.isActive && gameState.currentQuestion && !isGameOver ? (
          <motion.div
            key={`round-${gameState.round}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isTransitioning ? 0 : 1, y: isTransitioning ? 20 : 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-5"
          >
            {/* Top Bar: Round, Timer, Stats */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Round Info */}
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Round
                  </p>
                  <p className="text-white font-bold text-lg leading-tight">
                    {gameState.round}
                    <span className="text-gray-500 text-sm font-normal">
                      /{gameState.totalRounds}
                    </span>
                  </p>
                </div>
              </div>

              {/* Timer */}
              <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Time
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold text-lg ${
                      timeLeft <= 5
                        ? "text-red-400 animate-pulse"
                        : timeLeft <= 10
                        ? "text-amber-400"
                        : "text-white"
                    }`}
                  >
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${timerColor}`}
                    initial={{ width: "100%" }}
                    animate={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.5, ease: "linear" }}
                  />
                </div>
              </div>

              {/* Lives */}
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Lives
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: totalLives }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`w-5 h-5 transition-all duration-300 ${
                          i < currentLives
                            ? "text-red-500 fill-red-500 scale-100"
                            : "text-gray-600 scale-75"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Score
                  </p>
                  <p className="text-white font-bold text-lg leading-tight">
                    {playerStats.score}
                  </p>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
            >
              {/* Google-style search bar question */}
              <div className="flex items-center gap-3 bg-white/90 rounded-full px-5 py-3.5 mb-6 shadow-lg shadow-black/10">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-800 text-lg font-medium truncate">
                  {gameState.currentQuestion.question}
                </span>
              </div>

              {/* Answer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gameState.currentQuestion.keywords &&
                  gameState.currentQuestion.keywords.map((keyword, index) => {
                    const isRevealed = revealedOptions.includes(keyword);
                    const pointValues = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
                    const points = pointValues[index] || 10;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`relative overflow-hidden rounded-xl transition-all duration-500 ${
                          isRevealed
                            ? "bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30"
                            : "bg-white/5 border border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between py-3 px-4 relative z-10">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center ${
                                isRevealed
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white/10 text-gray-400"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <AnimatePresence mode="wait">
                              {isRevealed ? (
                                <motion.span
                                  key="revealed"
                                  initial={{ opacity: 0, filter: "blur(8px)" }}
                                  animate={{
                                    opacity: 1,
                                    filter: "blur(0px)",
                                  }}
                                  transition={{ duration: 0.5 }}
                                  className="text-emerald-300 font-medium"
                                >
                                  {keyword}
                                </motion.span>
                              ) : (
                                <motion.span
                                  key="hidden"
                                  className="text-gray-500 font-medium tracking-wider"
                                >
                                  ••••••
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              isRevealed
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/5 text-gray-500"
                            }`}
                          >
                            +{points}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>

            {/* Review / Input Area */}
            <AnimatePresence mode="wait">
              {gameState.isReviewing ||
              (gameState.currentQuestion.keywords &&
                revealedOptions.length ===
                  gameState.currentQuestion.keywords.length) ? (
                <motion.div
                  key="reviewing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-5"
                >
                  <Sparkles className="w-6 h-6 text-violet-400" />
                  <p className="text-white font-semibold text-lg">
                    {gameState.reviewReason === "lives_exhausted"
                      ? "Out of Lives!"
                      : gameState.reviewReason === "time_up"
                      ? "Time's Up!"
                      : gameState.reviewReason === "all_guessed"
                      ? "All Answers Found! 🎉"
                      : "Round Ended!"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Next round starting soon...
                  </p>
                  <div className="flex gap-1 mt-1">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-violet-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-violet-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-violet-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`transition-all duration-300 ${
                    playerStats.lives <= 0 ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <div className="flex gap-2 items-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="flex-1 bg-transparent text-white px-4 py-3 text-base outline-none placeholder:text-gray-500"
                      placeholder={
                        playerStats.lives <= 0
                          ? "You're out of lives..."
                          : "Type your guess..."
                      }
                      disabled={playerStats.lives <= 0}
                      autoComplete="off"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={playerStats.lives <= 0 || !answer.trim()}
                      className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Guess
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Pre-game / Game Over State */
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="text-center min-h-[450px] flex flex-col justify-center items-center"
          >
            {isGameOver && Object.keys(finalScores).length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
              >
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Crown className="w-8 h-8 text-amber-400" />
                  <h2 className="text-3xl font-bold text-white">
                    Final Scores
                  </h2>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                  {sortedScores.map(({ player, score }, index) => {
                    const icons = [
                      <Crown key="crown" className="w-5 h-5 text-amber-400" />,
                      <Medal key="medal" className="w-5 h-5 text-gray-300" />,
                      <Award key="award" className="w-5 h-5 text-orange-400" />,
                    ];
                    const bgColors = [
                      "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-b border-amber-500/20",
                      "bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-b border-white/5",
                      "bg-gradient-to-r from-orange-400/10 to-orange-500/5 border-b border-white/5",
                    ];

                    return (
                      <motion.div
                        key={player}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.15 }}
                        className={`flex justify-between items-center p-4 ${
                          bgColors[index] || "border-b border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {index < 3 ? (
                            icons[index]
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center text-gray-500 text-sm font-mono">
                              {index + 1}
                            </span>
                          )}
                          <span
                            className={`font-semibold ${
                              index === 0 ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {player}
                          </span>
                        </div>
                        <span
                          className={`font-bold text-lg ${
                            index === 0
                              ? "text-amber-300"
                              : "text-gray-300"
                          }`}
                        >
                          {score}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={handleStartGame}
                  className="mt-8 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-lg font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center gap-3 mx-auto"
                >
                  <Play className="w-5 h-5" />
                  Play Again
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
                    <Search className="w-12 h-12 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </motion.div>
                </div>
                <div>
                  <p className="text-gray-300 text-lg mb-1">
                    Ready to play?
                  </p>
                  <p className="text-gray-500 text-sm">
                    Guess Google's autocomplete suggestions!
                  </p>
                </div>
                <button
                  onClick={handleStartGame}
                  className="px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-lg font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 flex items-center gap-3"
                >
                  <Play className="w-5 h-5" />
                  Start Game
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameArea;