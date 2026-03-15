"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "lucide-react";

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
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
      <h3 className="text-xs text-gray-400 uppercase tracking-wider px-2 mb-2 font-semibold">
        Players ({player.length})
      </h3>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1.5">
          {player.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors p-2.5 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-medium text-white text-sm">{p.name}</span>
              </div>
              <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-md">
                {playerStats.score || 0} pts
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlayerList;
