export interface Message {
  player: string;
  content: string;
  timestamp: Date;
}

export interface GameState {
  isActive: boolean;
  round: number;
  totalRounds: number;
  currentQuestion?: {
    question: string;
    suggestions: string[];
  };
  scores: Record<string, number>;
}

export interface PlayerStats {
  lives: number;
  score: number;
}