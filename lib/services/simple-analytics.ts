import { AnalyticsStorage } from './analytics-storage';
import OpenAI from 'openai';

export interface SimpleAnalytics {
  strengths: AnalyticsItem[];
  weaknesses: AnalyticsItem[];
  tips: AnalyticsItem[];
}

export interface AnalyticsItem {
  title: string;
  description: string;
}

export class SimpleAnalyticsService {
  private storage: AnalyticsStorage;
  private openai: OpenAI | null;

  constructor(storage?: AnalyticsStorage) {
    this.storage = storage || new AnalyticsStorage();
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  /**
   * Analyze all sessions and return simple 3-3-3 analytics
   */
  async analyzeAllSessions(userId: string): Promise<SimpleAnalytics> {
    const sessions = await this.storage.listAnalyticsSessions();
    
    if (sessions.length === 0) {
      return {
        strengths: [
          {
            title: 'No Sessions Yet',
            description: 'Process your Claude Code sessions to see your strengths'
          }
        ],
        weaknesses: [
          {
            title: 'No Data Available',
            description: 'Complete coding sessions to identify improvement areas'
          }
        ],
        tips: [
          {
            title: 'Get Started',
            description: 'Begin using Claude Code and process your sessions for personalized insights'
          }
        ]
      };
    }

    // Collect all free-form analyses from sessions
    const sessionAnalyses = sessions.map(s => ({
      sessionId: s.session.id,
      summary: s.session.summary,
      duration: s.session.duration,
      analysis: s.insights.analysis || 'No detailed analysis available for this session.'
    }));

    // Ask LLM to analyze all session analyses and generate final insights
    const prompt = `You are analyzing a developer's coding patterns across multiple sessions. Each session has been individually analyzed. Your task is to synthesize these analyses into exactly 3 strengths, 3 weaknesses, and 3 actionable tips.

Here are the individual session analyses:

${sessionAnalyses.map((s, i) => 
`Session ${i + 1} (${Math.round(s.duration / 60)} minutes):
Summary: ${s.summary}
Analysis: ${s.analysis}
`).join('\n---\n')}

Based on these analyses, synthesize the key patterns and provide:

{
  "strengths": [
    {"title": "Most significant strength", "description": "Detailed description with evidence across sessions"},
    {"title": "Second strength", "description": "Detailed description with evidence"},
    {"title": "Third strength", "description": "Detailed description with evidence"}
  ],
  "weaknesses": [
    {"title": "Most critical weakness", "description": "Detailed description with impact and patterns"},
    {"title": "Second weakness", "description": "Detailed description with impact"},
    {"title": "Third weakness", "description": "Detailed description with impact"}
  ],
  "tips": [
    {"title": "Most impactful recommendation", "description": "Specific, actionable steps based on the analyses"},
    {"title": "Second recommendation", "description": "Specific, actionable steps"},
    {"title": "Third recommendation", "description": "Specific, actionable steps"}
  ]
}

Synthesize patterns across all sessions. Look for:
- Consistent strengths that appear in multiple analyses
- Recurring weaknesses or struggle patterns
- Overall trajectory and improvement areas
- Cross-session patterns that individual analyses might have missed

Each item should:
- Draw from patterns across multiple sessions, not just one
- Include specific evidence or metrics mentioned in the analyses
- Provide actionable, tactical advice based on the observed patterns
- Consider the developer's overall skill level and trajectory

Return exactly 3 of each category, prioritized by impact and consistency across sessions.`;

    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: 'o3',
          messages: [
            {
              role: 'system',
              content: 'You are an expert coding coach synthesizing insights from multiple coding session analyses. Your task is to identify overarching patterns, consistent strengths and weaknesses, and provide actionable recommendations based on the collective analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });

        const analytics = JSON.parse(completion.choices[0].message.content || '{}');
        
        return {
          strengths: analytics.strengths || [],
          weaknesses: analytics.weaknesses || [],
          tips: analytics.tips || []
        };
      } else {
        // Fallback analysis when no API key
        return this.generateBasicAnalysis(sessions);
      }
    } catch (error) {
      console.error('Failed to analyze with LLM:', error);
      return this.generateBasicAnalysis(sessions);
    }
  }

  private generateBasicAnalysis(sessions: AnalyticsSession[]): SimpleAnalytics {
    // Simple analysis based on metrics
    const totalSessions = sessions.length;
    const avgToolUsage = this.calculateAverageToolUsage(sessions);
    const avgQuality = this.calculateAverageQuality(sessions);
    
    const strengths: AnalyticsItem[] = [];
    const weaknesses: AnalyticsItem[] = [];
    const tips: AnalyticsItem[] = [];

    // Identify strengths
    if (avgQuality > 80) {
      strengths.push({
        title: 'High Solution Quality',
        description: `Maintaining ${avgQuality.toFixed(0)}% average solution quality across ${totalSessions} sessions`
      });
    }
    
    if (avgToolUsage.multiEdit > 2) {
      strengths.push({
        title: 'Efficient Multi-File Editing',
        description: `Using MultiEdit effectively with ${avgToolUsage.multiEdit.toFixed(1)} average uses per session`
      });
    }

    if (avgToolUsage.task > 1) {
      strengths.push({
        title: 'Smart Search Delegation',
        description: `Leveraging Task tool ${avgToolUsage.task.toFixed(1)} times per session for complex searches`
      });
    }

    // Identify weaknesses
    if (avgToolUsage.grep > 10 && avgToolUsage.task < 2) {
      weaknesses.push({
        title: 'Inefficient Search Pattern',
        description: `Using Grep ${avgToolUsage.grep.toFixed(0)} times per session. Consider Task tool for multi-file searches`
      });
    }

    if (avgQuality < 75) {
      weaknesses.push({
        title: 'Solution Quality Gap',
        description: `Average quality at ${avgQuality.toFixed(0)}%. Focus on completeness and edge case handling`
      });
    }

    if (avgToolUsage.read > 20) {
      weaknesses.push({
        title: 'Excessive File Reading',
        description: `Reading ${avgToolUsage.read.toFixed(0)} files per session. Use Glob for structure overview first`
      });
    }

    // Fill with defaults if needed
    while (strengths.length < 3) {
      strengths.push({
        title: 'Active Development',
        description: `Completed ${totalSessions} coding sessions successfully`
      });
    }

    while (weaknesses.length < 3) {
      weaknesses.push({
        title: 'Limited Data',
        description: 'Complete more sessions for deeper analysis'
      });
    }

    // Generate tips
    tips.push({
      title: 'Use Task for Complex Searches',
      description: 'Delegate multi-file searches to Task instead of multiple Grep calls'
    });

    tips.push({
      title: 'Start with Glob',
      description: 'Use Glob to understand project structure before diving into specific files'
    });

    tips.push({
      title: 'Leverage MultiEdit',
      description: 'Use MultiEdit for similar changes across multiple files to save time'
    });

    return {
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      tips: tips.slice(0, 3)
    };
  }

  private calculateAverageToolUsage(sessions: AnalyticsSession[]): any {
    const totals: any = {};
    
    sessions.forEach(session => {
      Object.entries(session.session.metrics.toolUsage).forEach(([tool, count]) => {
        totals[tool] = (totals[tool] || 0) + (count as number);
      });
    });

    const result: any = {};
    Object.entries(totals).forEach(([tool, total]) => {
      result[tool.toLowerCase()] = (total as number) / sessions.length;
    });

    return result;
  }

  private calculateAverageQuality(sessions: AnalyticsSession[]): number {
    const total = sessions.reduce((sum, s) => 
      sum + (s.insights?.effectiveness?.solutionQuality || 70), 0
    );
    return total / sessions.length;
  }
}