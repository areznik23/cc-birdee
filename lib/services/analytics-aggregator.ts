import { 
  UserProfile, 
  AnalyticsSession, 
  TechnicalStrength,
  UserWeakness,
  CodingTendency,
  ProblemSolvingPattern,
  ToolPreference,
  GrowthArea,
  SkillLevel,
  WeeklyProgress,
  PrioritizedRecommendations,
  UserAnalyticsSummary,
  Recommendation,
  SessionInsight
} from '../types/user-analytics';
import { AnalyticsStorage } from './analytics-storage';

export class AnalyticsAggregator {
  private storage: AnalyticsStorage;

  constructor(storage?: AnalyticsStorage) {
    this.storage = storage || new AnalyticsStorage();
  }

  /**
   * Aggregate insights from multiple sessions to build/update user profile
   */
  async aggregateUserProfile(
    userId: string, 
    sessions: AnalyticsSession[]
  ): Promise<UserProfile> {
    // Get existing profile or create new
    const existingProfile = await this.storage.getUserProfile(userId);
    
    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime()
    );
    
    // Aggregate data from all sessions
    const technicalStrengths = this.aggregateTechnicalStrengths(sortedSessions);
    const weaknesses = this.aggregateWeaknesses(sortedSessions);
    const codingTendencies = this.aggregateCodingTendencies(sortedSessions);
    const problemSolvingPatterns = this.aggregateProblemSolvingPatterns(sortedSessions);
    const toolPreferences = this.aggregateToolPreferences(sortedSessions);
    const growthAreas = this.identifyGrowthAreas(technicalStrengths, weaknesses);
    const overallSkillLevel = this.calculateOverallSkillLevel(sortedSessions, technicalStrengths);
    
    const profile: UserProfile = {
      userId,
      lastUpdated: new Date(),
      totalSessions: sortedSessions.length,
      totalHours: this.calculateTotalHours(sortedSessions),
      technicalStrengths,
      weaknesses,
      codingTendencies,
      problemSolvingPatterns,
      preferredTools: toolPreferences,
      growthAreas,
      overallSkillLevel
    };
    
    // Save updated profile
    await this.storage.saveUserProfile(userId, profile);
    
