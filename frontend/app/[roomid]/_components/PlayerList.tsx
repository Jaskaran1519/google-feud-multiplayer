"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Users } from "lucide-react";

interface Player {
  id: number;
  name: string;
  score: number;
}

interface PlayerStats {
  lives: number;
  score: number;
}

interface PlayerListProps {
  player: Player[];
  playerStats: PlayerStats;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  player,
  playerStats,
}) => {
  return (
    <ScrollArea className="h-[200px]">
      <div className="space-y-2">
        {player.map((p) => {
          return (
            <div
              key={p.id}
              className="flex justify-between items-center bg-gray-100 p-2 rounded-md"
            >
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-black">{p.name}</span>
              </div>
              <span className="text-sm font-semibold text-blue-600">
                Score: {playerStats.score || 0}
              </span>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default PlayerList;
