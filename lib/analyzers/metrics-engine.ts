import { Session, ProcessedMessage, MetricsSummary, ActivityBreakdown, ToolUsage } from '../types';

export class MetricsEngine {
  /**
   * Calculate all metrics for a session
   */
  calculateMetrics(session: Session): MetricsSummary {
    const messages = session.messages;

    // Calculate basic counts
    const totalTokens = this.calculateTotalTokens(messages);
    const messageCount = this.calculateMessageCounts(messages);
    const toolUsage = this.calculateToolUsage(messages);
    const activityBreakdown = this.calculateActivityBreakdown(messages);
    
    // Calculate quality metrics (placeholder for now, will be implemented in next commits)
    const avgPromptQuality = 0;
    const loopCount = 0;
    const sessionScore = 0;
    const scoreBreakdown = {
      efficiency: 0,
      quality: 0,
      progression: 0,
      toolMastery: 0
    };

    return {
      totalTokens,
      messageCount,
      toolUsage,
      avgPromptQuality,
      loopCount,
      activityBreakdown,
      sessionScore,
      scoreBreakdown
    };
  }

  /**
   * Calculate total tokens used in session
   */
  private calculateTotalTokens(messages: ProcessedMessage[]): number {
    return messages.reduce((total, message) => {
      return total + message.tokens.input + message.tokens.output;
    }, 0);
  }

  /**
   * Count messages by role
   */
  private calculateMessageCounts(messages: ProcessedMessage[]): { user: number; assistant: number } {
    const counts = { user: 0, assistant: 0 };
    
    messages.forEach(message => {
      if (message.role === 'user') {
        counts.user++;
      } else if (message.role === 'assistant') {
        counts.assistant++;
      }
    });

    return counts;
  }

  /**
   * Calculate tool usage statistics
   */
  private calculateToolUsage(messages: ProcessedMessage[]): ToolUsage {
    const usage: ToolUsage = {};

    messages.forEach(message => {
      message.toolsUsed.forEach(tool => {
        usage[tool] = (usage[tool] || 0) + 1;
      });
    });

    return usage;
  }

  /**
   * Calculate activity breakdown
   */
  private calculateActivityBreakdown(messages: ProcessedMessage[]): ActivityBreakdown {
    const breakdown: ActivityBreakdown = {};

    messages.forEach(message => {
      if (message.activity) {
        breakdown[message.activity] = (breakdown[message.activity] || 0) + 1;
      }
    });

    return breakdown;
  }

  /**
   * Calculate metrics for multiple sessions
   */
  calculateSessionMetrics(sessions: Session[]): Session[] {
    return sessions.map(session => ({
      ...session,
      metrics: this.calculateMetrics(session)
    }));
  }

  /**
   * Calculate aggregate metrics across multiple sessions
   */
  calculateAggregateMetrics(sessions: Session[]): {
    totalSessions: number;
    totalDuration: number;
    totalTokens: number;
    avgTokensPerSession: number;
    avgDuration: number;
    topTools: Array<{ tool: string; count: number }>;
    topActivities: Array<{ activity: string; count: number }>;
  } {
    const totalSessions = sessions.length;
    
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalTokens = sessions.reduce((sum, session) => sum + session.metrics.totalTokens, 0);
    
    const avgTokensPerSession = totalSessions > 0 ? totalTokens / totalSessions : 0;
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Aggregate tool usage
    const allToolUsage: ToolUsage = {};
    sessions.forEach(session => {
      Object.entries(session.metrics.toolUsage).forEach(([tool, count]) => {
        allToolUsage[tool] = (allToolUsage[tool] || 0) + count;
      });
    });

    const topTools = Object.entries(allToolUsage)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Aggregate activity breakdown
    const allActivities: ActivityBreakdown = {};
    sessions.forEach(session => {
      Object.entries(session.metrics.activityBreakdown).forEach(([activity, count]) => {
        allActivities[activity] = (allActivities[activity] || 0) + count;
      });
    });

    const topActivities = Object.entries(allActivities)
      .map(([activity, count]) => ({ activity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSessions,
      totalDuration,
      totalTokens,
      avgTokensPerSession,
      avgDuration,
      topTools,
      topActivities
    };
  }

  /**
   * Calculate efficiency metrics
   */
  calculateEfficiencyMetrics(session: Session): {
    tokensPerMinute: number;
    messagesPerMinute: number;
    toolsPerMessage: number;
    activitiesPerMinute: number;
  } {
    const duration = session.duration || 1; // Avoid division by zero
    const totalMessages = session.messages.length;
    const totalTools = Object.values(session.metrics.toolUsage).reduce((sum, count) => sum + count, 0);
    const totalActivities = Object.values(session.metrics.activityBreakdown).reduce((sum, count) => sum + count, 0);

    return {
      tokensPerMinute: session.metrics.totalTokens / duration,
      messagesPerMinute: totalMessages / duration,
      toolsPerMessage: totalMessages > 0 ? totalTools / totalMessages : 0,
      activitiesPerMinute: totalActivities / duration
    };
  }
}