    return profile;
  }

  /**
   * Create a comprehensive analytics summary for the user
   */
  async createUserAnalyticsSummary(userId: string): Promise<UserAnalyticsSummary | null> {
    const profile = await this.storage.getUserProfile(userId);
    if (!profile) {
      // Return null to indicate no data available yet
      return null;
    }
    
    // Get recent sessions
    const allSessions = await this.storage.listAnalyticsSessions();
    const recentSessions = allSessions.slice(0, 10); // Last 10 sessions
    
    // Calculate weekly progress
    const weeklyProgress = this.calculateWeeklyProgress(recentSessions);
    
    // Prioritize recommendations
    const recommendations = this.prioritizeRecommendations(profile, recentSessions);
    
    return {
      profile,
      recentSessions,
      weeklyProgress,
      recommendations
    };
  }

  /**
   * Aggregate technical strengths across sessions
   */
  private aggregateTechnicalStrengths(sessions: AnalyticsSession[]): TechnicalStrength[] {
    const strengthAnalysis = new Map<string, {
      scores: number[];
      complexity: number[];
      evidence: any[];
      patterns: Map<string, number>;
      advancedIndicators: Set<string>;
    }>();
    
    // Deep analysis of each session
    sessions.forEach(session => {
      if (!session.insights) return;
      
      // Analyze code quality and patterns
      const sessionStrengths = this.analyzeSessionForStrengths(session);
      
      sessionStrengths.forEach(strength => {
        const existing = strengthAnalysis.get(strength.category) || {
          scores: [],
          complexity: [],
          evidence: [],
          patterns: new Map(),
          advancedIndicators: new Set()
        };
        
        existing.scores.push(strength.score);
        existing.complexity.push(strength.complexity);
        existing.evidence.push(...strength.evidence);
        
        // Track specific patterns
        strength.patterns.forEach((count, pattern) => {
          existing.patterns.set(pattern, (existing.patterns.get(pattern) || 0) + count);
        });
        
        // Track advanced engineering indicators
        strength.advancedIndicators.forEach(indicator => {
          existing.advancedIndicators.add(indicator);
        });
        
        strengthAnalysis.set(strength.category, existing);
      });
    });
    
    // Convert to TechnicalStrength array with sophisticated scoring
    return Array.from(strengthAnalysis.entries())
      .map(([category, analysis]) => {
        const avgScore = analysis.scores.reduce((a, b) => a + b, 0) / analysis.scores.length;
        const avgComplexity = analysis.complexity.reduce((a, b) => a + b, 0) / analysis.complexity.length;
        
        // Calculate confidence based on multiple factors
        const confidence = this.calculateConfidence(
          avgScore,
          analysis.scores.length,
          avgComplexity,
          analysis.advancedIndicators.size
        );
        
        // Determine proficiency level based on holistic analysis
        const proficiencyLevel = this.determineProficiencyLevel(
          avgScore,
          avgComplexity,
          analysis.advancedIndicators,
          analysis.patterns
        );
        
        return {
          category,
          proficiencyLevel,
          confidenceScore: confidence,
          evidence: this.selectBestEvidence(analysis.evidence, 5),
          growthTrend: this.calculateTrend(analysis.scores),
          advancedPatterns: Array.from(analysis.advancedIndicators),
          consistencyScore: this.calculateConsistency(analysis.scores)
        };
      })
      .filter(strength => strength.confidenceScore > 40) // Only significant strengths
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Aggregate weaknesses across sessions
   */
  private aggregateWeaknesses(sessions: AnalyticsSession[]): UserWeakness[] {
    const weaknessAnalysis = new Map<string, {
      occurrences: number;
      severity: ('minor' | 'moderate' | 'significant')[];
      impacts: string[];
      sessionIds: string[];
      rootCauses: Set<string>;
      patterns: Map<string, number>;
    }>();
    
    // Deep analysis of each session for weaknesses
    sessions.forEach(session => {
      const sessionWeaknesses = this.analyzeSessionForWeaknesses(session);
      
      sessionWeaknesses.forEach(weakness => {
        const existing = weaknessAnalysis.get(weakness.area) || {
          occurrences: 0,
          severity: [],
          impacts: [],
          sessionIds: [],
          rootCauses: new Set(),
          patterns: new Map()
        };
        
        existing.occurrences++;
        existing.severity.push(weakness.severity);
        existing.impacts.push(weakness.impact);
        existing.sessionIds.push(session.session.id);
        
        // Add root causes
        weakness.rootCauses.forEach(cause => existing.rootCauses.add(cause));
        
        // Track patterns
        weakness.patterns.forEach((count, pattern) => {
          existing.patterns.set(pattern, (existing.patterns.get(pattern) || 0) + count);
        });
        
        weaknessAnalysis.set(weakness.area, existing);
      });
    });
    
    // Convert to UserWeakness array with sophisticated analysis
    return Array.from(weaknessAnalysis.entries())
      .filter(([_, data]) => {
        // Filter based on significance, not just occurrence count
        const avgSeverityScore = this.severityToScore(data.severity);
        return data.occurrences >= 2 || avgSeverityScore >= 2;
      })
      .map(([area, data]) => {
        const severity = this.calculateAverageSeverity(data.severity);
        const frequency = (data.occurrences / sessions.length) * 100;
        
        return {
          area,
          severity,
          frequency,
          impact: this.generateImpactSummary(data.impacts, data.rootCauses),
          recommendations: this.generateAdvancedRecommendations(
            area, 
            severity, 
            data.rootCauses,
            data.patterns
          ),
          examples: this.extractWeaknessExamples(area, data.sessionIds, sessions),
          rootCauses: Array.from(data.rootCauses),
          improvementPotential: this.calculateImprovementPotential(severity, frequency)
        };
      })
      .sort((a, b) => {
        // Sort by severity then frequency
        const severityOrder = { significant: 3, moderate: 2, minor: 1 };
        const aSeverity = severityOrder[a.severity];
        const bSeverity = severityOrder[b.severity];
        
        if (aSeverity !== bSeverity) return bSeverity - aSeverity;
        return b.frequency - a.frequency;
      });
  }

  /**
   * Aggregate coding tendencies
   */
  private aggregateCodingTendencies(sessions: AnalyticsSession[]): CodingTendency[] {
    const tendencyMap = new Map<string, {
      count: number;
      impacts: ('positive' | 'neutral' | 'negative')[];
      examples: any[];
    }>();
    
    sessions.forEach(session => {
      if (!session.insights || !session.insights.technicalPatterns) return;
      
      // Aggregate tendencies from session patterns
      session.insights.technicalPatterns.forEach(pattern => {
        if (!pattern || !pattern.pattern) return;
        
        const existing = tendencyMap.get(pattern.pattern) || {
          count: 0,
          impacts: [],
          examples: []
        };
        
        existing.count++;
        existing.impacts.push(pattern.impact || 'neutral');
        
        tendencyMap.set(pattern.pattern, existing);
      });
    });
    
    return Array.from(tendencyMap.entries())
      .filter(([_, data]) => data.count >= 3) // Minimum 3 occurrences
      .map(([pattern, data]) => ({
        pattern,
        frequency: (data.count / sessions.length) * 100,
        impact: this.calculatePredominantImpact(data.impacts),
        examples: data.examples.slice(0, 3)
      }));
  }

  /**
   * Aggregate problem-solving patterns
   */
  private aggregateProblemSolvingPatterns(sessions: AnalyticsSession[]): ProblemSolvingPattern[] {
    const patternMap = new Map<string, {
      effectiveness: number[];
      contexts: Set<string>;
      strengths: Set<string>;
      weaknesses: Set<string>;
    }>();
    
    // For now, return some default patterns
    // In a real implementation, this would analyze session flow
    return [
      {
        approach: 'Research-First',
        effectiveness: 85,
        contexts: ['New technologies', 'Complex problems'],
        strengths: ['Thorough understanding', 'Well-informed decisions'],
        weaknesses: ['Can be time-consuming']
      }
    ];
  }

  /**
   * Aggregate tool preferences
   */
  private aggregateToolPreferences(sessions: AnalyticsSession[]): ToolPreference[] {
    const toolUsage = new Map<string, {
      count: number;
      contexts: Set<string>;
    }>();
    
    sessions.forEach(session => {
      Object.entries(session.session.metrics.toolUsage).forEach(([tool, count]) => {
        const existing = toolUsage.get(tool) || {
          count: 0,
          contexts: new Set()
        };
        
        existing.count += count;
        existing.contexts.add(session.session.summary.substring(0, 50));
        
        toolUsage.set(tool, existing);
      });
    });
    
    return Array.from(toolUsage.entries()).map(([toolName, data]) => ({
      toolName,
      usageFrequency: data.count,
      proficiency: this.calculateToolProficiency(data.count),
      contexts: Array.from(data.contexts).slice(0, 5)
    }));
  }

  /**
   * Identify growth areas based on strengths and weaknesses
   */
  private identifyGrowthAreas(
    strengths: TechnicalStrength[], 
    weaknesses: UserWeakness[]
  ): GrowthArea[] {
    const growthAreas: GrowthArea[] = [];
    
    // Convert weaknesses to growth areas
    weaknesses.forEach(weakness => {
      growthAreas.push({
        skill: weakness.area,
        currentLevel: 30, // Low level for weaknesses
        targetLevel: 70,
        improvementRate: 5, // 5% per week
        recommendedActions: weakness.recommendations,
        timeline: '2-3 months'
      });
    });
    
    // Add growth areas for intermediate strengths
    strengths
      .filter(s => s.proficiencyLevel === 'intermediate')
      .forEach(strength => {
        growthAreas.push({
          skill: strength.category,
          currentLevel: 60,
          targetLevel: 85,
          improvementRate: 3,
          recommendedActions: [{
            title: `Advance ${strength.category} skills`,
            description: `Deepen expertise in ${strength.category}`,
            priority: 'medium',
            effort: 'moderate',
            expectedImprovement: 'Reach advanced proficiency'
          }],
          timeline: '1-2 months'
        });
      });
    
    return growthAreas;
  }

  /**
   * Calculate overall skill level
   */
  private calculateOverallSkillLevel(
    sessions: AnalyticsSession[],
    strengths: TechnicalStrength[]
  ): SkillLevel {
    // Calculate average scores from recent sessions
    const recentSessions = sessions.slice(0, 5);
    
    const avgEffectiveness = recentSessions.reduce((sum, s) => 
      sum + s.insights.effectiveness.solutionQuality, 0
    ) / recentSessions.length;
    
    const avgEfficiency = recentSessions.reduce((sum, s) => 
      sum + s.insights.effectiveness.timeEfficiency, 0
    ) / recentSessions.length;
    
    const avgToolMastery = recentSessions.reduce((sum, s) => 
      sum + s.insights.effectiveness.toolUtilization, 0
    ) / recentSessions.length;
    
    // Calculate trajectory
    const trajectory = this.calculateTrajectory(sessions);
    
    return {
      overall: Math.round((avgEffectiveness + avgEfficiency + avgToolMastery) / 3),
      breakdown: {
        problemSolving: Math.round(avgEffectiveness),
        codeQuality: Math.round(avgEffectiveness * 0.9),
        toolMastery: Math.round(avgToolMastery),
        efficiency: Math.round(avgEfficiency),
        communication: 75 // Default for now
      },
      trajectory
    };
  }

  /**
   * Calculate weekly progress
   */
  private calculateWeeklyProgress(sessions: AnalyticsSession[]): WeeklyProgress {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklySessions = sessions.filter(s => 
      s && s.session && new Date(s.session.startTime) >= weekAgo
    );
    
    console.log(`[Analytics Aggregator] Calculating weekly progress for ${weeklySessions.length} sessions`);
    
    return {
      weekStartDate: weekAgo,
      sessionsCompleted: weeklySessions.length,
      hoursSpent: this.calculateTotalHours(weeklySessions),
      skillImprovements: [], // Would calculate actual improvements
      challengesOvercome: this.extractChallenges(weeklySessions),
      areasOfFocus: this.extractFocusAreas(weeklySessions)
    };
  }

  /**
   * Prioritize recommendations
   */
  private prioritizeRecommendations(
    profile: UserProfile,
    recentSessions: AnalyticsSession[]
  ): PrioritizedRecommendations {
    const allRecommendations: Recommendation[] = [];
    
    // Collect recommendations from profile
    profile.growthAreas.forEach(area => {
      allRecommendations.push(...area.recommendedActions);
    });
    
    // Sort by priority and effort
    const sorted = allRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const effortOrder = { minimal: 1, moderate: 2, significant: 3 };
      
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      return effortOrder[a.effort] - effortOrder[b.effort];
    });
    
    return {
      immediate: sorted.filter(r => r.priority === 'high').slice(0, 3),
      shortTerm: sorted.filter(r => r.priority === 'medium').slice(0, 5),
      longTerm: sorted.filter(r => r.priority === 'low').slice(0, 5)
    };
  }

  // Helper methods
  private calculateTotalHours(sessions: AnalyticsSession[]): number {
    return sessions.reduce((sum, s) => sum + (s.session.duration / 60), 0);
  }

  private categorizePattern(pattern: string): string {
    // Simple categorization logic
    if (!pattern) return 'General Programming';
    
    const lower = pattern.toLowerCase();
    if (lower.includes('typescript')) return 'TypeScript';
    if (lower.includes('react')) return 'React';
    if (lower.includes('test')) return 'Testing';
    if (lower.includes('api')) return 'API Development';
    if (lower.includes('database')) return 'Database';
    return 'General Programming';
  }

  private scoreToProficiency(score: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (score >= 90) return 'expert';
    if (score >= 75) return 'advanced';
    if (score >= 50) return 'intermediate';
    return 'beginner';
  }

  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';
    
    const recent = scores.slice(-3);
    const older = scores.slice(0, -3);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'improving';
    if (recentAvg < olderAvg * 0.9) return 'declining';
    return 'stable';
  }

  private calculateAverageSeverity(
    severities: ('minor' | 'moderate' | 'significant')[]
  ): 'minor' | 'moderate' | 'significant' {
    const severityScores = { minor: 1, moderate: 2, significant: 3 };
    const avg = severities.reduce((sum, s) => sum + severityScores[s], 0) / severities.length;
    
    if (avg >= 2.5) return 'significant';
    if (avg >= 1.5) return 'moderate';
    return 'minor';
  }

  private summarizeImpacts(impacts: string[]): string {
    return impacts.slice(0, 3).join('; ').substring(0, 200) + '...';
  }

  private generateWeaknessRecommendations(area: string): Recommendation[] {
    return [{
      title: `Improve ${area}`,
      description: `Focus on strengthening your ${area} skills through practice and study`,
      priority: 'high',
      effort: 'moderate',
      expectedImprovement: `Better ${area} implementation and fewer issues`
    }];
  }

  private calculatePredominantImpact(
    impacts: ('positive' | 'neutral' | 'negative')[]
  ): 'positive' | 'neutral' | 'negative' {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    impacts.forEach(i => counts[i]++);
    
    const max = Math.max(counts.positive, counts.neutral, counts.negative);
    if (counts.positive === max) return 'positive';
    if (counts.negative === max) return 'negative';
    return 'neutral';
  }

  private calculateToolProficiency(count: number): 'learning' | 'competent' | 'proficient' | 'expert' {
    if (count >= 100) return 'expert';
    if (count >= 50) return 'proficient';
    if (count >= 20) return 'competent';
    return 'learning';
  }

  private calculateTrajectory(sessions: AnalyticsSession[]): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 3) return 'stable';
    
    const recentScores = sessions.slice(0, 3).map(s => s.session.metrics.sessionScore);
    const olderScores = sessions.slice(3, 6).map(s => s.session.metrics.sessionScore);
    
    if (olderScores.length === 0) return 'stable';
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    if (recentAvg > olderAvg * 1.05) return 'improving';
    if (recentAvg < olderAvg * 0.95) return 'declining';
    return 'stable';
  }

  private extractChallenges(sessions: AnalyticsSession[]): string[] {
    const challenges = new Set<string>();
    
    sessions.forEach(session => {
      if (session.session.metrics.loopCount > 2) {
        challenges.add('Overcame repetitive debugging cycles');
      }
      if (session.insights.effectiveness.iterationCount > 5) {
        challenges.add('Worked through complex iterative refinements');
      }
    });
    
    return Array.from(challenges);
  }

  private extractFocusAreas(sessions: AnalyticsSession[]): string[] {
    const areas = new Map<string, number>();
    
    sessions.forEach(session => {
      if (session.insights && session.insights.technicalPatterns) {
        session.insights.technicalPatterns.forEach(pattern => {
          if (pattern && pattern.pattern) {
            const category = this.categorizePattern(pattern.pattern);
            areas.set(category, (areas.get(category) || 0) + 1);
          }
        });
      }
    });
    
    return Array.from(areas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => area);
  }

  /**
   * Analyze a session for technical strengths with deep insights
   */
  private analyzeSessionForStrengths(session: AnalyticsSession): Array<{
    category: string;
    score: number;
    complexity: number;
    evidence: any[];
    patterns: Map<string, number>;
    advancedIndicators: Set<string>;
  }> {
    const strengths: Map<string, {
      category: string;
      score: number;
      complexity: number;
      evidence: any[];
      patterns: Map<string, number>;
      advancedIndicators: Set<string>;
    }> = new Map();

    // Analyze effectiveness metrics
    const { effectiveness } = session.insights;
    
    // Analyze tool usage patterns
    const toolPatterns = this.analyzeToolMastery(session);
    toolPatterns.forEach(pattern => {
      strengths.set(pattern.category, pattern);
    });

    // Analyze problem-solving approach
    const problemSolving = this.analyzeProblemSolvingApproach(session);
    if (problemSolving.score > 70) {
      strengths.set('Problem Solving', problemSolving);
    }

    // Analyze code quality indicators
    const codeQuality = this.analyzeCodeQuality(session);
    if (codeQuality.score > 60) {
      strengths.set('Code Quality', codeQuality);
    }

    // Analyze architectural thinking
    const architecture = this.analyzeArchitecturalThinking(session);
    if (architecture.score > 50) {
      strengths.set('System Architecture', architecture);
    }

    return Array.from(strengths.values());
  }

  /**
   * Analyze tool mastery from session
   */
  private analyzeToolMastery(session: AnalyticsSession): Array<{
    category: string;
    score: number;
    complexity: number;
    evidence: any[];
    patterns: Map<string, number>;
    advancedIndicators: Set<string>;
  }> {
    const toolAnalysis: Array<any> = [];
    const { toolUsage } = session.session.metrics;
    
    Object.entries(toolUsage).forEach(([tool, count]) => {
      if (count > 0) {
        const advancedIndicators = new Set<string>();
        const patterns = new Map<string, number>();
        
        // Check for advanced tool usage patterns
        if (tool === 'MultiEdit' && count > 3) {
          advancedIndicators.add('Efficient multi-file refactoring');
          patterns.set('batch_operations', count);
        }
        
        if (tool === 'Grep' && count > 5) {
          advancedIndicators.add('Advanced codebase navigation');
          patterns.set('complex_search', count);
        }
        
        if (tool === 'Task' && count > 2) {
          advancedIndicators.add('Delegation of complex searches');
          patterns.set('efficient_delegation', count);
        }
        
        const complexity = this.calculateToolComplexity(tool, count, session);
        const score = Math.min(100, 60 + (count * 5) + (complexity * 10));
        
        if (score > 70) {
          toolAnalysis.push({
            category: `${tool} Mastery`,
            score,
            complexity,
            evidence: [`Used ${tool} ${count} times effectively`],
            patterns,
            advancedIndicators
          });
        }
      }
    });
    
    return toolAnalysis;
  }

  /**
   * Analyze problem-solving approach
   */
  private analyzeProblemSolvingApproach(session: AnalyticsSession): {
    category: string;
    score: number;
    complexity: number;
    evidence: any[];
    patterns: Map<string, number>;
    advancedIndicators: Set<string>;
  } {
    const patterns = new Map<string, number>();
    const advancedIndicators = new Set<string>();
    const evidence: string[] = [];
    
    const { effectiveness } = session.insights;
    
    // Check for systematic approach
    if (effectiveness.iterationCount > 0 && effectiveness.iterationCount < 3) {
      advancedIndicators.add('Efficient iterative refinement');
      patterns.set('controlled_iteration', effectiveness.iterationCount);
    }
    
    // Check for completeness
    if (effectiveness.solutionQuality > 85) {
      advancedIndicators.add('Comprehensive solution delivery');
      patterns.set('high_quality_solutions', 1);
      evidence.push('Delivered high-quality solution');
    }
    
    // Check for time efficiency
    if (effectiveness.timeEfficiency > 80) {
      advancedIndicators.add('Time-efficient problem solving');
      patterns.set('efficient_execution', 1);
    }
    
    const complexity = effectiveness.problemComplexity || 5;
    const score = (effectiveness.solutionQuality + effectiveness.timeEfficiency) / 2;
    
    return {
      category: 'Problem Solving',
      score,
      complexity,
      evidence,
      patterns,
      advancedIndicators
    };
  }

  /**
   * Analyze code quality indicators
   */
  private analyzeCodeQuality(session: AnalyticsSession): {
    category: string;
    score: number;
    complexity: number;
    evidence: any[];
    patterns: Map<string, number>;
    advancedIndicators: Set<string>;
  } {
    const patterns = new Map<string, number>();
    const advancedIndicators = new Set<string>();
    const evidence: string[] = [];
    
    // Analyze technical patterns for code quality indicators
    if (session.insights.technicalPatterns) {
      session.insights.technicalPatterns.forEach(pattern => {
        if (!pattern) return;
        
        const patternLower = pattern.pattern?.toLowerCase() || '';
        
        if (patternLower.includes('error handling')) {
          advancedIndicators.add('Robust error handling');
          patterns.set('error_handling', (patterns.get('error_handling') || 0) + 1);
        }
        
        if (patternLower.includes('type') || patternLower.includes('typescript')) {
          advancedIndicators.add('Strong typing practices');
          patterns.set('type_safety', (patterns.get('type_safety') || 0) + 1);
        }
        
        if (patternLower.includes('test')) {
          advancedIndicators.add('Test-driven development');
          patterns.set('testing', (patterns.get('testing') || 0) + 1);
        }
        
        if (patternLower.includes('refactor')) {
          advancedIndicators.add('Code refactoring skills');
          patterns.set('refactoring', (patterns.get('refactoring') || 0) + 1);
        }
      });
    }
    
    const score = Math.min(100, 50 + (advancedIndicators.size * 10) + (patterns.size * 5));
    const complexity = patterns.size > 3 ? 7 : 5;
    
    return {
      category: 'Code Quality',
      score,
      complexity,
      evidence,
      patterns,
      advancedIndicators
    };
  }

  /**
   * Analyze architectural thinking
   */
  private analyzeArchitecturalThinking(session: AnalyticsSession): {
    category: string;
    score: number;
    complexity: number;
    evidence: any[];
    patterns: Map<string, number>;
    advancedIndicators: Set<string>;
  } {
    const patterns = new Map<string, number>();
    const advancedIndicators = new Set<string>();
    const evidence: string[] = [];
    
    // Check for architectural patterns in tool usage
    if (session.session.metrics.toolUsage['Glob'] > 3) {
      advancedIndicators.add('Systematic codebase exploration');
      patterns.set('codebase_analysis', session.session.metrics.toolUsage['Glob']);
    }
    
    if (session.session.metrics.toolUsage['Read'] > 10) {
      advancedIndicators.add('Thorough code comprehension');
      patterns.set('deep_analysis', session.session.metrics.toolUsage['Read']);
    }
    
    // Check for multi-file operations
    if (session.session.metrics.toolUsage['MultiEdit'] > 2) {
      advancedIndicators.add('Cross-cutting concern management');
      patterns.set('system_wide_changes', session.session.metrics.toolUsage['MultiEdit']);
    }
    
    const score = Math.min(100, 40 + (advancedIndicators.size * 15));
    const complexity = advancedIndicators.size > 2 ? 8 : 5;
    
    return {
      category: 'System Architecture',
      score,
      complexity,
      evidence,
      patterns,
      advancedIndicators
    };
  }

  /**
   * Calculate tool complexity based on usage patterns
   */
  private calculateToolComplexity(tool: string, count: number, session: AnalyticsSession): number {
    const baseComplexity = {
      'Task': 8,
      'MultiEdit': 7,
      'Grep': 6,
      'Glob': 5,
      'Read': 3,
      'Write': 4,
      'Edit': 4,
      'Bash': 6
    };
    
    let complexity = baseComplexity[tool] || 5;
    
    // Adjust based on session context
    if (session.insights.effectiveness.problemComplexity > 7) {
      complexity += 1;
    }
    
    if (count > 10) {
      complexity += 1;
    }
    
    return Math.min(10, complexity);
  }

  /**
   * Calculate confidence score based on multiple factors
   */
  private calculateConfidence(
    avgScore: number, 
    sessionCount: number, 
    avgComplexity: number,
    advancedIndicatorCount: number
  ): number {
    const baseConfidence = avgScore;
    const sessionBonus = Math.min(20, sessionCount * 3);
    const complexityBonus = avgComplexity * 2;
    const advancedBonus = advancedIndicatorCount * 5;
    
    return Math.min(100, baseConfidence + sessionBonus + complexityBonus + advancedBonus);
  }

  /**
   * Determine proficiency level with nuanced analysis
   */
  private determineProficiencyLevel(
    avgScore: number,
    avgComplexity: number,
    advancedIndicators: Set<string>,
    patterns: Map<string, number>
  ): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const indicatorCount = advancedIndicators.size;
    const patternDiversity = patterns.size;
    
    // Expert: High score, high complexity, many advanced indicators
    if (avgScore >= 85 && avgComplexity >= 7 && indicatorCount >= 5) {
      return 'expert';
    }
    
    // Advanced: Good score, moderate complexity, some advanced indicators
    if (avgScore >= 70 && avgComplexity >= 5 && indicatorCount >= 3) {
      return 'advanced';
    }
    
    // Intermediate: Decent score, some complexity
    if (avgScore >= 50 && (avgComplexity >= 4 || indicatorCount >= 2)) {
      return 'intermediate';
    }
    
    return 'beginner';
  }

  /**
   * Select best evidence examples
   */
  private selectBestEvidence(evidence: any[], limit: number): any[] {
    // Sort by relevance and diversity
    return evidence
      .filter(e => e && e.length > 0)
      .slice(0, limit);
  }

  /**
   * Calculate consistency of scores
   */
  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 100;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency score (lower deviation = higher consistency)
    return Math.max(0, Math.min(100, 100 - (standardDeviation * 2)));
  }

  /**
   * Analyze session for specific weaknesses
   */
  private analyzeSessionForWeaknesses(session: AnalyticsSession): Array<{
    area: string;
    severity: 'minor' | 'moderate' | 'significant';
    impact: string;
    rootCauses: Set<string>;
    patterns: Map<string, number>;
  }> {
    const weaknesses: Array<any> = [];
    
    // Analyze effectiveness for potential weaknesses
    const { effectiveness } = session.insights;
    
    // High iteration count indicates struggle
    if (effectiveness.iterationCount > 5) {
      weaknesses.push({
        area: 'Iterative Efficiency',
        severity: effectiveness.iterationCount > 8 ? 'significant' : 'moderate',
        impact: `Required ${effectiveness.iterationCount} iterations to reach solution`,
        rootCauses: new Set(['Unclear problem understanding', 'Trial and error approach']),
        patterns: new Map([['excessive_iterations', effectiveness.iterationCount]])
      });
    }
    
    // Low solution quality
    if (effectiveness.solutionQuality < 70) {
      weaknesses.push({
        area: 'Solution Quality',
        severity: effectiveness.solutionQuality < 50 ? 'significant' : 'moderate',
        impact: `Solution quality only ${effectiveness.solutionQuality}%`,
        rootCauses: new Set(['Incomplete requirements understanding', 'Rushed implementation']),
        patterns: new Map([['low_quality', 1]])
      });
    }
    
    // Poor time efficiency
    if (effectiveness.timeEfficiency < 60) {
      weaknesses.push({
        area: 'Time Management',
        severity: effectiveness.timeEfficiency < 40 ? 'significant' : 'moderate',
        impact: `Time efficiency at ${effectiveness.timeEfficiency}%`,
        rootCauses: new Set(['Inefficient tool usage', 'Lack of planning']),
        patterns: new Map([['slow_execution', 1]])
      });
    }
    
    // Analyze tool usage for inefficiencies
    const toolWeaknesses = this.analyzeToolUsageWeaknesses(session);
    weaknesses.push(...toolWeaknesses);
    
    // Analyze patterns for anti-patterns
    const antiPatterns = this.detectAntiPatterns(session);
    weaknesses.push(...antiPatterns);
    
    return weaknesses;
  }

  /**
   * Analyze tool usage for weaknesses
   */
  private analyzeToolUsageWeaknesses(session: AnalyticsSession): Array<{
    area: string;
    severity: 'minor' | 'moderate' | 'significant';
    impact: string;
    rootCauses: Set<string>;
    patterns: Map<string, number>;
  }> {
    const weaknesses: Array<any> = [];
    const { toolUsage } = session.session.metrics;
    
    // Check for inefficient search patterns
    if (toolUsage['Grep'] > 10 && toolUsage['Task'] < 2) {
      weaknesses.push({
        area: 'Search Efficiency',
        severity: 'moderate',
        impact: 'Manual searching instead of delegating complex searches',
        rootCauses: new Set(['Not leveraging Task tool for complex searches']),
        patterns: new Map([['manual_search_overuse', toolUsage['Grep']]])
      });
    }
    
    // Check for excessive file reads without understanding
    if (toolUsage['Read'] > 20 && toolUsage['Glob'] < 2) {
      weaknesses.push({
        area: 'Codebase Navigation',
        severity: 'moderate',
        impact: 'Reading files individually without systematic exploration',
        rootCauses: new Set(['Lack of codebase overview', 'No systematic approach']),
        patterns: new Map([['excessive_reads', toolUsage['Read']]])
      });
    }
    
    // Check for edit/write ratio
    const edits = (toolUsage['Edit'] || 0) + (toolUsage['MultiEdit'] || 0);
    const writes = toolUsage['Write'] || 0;
    if (writes > 3 && edits < writes) {
      weaknesses.push({
        area: 'File Management',
        severity: 'minor',
        impact: 'Creating new files instead of editing existing ones',
        rootCauses: new Set(['Preference for new files over refactoring']),
        patterns: new Map([['excessive_file_creation', writes]])
      });
    }
    
    return weaknesses;
  }

  /**
   * Detect anti-patterns in session
   */
  private detectAntiPatterns(session: AnalyticsSession): Array<{
    area: string;
    severity: 'minor' | 'moderate' | 'significant';
    impact: string;
    rootCauses: Set<string>;
    patterns: Map<string, number>;
  }> {
    const antiPatterns: Array<any> = [];
    
    // Check metrics for signs of struggle
    if (session.session.metrics.loopCount > 3) {
      antiPatterns.push({
        area: 'Debugging Approach',
        severity: 'moderate',
        impact: `Caught in ${session.session.metrics.loopCount} debugging loops`,
        rootCauses: new Set(['Lack of systematic debugging', 'Trial and error']),
        patterns: new Map([['debug_loops', session.session.metrics.loopCount]])
      });
    }
    
    // Check for pattern-specific anti-patterns
    if (session.insights.technicalPatterns) {
      const hasTests = session.insights.technicalPatterns.some(p => 
        p?.pattern?.toLowerCase().includes('test')
      );
      const hasErrors = session.insights.technicalPatterns.some(p => 
        p?.pattern?.toLowerCase().includes('error')
      );
      
      if (!hasTests && session.session.metrics.toolUsage['Write'] > 2) {
        antiPatterns.push({
          area: 'Testing Practices',
          severity: 'moderate',
          impact: 'Writing code without corresponding tests',
          rootCauses: new Set(['Test-last approach', 'Missing test coverage']),
          patterns: new Map([['no_tests', 1]])
        });
      }
    }
    
    return antiPatterns;
  }

  /**
   * Convert severity array to average score
   */
  private severityToScore(severities: ('minor' | 'moderate' | 'significant')[]): number {
    const scores = { minor: 1, moderate: 2, significant: 3 };
    const total = severities.reduce((sum, s) => sum + scores[s], 0);
    return total / severities.length;
  }

  /**
   * Generate impact summary from impacts and root causes
   */
  private generateImpactSummary(impacts: string[], rootCauses: Set<string>): string {
    // Summarize the main impacts
    const uniqueImpacts = [...new Set(impacts)].slice(0, 3);
    const causesList = Array.from(rootCauses).slice(0, 2);
    
    let summary = uniqueImpacts.join('; ');
    if (causesList.length > 0) {
      summary += `. Root causes: ${causesList.join(', ')}`;
    }
    
    return summary.substring(0, 300);
  }

  /**
   * Generate advanced recommendations based on analysis
   */
  private generateAdvancedRecommendations(
    area: string,
    severity: 'minor' | 'moderate' | 'significant',
    rootCauses: Set<string>,
    patterns: Map<string, number>
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Area-specific recommendations
    switch (area) {
      case 'Iterative Efficiency':
        recommendations.push({
          title: 'Improve First-Attempt Success Rate',
          description: 'Focus on understanding requirements thoroughly before implementation',
          priority: severity === 'significant' ? 'high' : 'medium',
          effort: 'moderate',
          expectedImprovement: 'Reduce iterations by 50%, faster solution delivery'
        });
        if (rootCauses.has('Unclear problem understanding')) {
          recommendations.push({
            title: 'Enhance Requirement Analysis',
            description: 'Use systematic approaches to break down complex problems',
            priority: 'high',
            effort: 'minimal',
            expectedImprovement: 'Better initial solutions, fewer revisions'
          });
        }
        break;
        
      case 'Search Efficiency':
        recommendations.push({
          title: 'Leverage Task Tool for Complex Searches',
          description: 'Use Task tool for multi-file searches and complex pattern matching',
          priority: 'medium',
          effort: 'minimal',
          expectedImprovement: 'Reduce search time by 70%'
        });
        break;
        
      case 'Solution Quality':
        recommendations.push({
          title: 'Implement Quality Checklist',
          description: 'Verify edge cases, error handling, and completeness before finalizing',
          priority: 'high',
          effort: 'moderate',
          expectedImprovement: 'Increase solution quality to 90%+'
        });
        break;
        
      case 'Testing Practices':
        recommendations.push({
          title: 'Adopt Test-First Approach',
          description: 'Write tests before implementation to clarify requirements',
          priority: 'high',
          effort: 'moderate',
          expectedImprovement: 'Better code quality, fewer bugs, clearer design'
        });
        break;
        
      default:
        recommendations.push({
          title: `Improve ${area}`,
          description: `Focus on addressing root causes: ${Array.from(rootCauses).join(', ')}`,
          priority: severity === 'significant' ? 'high' : 'medium',
          effort: 'moderate',
          expectedImprovement: `Enhanced ${area.toLowerCase()} capabilities`
        });
    }
    
    return recommendations;
  }

  /**
   * Extract specific examples of weaknesses
   */
  private extractWeaknessExamples(
    area: string, 
    sessionIds: string[], 
    sessions: AnalyticsSession[]
  ): any[] {
    // Get up to 3 recent examples
    return sessionIds
      .slice(-3)
      .map(id => {
        const session = sessions.find(s => s.session.id === id);
        if (!session) return null;
        
        return {
          sessionId: id,
          date: session.session.startTime,
          context: session.session.summary.substring(0, 100),
          metrics: {
            iterations: session.insights.effectiveness.iterationCount,
            quality: session.insights.effectiveness.solutionQuality,
            efficiency: session.insights.effectiveness.timeEfficiency
          }
        };
      })
      .filter(Boolean);
  }

  /**
   * Calculate improvement potential
   */
  private calculateImprovementPotential(
    severity: 'minor' | 'moderate' | 'significant',
    frequency: number
  ): number {
    const severityScore = { minor: 1, moderate: 2, significant: 3 };
    const severityValue = severityScore[severity];
    
    // Higher severity and frequency = higher improvement potential
    return Math.min(100, (severityValue * 20) + (frequency * 0.5));
  }
}