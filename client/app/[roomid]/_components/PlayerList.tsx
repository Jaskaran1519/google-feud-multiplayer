// PlayerList.tsx
"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";

interface Player {
  id: number;
  name: string;
  score: number;
}

interface PlayerListProps {
  player: Player[];
}

export const PlayerList: React.FC<PlayerListProps> = ({ player }) => {
  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2">
        {player.map((player) => (
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
};

export default PlayerList;
