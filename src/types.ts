export interface GameMeta {
  game_id: string;
  username: string;
  white_username: string;
  black_username: string;
  white_rating: number;
  black_rating: number;
  white_result: string;
  black_result: string;
  date: string;
  time_class: 'rapid' | 'blitz' | 'bullet' | 'daily';
  time_control: string;
  color: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  opening: string;
  white_accuracy: number;
  black_accuracy: number;
}

export interface PlayerProfile {
  username: string;
  currentRating: number;
  highestRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  yearsActive: number;
  totalMoves: number;
  avgAccuracy: number;
  brilliantCount: number;
  greatCount: number;
  bestCount: number;
  excellentCount: number;
  goodCount: number;
  inaccuracyCount: number;
  mistakeCount: number;
  blunderCount: number;
  favoriteOpening: string;
  bestOpening: string;
  mostAccurateGame: {
    opponent: string;
    accuracy: number;
    date: string;
    result: string;
  } | null;
  leastAccurateGame: {
    opponent: string;
    accuracy: number;
    date: string;
    result: string;
  } | null;
  openingIntel: {
    opening: string;
    count: number;
    winRate: number;
    avgAccuracy: number;
  }[];
}

export interface PlayerStatsResponse {
  profile: PlayerProfile;
  trends: {
    ratingTrend: { name: string; rating: number }[];
    accuracyTrend: { name: string; accuracy: number }[];
    winRateTrend: { name: string; winRate: number }[];
    mistakesTrend: { name: string; mistakes: number }[];
  };
}

export interface MoveAnalysis {
  ply: number;
  san: string;
  color: 'w' | 'b';
  from: string;
  to: string;
  evaluation: number; // centipawns or mate score
  classification: 'Brilliant' | 'Great' | 'Excellent' | 'Good' | 'Best' | 'Book' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  bestMove: string;
}

export interface CriticalMoment {
  ply: number;
  san: string;
  type: string;
  description: string;
}

export interface GameReviewResponse {
  accuracy: number;
  opponentAccuracy: number;
  perfRating: number;
  bestMove: string;
  brilliantMove: string;
  biggestMistake: string;
  criticalMoments: CriticalMoment[];
  moves: MoveAnalysis[];
  aiSummary: string;
  pgn: string;
}

export interface BrilliantMoveDetail {
  gameId: string;
  opponent: string;
  ratingAtTime: number;
  date: string;
  timeControl: string;
  opening: string;
  position: {
    fenBefore: string;
    fenAfter: string;
    sanMove: string;
    explanation: string;
    evalBefore: number;
    evalAfter: number;
  };
  evalBefore: number;
  evalAfter: number;
  explanation: string;
}

export interface DnaReport {
  classification: string;
  strengths: string[];
  weaknesses: string[];
  estimatedStrength: string;
  comparison: string;
}

export interface AiInsights {
  playingStyle: string;
  tacticalStrength: string;
  positionalStrength: string;
  openingQuality: string;
  middlegamePerformance: string;
  endgamePerformance: string;
  timeManagement: string;
  mostCommonMistakes: string;
  improvementTrend: string;
}
