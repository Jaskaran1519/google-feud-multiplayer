export interface GameState {
    currentWord?: string;
    scores?: Record<string, number>;
    players?: string[];
    round?: number;
    status?: string;
  }
  
  export interface ChatMessage {
    userId: string;
    message: string;
    timestamp: Date;
  }