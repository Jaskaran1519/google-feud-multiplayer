//app/[roomid]/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
const ChatArea = dynamic(() => import('./_components/ChatArea'), { ssr: false });
import PlayerList from "./_components/PlayerList";
import { io, Socket } from "socket.io-client";
import { GameArea } from "./_components/GameArea";
import { Message, GameState, PlayerStats } from "@/types/game";
import { Pacifico } from "next/font/google";

export const runtime = "edge";

const herofont = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
});

export default function Page() {
  const params = useParams();
  const roomid = params.roomid as string;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [player, setPlayer] = useState<
    { id: number; name: string; score: number }[]
  >([]);
  const [username, setUsername] = useState<string>("");
  const [gameState, setGameState] = useState<GameState>({
    isActive: false,
    round: 0,
    totalRounds: 5,
    currentQuestion: undefined,
    scores: {},
  });
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    lives: 3,
    score: 0,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("playerName");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000/"
    );
    const socket = socketRef.current;

    const currentUsername = localStorage.getItem("playerName");
    if (!currentUsername) {
      console.error("No username found!");
      return;
    }

    // Debug logging for all socket events
    const debugEvents = [
      "initialRoomSync",
      "message",
      "updatePlayers",
      "gameStateUpdate",
      "playerStatsUpdate",
      "newQuestion",
      "gameOver",
      "gameError",
    ];

    debugEvents.forEach((event) => {
      socket.on(event, (data) => {
        console.log(`Received ${event} event:`, data);
      });
    });

    socket.on(
      "initialRoomSync",
      (data: { messages: Message[]; gameState: any; players: string[] }) => {
        console.log("Initial Room Sync Data:", data);

        // Sync game state
        if (data.gameState) {
          setGameState((prevState) => ({
            ...prevState,
            isActive: data.gameState.isActive || false,
            round: data.gameState.round || 0,
            totalRounds: data.gameState.totalRounds || 5,
            currentQuestion: data.gameState.currentQuestion,
            scores: data.gameState.scores || {},
          }));

          // Update player stats
          const playerStatesArray = Array.isArray(data.gameState.playerStates)
            ? data.gameState.playerStates
            : Object.entries(data.gameState.playerStates || {});

          const playerState = playerStatesArray.find(
            ([name]: [string, any]) => name === currentUsername
          );

          if (playerState) {
            setPlayerStats({
              lives: playerState[1].lives || 3,
              score: playerState[1].score || 0,
            });
          }
        }
      }
    );

    // Other socket event listeners (unchanged)
    socket.on("message", (data: Message) => {
      setChatMessages((prev) => [
        ...prev,
        {
          player: data.player,
          content: data.content,
          timestamp: new Date(data.timestamp),
        },
      ]);
    });

    socket.on("updatePlayers", (updatedPlayers: string[]) => {
      setPlayer(
        updatedPlayers.map((name, index) => ({ id: index, name, score: 0 }))
      );
    });

    socket.on("gameStateUpdate", (updatedGameState: any) => {
      console.log("Game State Update Received:", updatedGameState);
      setGameState((prevState) => ({
        ...prevState,
        ...updatedGameState,
      }));
    });

    socket.on("newQuestion", (questionData: any) => {
      console.log("New Question Received:", questionData);
      setGameState((prevState) => ({
        ...prevState,
        ...questionData,
        isActive: true,
      }));
    });

    socket.on("playerStatsUpdate", (statsUpdate: any) => {
      if (currentUsername && statsUpdate[currentUsername]) {
        setPlayerStats((prev) => ({
          lives: statsUpdate[currentUsername].lives,
          score: statsUpdate[currentUsername].score,
        }));
      }
    });

    // Join room
    socket.emit("joinRoom", {
      roomName: roomid,
      username: currentUsername,
    });

    return () => {
      socket.off("initialRoomSync");
      socket.off("message");
      socket.off("updatePlayers");
      socket.off("gameStateUpdate");
      socket.off("playerStatsUpdate");
      socket.off("newQuestion");
      socket.emit("leaveRoom", roomid);
      socket.disconnect();
    };
  }, [roomid]);

  const sendMessage = () => {
    const currentUsername = localStorage.getItem("playerName");
    if (message.trim() && currentUsername) {
      socketRef.current?.emit("message", {
        roomName: roomid,
        username: currentUsername,
        message: message.trim(),
      });
      setMessage("");
    }
  };

  return (
    <div className="w-[90%] max-w-[1600px] mx-auto min-h-screen">
      <header className=" backdrop-blur-md p-4 text-black">
        <div className="container mx-auto flex justify-between items-center">
          <h1
            className={` ${herofont.className} text-3xl font-bold text-white`}
          >
            Googussy
          </h1>
          <div className="text-md text-gray-200 md:flex gap-2 items-center hidden ">
            <h2 className="font-semibold text-lg text-white">Room ID:</h2>
            {roomid}
          </div>
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>

            <SheetTitle className="hidden">hello</SheetTitle>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[400px] bg-zinc-900 text-white"
            >
              <div className="text-md text-gray-200 flex gap-2 items-center ">
                <h2 className="font-semibold text-lg text-white">Room ID:</h2>
                {roomid}
              </div>
              <h2 className="visually-hidden mt-12 mb-5 text-white font-semibold text-lg">
                Player List
              </h2>
              <PlayerList player={player} playerStats={playerStats} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="container mx-auto p-4 flex flex-col lg:flex-row gap-4">
        <div className="flex-grow lg:w-2/3 flex flex-col gap-4">
          <GameArea
            socket={socketRef.current || undefined}
            roomId={roomid}
            gameState={gameState}
            playerStats={playerStats}
          />
          <div className="hidden lg:block">
            <PlayerList player={player} playerStats={playerStats} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ChatArea
            messages={chatMessages}
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
          />
        </div>
      </main>
    </div>
  );
}
