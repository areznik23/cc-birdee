import { Session } from './session';

export interface LoopDetectionResult {
  hasLoops: boolean;
  patterns: string[];
  suggestion: string;
  loopIndices?: number[]; // Indices of messages that form loops
}

export interface DeveloperStrain {
  score: number; // 0-10
  components: {
    complexityLoad: number; // 0-5
    contextSwitching: number; // 0-3
    recoveryDemand: number; // 0-2
  };
  zone: 'low' | 'optimal' | 'overreaching';
  insights: string[];
}

export interface PromptCharacteristics {
  hasCodeRefs: boolean;
  hasTechTerms: boolean;
  isQuestion: boolean;
  hasDirective: boolean;
  hasConstraints: boolean;
  hasNextSteps: boolean;
  length: number;
}

export interface SessionComparison {
  sessionA: Session;
  sessionB: Session;
  improvements: {
    metric: string;
    change: number;
    percentChange: number;
    improved: boolean;
  }[];
}

export interface WeeklyInsights {
  sessions: Session[];
  totalSessions: number;
  avgSessionScore: number;
  totalTimeSaved: number; // minutes
  improvementAreas: string[];
  topPatterns: string[];
  weekOverWeekChange: {
    score: number;
    time: number;
    quality: number;
    loops: number;
  };
}