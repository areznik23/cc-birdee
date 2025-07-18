import { Session, ProcessedMessage, ScoreBreakdown } from '../types';

export class SessionScorer {
  /**
   * Calculate composite session score (0-100)
   */
  scoreSession(session: Session): number {
    const breakdown = this.calculateScoreBreakdown(session);
    
    // Weight the component scores
    const weights = {
      efficiency: 0.30,    // 30%
      quality: 0.25,       // 25%
      progression: 0.25,   // 25%
      toolMastery: 0.20    // 20%
    };

    // Calculate weighted average
    const totalScore = Object.entries(breakdown).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights]);
    }, 0);

    return Math.round(totalScore);
  }

  /**
   * Calculate individual score components
   */
  calculateScoreBreakdown(session: Session): ScoreBreakdown {
    return {
      efficiency: this.calculateEfficiencyScore(session),
      quality: this.calculateQualityScore(session),
      progression: this.calculateProgressionScore(session),
      toolMastery: this.calculateToolMasteryScore(session)
    };
  }

  /**
   * Calculate efficiency score based on tokens/time and task complexity
   */
  private calculateEfficiencyScore(session: Session): number {
    const { duration, metrics } = session;
    const { totalTokens, messageCount } = metrics;
    
    // Base efficiency on tokens per minute
    const tokensPerMinute = totalTokens / Math.max(duration, 1);
    
    // Normalize based on typical ranges
    // Good efficiency: 100-500 tokens/minute
    let efficiencyScore = 0;
    
    if (tokensPerMinute < 50) {
      efficiencyScore = 20; // Very slow
    } else if (tokensPerMinute < 100) {
      efficiencyScore = 40; // Slow
    } else if (tokensPerMinute < 300) {
      efficiencyScore = 70; // Good
    } else if (tokensPerMinute < 500) {
      efficiencyScore = 85; // Very good
    } else {
      efficiencyScore = 95; // Excellent
    }

    // Adjust for message density (too many messages might indicate confusion)
    const messagesPerMinute = (messageCount.user + messageCount.assistant) / Math.max(duration, 1);
    if (messagesPerMinute > 2) {
      efficiencyScore *= 0.8; // Penalty for too much back-and-forth
    }

    // Bonus for balanced user/assistant ratio
    const totalMessages = messageCount.user + messageCount.assistant;
    if (totalMessages > 0) {
      const userRatio = messageCount.user / totalMessages;
      if (userRatio >= 0.3 && userRatio <= 0.5) {
        efficiencyScore = Math.min(100, efficiencyScore * 1.1);
      }
    }

    return Math.round(efficiencyScore);
  }

  /**
   * Calculate quality score based on prompt quality average
   */
  private calculateQualityScore(session: Session): number {
    // Use the average prompt quality directly
    return session.metrics.avgPromptQuality;
  }

  /**
   * Calculate progression score based on activity flow and loop count
   */
  private calculateProgressionScore(session: Session): number {
    const { messages, metrics } = session;
    const { activityBreakdown, loopCount } = metrics;
    
    let score = 100; // Start with perfect score

    // Penalty for loops
    score -= loopCount * 15; // -15 points per loop
    
    // Check for productive activities
    const productiveActivities = [
      'implementation',
      'solution_design',
      'validation',
      'completion'
    ];
    
    const totalActivities = Object.values(activityBreakdown).reduce((sum, count) => sum + count, 0);
    const productiveCount = productiveActivities.reduce((sum, activity) => 
      sum + (activityBreakdown[activity] || 0), 0
    );
    
    if (totalActivities > 0) {
      const productiveRatio = productiveCount / totalActivities;
      score *= (0.5 + productiveRatio * 0.5); // Scale from 50% to 100%
    }

    // Check for good flow (initial -> exploration -> implementation -> validation)
    const hasGoodFlow = this.checkActivityFlow(messages);
    if (hasGoodFlow) {
      score = Math.min(100, score * 1.1); // 10% bonus
    }

    // Penalty for too many error handling activities
    const errorRatio = (activityBreakdown.error_handling || 0) / Math.max(totalActivities, 1);
    if (errorRatio > 0.3) {
      score *= 0.8; // 20% penalty
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate tool mastery score based on tool diversity and appropriateness
   */
  private calculateToolMasteryScore(session: Session): number {
    const { metrics, messages } = session;
    const { toolUsage } = metrics;
    
    // Calculate tool diversity
    const uniqueTools = Object.keys(toolUsage).length;
    const totalToolUses = Object.values(toolUsage).reduce((sum, count) => sum + count, 0);
    
    let score = 0;

    // Base score on diversity
    if (uniqueTools === 0) {
      score = 20; // Minimal tool usage
    } else if (uniqueTools === 1) {
      score = 40; // Single tool
    } else if (uniqueTools <= 3) {
      score = 70; // Good diversity
    } else {
      score = 85; // Excellent diversity
    }

    // Check for appropriate tool usage patterns
    const appropriatePatterns = this.checkToolAppropriateUsage(messages);
    if (appropriatePatterns) {
      score = Math.min(100, score * 1.15); // 15% bonus
    }

    // Penalty for overuse of any single tool
    if (totalToolUses > 0) {
      const maxToolUse = Math.max(...Object.values(toolUsage));
      const dominanceRatio = maxToolUse / totalToolUses;
      if (dominanceRatio > 0.7) {
        score *= 0.85; // 15% penalty for over-reliance
      }
    }

    return Math.round(score);
  }

  /**
   * Check if the activity flow follows a logical progression
   */
  private checkActivityFlow(messages: ProcessedMessage[]): boolean {
    const activities = messages.map(m => m.activity).filter(Boolean);
    
    // Good flow patterns
    const goodPatterns = [
      ['initial_question', 'code_exploration', 'implementation'],
      ['initial_question', 'solution_design', 'implementation'],
      ['error_handling', 'code_exploration', 'implementation'],
      ['task_management', 'implementation', 'validation']
    ];

    // Check if the session follows any good pattern
    for (const pattern of goodPatterns) {
      if (this.containsSequence(activities, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if activities contain a specific sequence
   */
  private containsSequence(activities: (string | undefined)[], sequence: string[]): boolean {
    let sequenceIndex = 0;
    
    for (const activity of activities) {
      if (activity === sequence[sequenceIndex]) {
        sequenceIndex++;
        if (sequenceIndex === sequence.length) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check for appropriate tool usage patterns
   */
  private checkToolAppropriateUsage(messages: ProcessedMessage[]): boolean {
    // Good patterns:
    // - Read/Grep before Write
    // - TodoWrite for task management activities
    // - Multiple reads for deep dives
    
    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];
      
      // Check for exploration before implementation
      if (current.toolsUsed.some(t => ['Read', 'Grep'].includes(t)) &&
          next.toolsUsed.some(t => ['Write', 'MultiEdit'].includes(t))) {
        return true;
      }
      
      // Check for TodoWrite with task management
      if (current.activity === 'task_management' && 
          current.toolsUsed.includes('TodoWrite')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Update session with calculated scores
   */
  updateSessionScores(session: Session): Session {
    const sessionScore = this.scoreSession(session);
    const scoreBreakdown = this.calculateScoreBreakdown(session);
    
    return {
      ...session,
      metrics: {
        ...session.metrics,
        sessionScore,
        scoreBreakdown
      }
    };
  }
}