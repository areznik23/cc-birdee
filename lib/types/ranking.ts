export interface GlobalRanking {
  sessionId: string;
  score: number;
  rank: number;
  percentile: number;
  timestamp: Date;
  anonymousId?: string; // For public leaderboards
}

export interface RankingStats {
  totalSessions: number;
  userRank: number;
  userPercentile: number;
  scoreDistribution: {
    range: string; // e.g., "0-10", "10-20"
    count: number;
  }[];
  topScores: GlobalRanking[];
}

export interface UserProgress {
  currentRank: number;
  previousRank: number;
  rankChange: number;
  scoreHistory: {
    date: Date;
    score: number;
    rank: number;
  }[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt?: Date;
  icon?: string;
  criteria: {
    type: 'score' | 'streak' | 'improvement' | 'milestone';
    value: number;
  };
}