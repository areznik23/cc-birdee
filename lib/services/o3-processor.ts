import OpenAI from "openai";
import { Session } from "../types/session";
import {
  O3ProcessingRequest,
  O3ProcessingResult,
  SessionInsight,
  TechnicalStrength,
  UserWeakness,
  CodingTendency,
  Recommendation,
  CodeExample,
} from "../types/user-analytics";
import { AnalyticsParser } from "../parsers/analytics-parser";

export class O3Processor {
  private openai: OpenAI;
  private parser: AnalyticsParser;

  constructor(apiKey?: string) {
    // Only initialize OpenAI if API key is available
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      this.openai = new OpenAI({ apiKey: key });
    } else {
      // Mock implementation for development
      this.openai = null as any;
    }
    this.parser = new AnalyticsParser();
  }

  /**
   * Process a session through o3 for deep analysis
   */
  async processSession(
    request: O3ProcessingRequest
  ): Promise<O3ProcessingResult> {
    const { sessionData, analysisDepth, focusAreas } = request;

    // Extract structured data from the session
    const codeExamples = this.parser.extractCodeExamples(sessionData);
    const technicalPatterns =
      this.parser.identifyTechnicalPatterns(sessionData);
    const preliminaryStrengths = this.parser.extractTechnicalStrengths(
      technicalPatterns,
      codeExamples
    );
    const codingTendencies = this.parser.identifyCodingTendencies(sessionData);
    const problemSolvingPatterns =
      this.parser.extractProblemSolvingPatterns(sessionData);

    // Prepare context for o3 analysis
    const analysisContext = this.prepareAnalysisContext(
      sessionData,
      codeExamples,
      technicalPatterns,
      focusAreas
    );

    // Get AI-powered analysis text
    const analysisText = await this.getAIInsights(analysisContext, analysisDepth);

    // Create basic session insight with analysis text
    const sessionInsight: SessionInsight = {
      sessionId: sessionData.id,
      timestamp: new Date(sessionData.startTime),
      keyTakeaways: [],
      technicalPatterns: technicalPatterns.slice(0, 10),
      effectiveness: this.calculateEffectiveness(sessionData),
      recommendations: [],
      analysis: analysisText
    };

    // Return minimal result focused on the analysis text
    const result: O3ProcessingResult = {
      insights: sessionInsight,
      technicalStrengths: [],
      weaknessesIdentified: [],
      codingPatterns: [],
      recommendations: [],
      confidence: 85
    };

    return result;
  }

  /**
   * Prepare context for AI analysis
   */
  private prepareAnalysisContext(
    session: Session,
    codeExamples: CodeExample[],
    patterns: any[],
    focusAreas?: string[]
  ): string {
    const summary = `
Session Analysis Context:
- Session ID: ${session.id}
- Duration: ${session.duration} minutes
- Messages: ${session.messages.length}
- User Messages: ${session.metrics.messageCount.user}
- Assistant Messages: ${session.metrics.messageCount.assistant}
- Total Tokens: ${session.metrics.totalTokens}

Key Patterns Identified:
${patterns
  .slice(0, 10)
  .map((p) => `- ${p.pattern} (${p.occurrences} occurrences)`)
  .join("\n")}

Code Examples: ${codeExamples.length} snippets found

Session Summary: ${session.summary}

${focusAreas ? `Focus Areas: ${focusAreas.join(", ")}` : ""}

Full Conversation:
${this.formatConversation(session)}
`;

    return summary;
  }

  /**
   * Get AI-powered insights using o3/GPT-4
   */
  private async getAIInsights(
    context: string,
    depth: "quick" | "standard" | "deep"
  ): Promise<string> {
    // If OpenAI is not initialized, return mock analysis
    if (!this.openai) {
      return this.getMockAnalysis(context, depth);
    }

    const systemPrompt = this.getSystemPrompt(depth);

    try {
      const response = await this.openai.chat.completions.create({
        model: "o3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      console.log("[O3Processor] AI response:", content);
      const parsed = JSON.parse(content || "{}");
      return parsed.analysis || "";
    } catch (error) {
      console.error("AI analysis failed:", error);
      return this.getFallbackInsights();
    }
  }

  /**
   * Get system prompt based on analysis depth
   */
  private getSystemPrompt(depth: "quick" | "standard" | "deep"): string {
    const basePrompt = `You are an expert software engineering coach analyzing a Claude Code session. 

Write a detailed, narrative analysis of this coding session. Be specific and insightful about:
- What the developer accomplished and how they approached the problem
- Tool usage patterns and their effectiveness
- Code quality and architectural decisions
- Problem-solving strategies and iteration patterns
- Specific strengths demonstrated with concrete examples
- Areas where they struggled or could improve
- Unique patterns or behaviors that stand out
- The developer's experience level and trajectory

Don't structure this as lists or categories. Write it as a comprehensive analysis that captures the nuance and context of this specific session. Include metrics and specific examples where relevant.

Return your analysis in this JSON format:
{
  "analysis": "Your detailed free-form analysis text here..."
}`;

    const depthModifiers = {
      quick:
        "\n\nProvide a quick analysis focusing on the most obvious patterns and recommendations.",
      standard:
        "\n\nProvide a balanced analysis with practical insights and actionable recommendations.",
      deep: "\n\nProvide a comprehensive analysis including subtle patterns, long-term growth strategies, and detailed evidence for each insight. Consider architectural decisions, code quality trends, and learning trajectories.",
    };

    return basePrompt + depthModifiers[depth];
  }

  /**
   * Format conversation for AI analysis
   */
  private formatConversation(session: Session): string {
    return session.messages
      .slice(0, 50) // Limit to prevent token overflow
      .map((m) => `${m.role.toUpperCase()}: ${m.content.substring(0, 500)}...`)
      .join("\n\n");
  }

  /**
   * Combine parser results with AI insights
   */
  private combineResults(
    aiInsights: any,
    preliminaryStrengths: Partial<TechnicalStrength>[],
    codingTendencies: Partial<CodingTendency>[],
    codeExamples: CodeExample[]
  ): O3ProcessingResult {
    // Merge AI-identified strengths with parser results
    const strengths = this.mergeStrengths(
      aiInsights.strengths || [],
      preliminaryStrengths,
      codeExamples
    );

    // Process weaknesses
    const weaknesses = this.processWeaknesses(aiInsights.weaknesses || []);

    // Process recommendations
    const recommendations = this.processRecommendations(
      aiInsights.recommendations || []
    );

    // Create session insight
    const sessionInsight: SessionInsight = {
      sessionId: "", // Will be set by caller
      timestamp: new Date(),
      keyTakeaways: aiInsights.insights?.keyTakeaways || [],
      technicalPatterns: aiInsights.insights?.technicalPatterns || [],
      effectiveness: aiInsights.insights?.effectiveness || {
        taskCompletionRate: 0,
        solutionQuality: 0,
        timeEfficiency: 0,
        iterationCount: 0,
        toolUtilization: 0,
      },
      recommendations: recommendations.map((r) => r.title),
    };

    return {
      insights: sessionInsight,
      technicalStrengths: strengths,
      weaknessesIdentified: weaknesses,
      codingPatterns: codingTendencies as CodingTendency[],
      recommendations,
      confidence: aiInsights.confidence || 75,
    };
  }

  /**
   * Merge AI and parser-identified strengths
   */
  private mergeStrengths(
    aiStrengths: any[],
    parserStrengths: Partial<TechnicalStrength>[],
    examples: CodeExample[]
  ): TechnicalStrength[] {
    const strengthMap = new Map<string, TechnicalStrength>();

    // Add parser strengths
    parserStrengths.forEach((strength) => {
      if (strength.category) {
        strengthMap.set(strength.category, {
          category: strength.category,
          proficiencyLevel: "intermediate",
          confidenceScore: strength.confidenceScore || 50,
          evidence: strength.evidence || [],
          growthTrend: "stable",
          ...strength,
        } as TechnicalStrength);
      }
    });

    // Merge with AI strengths
    aiStrengths.forEach((aiStrength) => {
      const existing = strengthMap.get(aiStrength.category);
      if (existing) {
        // Merge evidence and update proficiency
        strengthMap.set(aiStrength.category, {
          ...existing,
          proficiencyLevel:
            aiStrength.proficiencyLevel || existing.proficiencyLevel,
          growthTrend: aiStrength.growthTrend || existing.growthTrend,
          evidence: [
            ...existing.evidence,
            ...this.findRelevantExamples(aiStrength.category, examples),
          ],
        });
      } else {
        // Add new strength
        strengthMap.set(aiStrength.category, {
          ...aiStrength,
          confidenceScore: 70,
          evidence: this.findRelevantExamples(aiStrength.category, examples),
        });
      }
    });

    return Array.from(strengthMap.values());
  }

  /**
   * Process AI-identified weaknesses
   */
  private processWeaknesses(aiWeaknesses: any[]): UserWeakness[] {
    return aiWeaknesses.map((weakness) => ({
      area: weakness.area,
      severity: weakness.severity || "moderate",
      frequency: 0, // Will be calculated by aggregator
      impact: weakness.impact,
      recommendations: [], // Will be linked by aggregator
      examples: [], // Will be populated by aggregator
    }));
  }

  /**
   * Process AI recommendations
   */
  private processRecommendations(aiRecommendations: any[]): Recommendation[] {
    return aiRecommendations.map((rec) => ({
      title: rec.title,
      description: rec.description,
      priority: rec.priority || "medium",
      effort: rec.effort || "moderate",
      expectedImprovement: rec.expectedImprovement,
      resources: this.suggestResources(rec.title),
    }));
  }

  /**
   * Find code examples relevant to a category
   */
  private findRelevantExamples(
    category: string,
    examples: CodeExample[]
  ): CodeExample[] {
    const categoryKeywords = category.toLowerCase().split(" ");

    return examples
      .filter((example) =>
        categoryKeywords.some(
          (keyword) =>
            example.context.toLowerCase().includes(keyword) ||
            example.code.toLowerCase().includes(keyword)
        )
      )
      .slice(0, 3); // Limit to 3 examples per category
  }

  /**
   * Suggest learning resources based on recommendation
   */
  private suggestResources(recommendationTitle: string): any[] {
    const resources = [];
    const lowerTitle = recommendationTitle.toLowerCase();

    if (lowerTitle.includes("typescript")) {
      resources.push({
        type: "documentation",
        title: "TypeScript Handbook",
        url: "https://www.typescriptlang.org/docs/handbook/intro.html",
        description: "Official TypeScript documentation",
      });
    }

    if (lowerTitle.includes("test")) {
      resources.push({
        type: "tutorial",
        title: "Testing Best Practices",
        description: "Learn modern testing strategies and patterns",
      });
    }

    if (lowerTitle.includes("performance")) {
      resources.push({
        type: "course",
        title: "Web Performance Optimization",
        description: "Master performance optimization techniques",
      });
    }

    return resources;
  }

  /**
   * Calculate effectiveness metrics from session data
   */
  private calculateEffectiveness(session: Session): EffectivenessMetrics {
    // Simple calculations based on session metrics
    const messageRatio = session.metrics.messageCount.assistant / 
      (session.metrics.messageCount.user || 1);
    
    const toolUtilization = Math.min(100, 
      Object.values(session.metrics.toolUsage).reduce((a, b) => a + b, 0) * 10
    );
    
    return {
      taskCompletionRate: session.metrics.sessionScore >= 70 ? 90 : 70,
      solutionQuality: session.metrics.sessionScore,
      timeEfficiency: Math.min(100, 100 - (session.duration / 60)),
      iterationCount: session.metrics.loopCount,
      toolUtilization
    };
  }

  /**
   * Mock analysis for development without OpenAI API
   */
  private getMockAnalysis(
    context: string,
    depth: "quick" | "standard" | "deep"
  ): string {
    // Extract some basic info from context for mock data
    const hasTypeScript = context.toLowerCase().includes("typescript");
    const hasReact = context.toLowerCase().includes("react");
    const hasTests = context.toLowerCase().includes("test");

    return `This coding session demonstrates solid development practices with some areas for improvement. The developer shows competent tool usage and problem-solving abilities. ${hasTypeScript ? 'TypeScript is being used effectively for type safety.' : ''} ${hasReact ? 'React components are structured well.' : ''} ${hasTests ? 'Good to see testing practices in place.' : 'However, the lack of tests is a notable gap that should be addressed.'} The session shows an organized approach to problem-solving with reasonable efficiency. Consider focusing on improving test coverage and exploring more advanced patterns in future sessions.`;
  }

  /**
   * Fallback analysis if AI analysis fails
   */
  private getFallbackInsights(): string {
    return "Session analysis could not be completed due to technical issues. The session appears to have standard coding patterns but a detailed analysis is not available at this time.";
  }
}
