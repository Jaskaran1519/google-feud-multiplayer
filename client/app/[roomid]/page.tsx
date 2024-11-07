"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users, Send, Menu } from "lucide-react";

export const GamePage: React.FC = () => {
  const params = useParams();
  const roomid = params.roomid; // Access roomid from the params

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Mock data
  const question = "What are the most popular pizza toppings?";
  const options = [
    "Pepperoni",
    "Cheese",
    "Mushrooms",
    "Onions",
    "Sausage",
    "Bacon",
    "Black olives",
    "Green peppers",
    "Pineapple",
    "Spinach",
  ];
  const players = [
    { id: 1, name: "Player 1", score: 1000 },
    { id: 2, name: "Player 2", score: 850 },
    { id: 3, name: "Player 3", score: 720 },
    { id: 4, name: "Player 4", score: 500 },
  ];
  const chatMessages = [
    { id: 1, player: "Player 1", message: "Good luck everyone!" },
    { id: 2, player: "Player 2", message: "This is fun!" },
    { id: 3, player: "Player 3", message: "I'm going to win this!" },
  ];

  return (
    <div className="w-[90%] max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col">
        <header className="bg-white/10 backdrop-blur-md p-4 text-black">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Googussy</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Room ID: {roomid}</span>
              <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <PlayerList players={players} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 flex flex-col md:flex-row gap-4 overflow-hidden">
          <div className="flex-grow flex flex-col gap-4">
            <Card className="flex-grow">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  {question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-12 text-left justify-start"
                    >
                      {index + 1}. {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="md:hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatArea messages={chatMessages} />
              </CardContent>
            </Card>
          </div>

          <aside className="w-full md:w-80 flex flex-col gap-4">
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Players</CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerList players={players} />
              </CardContent>
            </Card>
            <Card className="hidden md:block flex-grow">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                <ChatArea messages={chatMessages} />
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
};

function PlayerList({
  players,
}: {
  players: { id: number; name: string; score: number }[];
}) {
  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2">
        {players.map((player) => (
          <div key={player.id} className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{player.name}</span>
            </div>
            <span className="text-sm font-semibold">{player.score}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function ChatArea({
  messages,
}: {
  messages: { id: number; player: string; message: string }[];
}) {
  return (
    <>
      <ScrollArea className="flex-grow mb-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-muted p-2 rounded-lg">
              <p className="font-semibold">{msg.player}</p>
              <p>{msg.message}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex gap-2">
        <Input placeholder="Type a message..." />
        <Button size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

export default GamePage;
