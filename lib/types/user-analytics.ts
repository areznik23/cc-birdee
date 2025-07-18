import { Session, ActivityType, ToolUsage } from './session';

export interface TechnicalStrength {
  category: string; // e.g., "TypeScript", "React", "Node.js", "Architecture"
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidenceScore: number; // 0-100
  evidence: CodeExample[];
  growthTrend: 'improving' | 'stable' | 'declining';
  advancedPatterns?: string[]; // Advanced engineering patterns detected
  consistencyScore?: number; // How consistent the strength is across sessions
}

export interface CodingTendency {
  pattern: string; // e.g., "Defensive programming", "Early optimization", "Test-driven"
  frequency: number; // percentage of sessions where this appears
  impact: 'positive' | 'neutral' | 'negative';
  examples: CodeExample[];
  recommendation?: string;
}

export interface ProblemSolvingPattern {
  approach: string; // e.g., "Top-down", "Iterative refinement", "Research-first"
  effectiveness: number; // 0-100
  contexts: string[]; // Where this approach is used
  strengths: string[];
  weaknesses: string[];
}

export interface CodeExample {
  sessionId: string;
  timestamp: Date;
  code: string;
  context: string;
  explanation: string;
  messageIndex: number;
}

export interface UserWeakness {
  area: string;
  severity: 'minor' | 'moderate' | 'significant';
  frequency: number; // How often this appears
  impact: string; // Description of impact on productivity
  recommendations: Recommendation[];
  examples: CodeExample[];
  rootCauses?: string[]; // Root causes identified for the weakness
  improvementPotential?: number; // 0-100, how much improvement is possible
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'minimal' | 'moderate' | 'significant';
  expectedImprovement: string;
  resources?: Resource[];
}

export interface Resource {
  type: 'documentation' | 'tutorial' | 'course' | 'practice';
  title: string;
  url?: string;
  description: string;
}

export interface SessionInsight {
  sessionId: string;
  timestamp: Date;
  keyTakeaways: string[];
  technicalPatterns: TechnicalPattern[];
  effectiveness: EffectivenessMetrics;
  recommendations: string[];
  analysis?: string; // Free-form analysis text
}

export interface TechnicalPattern {
  pattern: string;
  occurrences: number;
  impact: 'positive' | 'neutral' | 'negative';
  context: string;
}

export interface EffectivenessMetrics {
  taskCompletionRate: number; // 0-100
  solutionQuality: number; // 0-100
  timeEfficiency: number; // 0-100
  iterationCount: number;
  toolUtilization: number; // 0-100
  problemComplexity?: number; // 0-10, complexity of the problem solved
}

export interface UserProfile {
  userId: string;
  lastUpdated: Date;
  totalSessions: number;
  totalHours: number;
  technicalStrengths: TechnicalStrength[];
  weaknesses: UserWeakness[];
  codingTendencies: CodingTendency[];
  problemSolvingPatterns: ProblemSolvingPattern[];
  preferredTools: ToolPreference[];
  growthAreas: GrowthArea[];
  overallSkillLevel: SkillLevel;
}

export interface ToolPreference {
  toolName: string;
  usageFrequency: number;
  proficiency: 'learning' | 'competent' | 'proficient' | 'expert';
  contexts: string[]; // When they use this tool
}

export interface GrowthArea {
  skill: string;
  currentLevel: number; // 0-100
  targetLevel: number; // 0-100
  improvementRate: number; // percentage per week
  recommendedActions: Recommendation[];
  timeline: string; // Estimated time to reach target
}

export interface SkillLevel {
  overall: number; // 0-100
  breakdown: {
    problemSolving: number;
    codeQuality: number;
    toolMastery: number;
    efficiency: number;
    communication: number;
  };
  trajectory: 'improving' | 'stable' | 'declining';
}

export interface AnalyticsSession {
  session: Session;
  insights: SessionInsight;
  processedAt: Date;
  processingVersion: string;
}

export interface UserAnalyticsSummary {
  profile: UserProfile;
  recentSessions: AnalyticsSession[];
  weeklyProgress: WeeklyProgress;
  recommendations: PrioritizedRecommendations;
}

export interface WeeklyProgress {
  weekStartDate: Date;
  sessionsCompleted: number;
  hoursSpent: number;
  skillImprovements: SkillImprovement[];
  challengesOvercome: string[];
  areasOfFocus: string[];
}

export interface SkillImprovement {
  skill: string;
  previousLevel: number;
  currentLevel: number;
  percentageGain: number;
}

export interface PrioritizedRecommendations {
  immediate: Recommendation[]; // Do this week
  shortTerm: Recommendation[]; // Do this month
  longTerm: Recommendation[]; // Strategic improvements
}

export interface O3ProcessingRequest {
  sessionData: Session;
  analysisDepth: 'quick' | 'standard' | 'deep';
  focusAreas?: string[]; // Specific areas to analyze
}

export interface O3ProcessingResult {
  insights: SessionInsight;
  technicalStrengths: TechnicalStrength[];
  weaknessesIdentified: UserWeakness[];
  codingPatterns: CodingTendency[];
  recommendations: Recommendation[];
  confidence: number; // 0-100, how confident the analysis is
}