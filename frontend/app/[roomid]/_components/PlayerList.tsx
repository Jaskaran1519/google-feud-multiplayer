"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "lucide-react";

interface Player {
  id: number;
  name: string;
  score: number;
}

interface PlayerListProps {
  player: Player[];
  allPlayerStats: Record<string, { lives: number; score: number }>;
}

export const PlayerList: React.FC<PlayerListProps> = ({
  player,
  allPlayerStats,
}) => {
  // Sort players by score (descending) for a leaderboard feel
  const sortedPlayers = [...player].sort((a, b) => {
    const scoreA = allPlayerStats[a.name]?.score ?? 0;
    const scoreB = allPlayerStats[b.name]?.score ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
      <h3 className="text-xs text-gray-400 uppercase tracking-wider px-2 mb-2 font-semibold">
        Players ({player.length})
      </h3>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1.5">
          {sortedPlayers.map((p, index) => {
            const stats = allPlayerStats[p.name];
            const playerScore = stats?.score ?? 0;

            return (
              <div
                key={p.id}
                className={`flex justify-between items-center p-2.5 rounded-lg transition-colors ${
                  index === 0 && playerScore > 0
                    ? "bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      index === 0 && playerScore > 0
                        ? "bg-gradient-to-br from-amber-400 to-amber-600"
                        : "bg-gradient-to-br from-violet-500 to-purple-600"
                    }`}
                  >
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-medium text-white text-sm">{p.name}</span>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                    index === 0 && playerScore > 0
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-violet-400 bg-violet-500/10"
                  }`}
                >
                  {playerScore} pts
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlayerList;
