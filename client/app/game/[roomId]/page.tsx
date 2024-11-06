"use client";

import { useSocket } from "../../../contexts/socketContext";
import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { GameState, ChatMessage } from "@/types/game";

export default function GameRoom() {
  const { roomId } = useParams();
  const {
    isConnected,
    gameState,
    messages,
    sendGameAction,
    sendChatMessage,
    joinRoom,
  } = useSocket();

  const [guess, setGuess] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");

  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(roomId as string);
    }
  }, [isConnected, roomId]);

  const handleGuessSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guess.trim()) {
      sendGameAction("submitGuess", { guess, roomId });
      setGuess("");
    }
  };

  const handleChatSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput);
      setChatInput("");
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center h-screen">
        Connecting...
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Game Area */}
        <div className="col-span-2 border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Game Room: {roomId}</h2>
          {gameState && (
            <div>
              <div className="mb-2">
                Round: {(gameState as GameState).round}
              </div>
              <div className="mb-2">
                Current Word: {(gameState as GameState).currentWord}
              </div>
              <div>
                <h3 className="font-bold mt-4">Scores:</h3>
                {(gameState as GameState).scores &&
                  Object.entries((gameState as GameState).scores || {}).map(
                    ([player, score]) => (
                      <div key={player} className="mb-1">
                        {player}: {score}
                      </div>
                    )
                  )}
              </div>

              <form onSubmit={handleGuessSubmit} className="mt-4">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="border p-2 rounded mr-2"
                  placeholder="Enter your guess..."
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Submit Guess
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="border rounded p-4">
          <h3 className="font-bold mb-4">Chat</h3>
          <div className="h-64 overflow-y-auto mb-4 space-y-2">
            {messages.map((msg: ChatMessage, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <span className="font-bold">{msg.userId}: </span>
                {msg.message}
              </div>
            ))}
          </div>

          <form onSubmit={handleChatSubmit}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="border p-2 rounded w-full mb-2"
              placeholder="Type a message..."
            />
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
