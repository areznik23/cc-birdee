import { Session, ProcessedMessage } from '../types/session';
import { 
  TechnicalPattern, 
  CodeExample,
  TechnicalStrength,
  CodingTendency,
  ProblemSolvingPattern
} from '../types/user-analytics';

export class AnalyticsParser {
  private readonly codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  private readonly technicalTerms = new Set([
    'typescript', 'javascript', 'react', 'node', 'python', 'java',
    'database', 'api', 'rest', 'graphql', 'sql', 'nosql',
    'testing', 'unit test', 'integration test', 'e2e',
    'architecture', 'design pattern', 'solid', 'dry',
    'performance', 'optimization', 'algorithm', 'data structure',
    'security', 'authentication', 'authorization', 'encryption',
    'docker', 'kubernetes', 'ci/cd', 'deployment',
    'git', 'version control', 'branch', 'merge', 'rebase'
  ]);

  /**
   * Extract code examples from a session
   */
  extractCodeExamples(session: Session): CodeExample[] {
    const examples: CodeExample[] = [];
    
    session.messages.forEach((message, index) => {
      if (message.role === 'assistant' && message.content) {
        const matches = [...message.content.matchAll(this.codeBlockRegex)];
        
        matches.forEach(match => {
          const [fullMatch, language, code] = match;
          
          if (code && code.trim().length > 10) {
            // Find context from surrounding messages
            const context = this.extractContext(session.messages, index);
            
            examples.push({
              sessionId: session.id,
              timestamp: message.timestamp,
              code: code.trim(),
              context,
              explanation: this.generateCodeExplanation(code, language),
              messageIndex: index
            });
          }
        });
      }
    });
    
    return examples;
  }

  /**
   * Identify technical patterns in the conversation
   */
  identifyTechnicalPatterns(session: Session): TechnicalPattern[] {
    const patterns: Map<string, TechnicalPattern> = new Map();
    
    session.messages.forEach(message => {
      const content = message.content.toLowerCase();
      
      // Check for technical terms and patterns
      this.technicalTerms.forEach(term => {
        if (content.includes(term)) {
          const key = `uses_${term}`;
          const existing = patterns.get(key) || {
            pattern: `Uses ${term}`,
            occurrences: 0,
            impact: 'neutral' as const,
            context: ''
          };
          
          patterns.set(key, {
            ...existing,
            occurrences: existing.occurrences + 1,
            context: this.updateContext(existing.context, message.content)
          });
        }
      });
      
      // Identify specific coding patterns
      this.identifyCodingPatterns(message.content, patterns);
    });
    
    return Array.from(patterns.values());
  }

  /**
   * Extract technical strengths from patterns
   */
  extractTechnicalStrengths(
    patterns: TechnicalPattern[], 
    examples: CodeExample[]
  ): Partial<TechnicalStrength>[] {
    const strengthMap = new Map<string, Partial<TechnicalStrength>>();
    
    // Analyze patterns for strengths
    patterns.forEach(pattern => {
      const category = this.categorizePattern(pattern.pattern);
      if (!category) return;
      
      const existing = strengthMap.get(category) || {
        category,
        confidenceScore: 0,
        evidence: []
      };
      
      // Update confidence based on occurrences
      const newConfidence = Math.min(
        100, 
        existing.confidenceScore + (pattern.occurrences * 10)
      );
      
      strengthMap.set(category, {
        ...existing,
        confidenceScore: newConfidence,
        evidence: [...(existing.evidence || []), 
          ...examples.filter(e => e.context.includes(category.toLowerCase()))]
      });
    });
    
    return Array.from(strengthMap.values());
  }

  /**
   * Identify coding tendencies from message patterns
   */
  identifyCodingTendencies(session: Session): Partial<CodingTendency>[] {
    const tendencies: Map<string, Partial<CodingTendency>> = new Map();
    
    // Analyze message patterns
    session.messages.forEach((message, index) => {
      if (message.role === 'assistant') {
        // Check for defensive programming
        if (this.hasDefensiveProgramming(message.content)) {
          this.updateTendency(tendencies, 'defensive_programming', {
            pattern: 'Defensive Programming',
            impact: 'positive' as const
          });
        }
        
        // Check for test-driven development
        if (this.hasTestDrivenApproach(session.messages, index)) {
          this.updateTendency(tendencies, 'test_driven', {
            pattern: 'Test-Driven Development',
            impact: 'positive' as const
          });
        }
        
        // Check for early optimization
        if (this.hasEarlyOptimization(message.content)) {
          this.updateTendency(tendencies, 'early_optimization', {
            pattern: 'Early Optimization',
            impact: 'negative' as const,
            recommendation: 'Focus on correctness first, optimize based on measurements'
          });
        }
        
        // Check for documentation habits
        if (this.hasGoodDocumentation(message.content)) {
          this.updateTendency(tendencies, 'documentation', {
            pattern: 'Comprehensive Documentation',
            impact: 'positive' as const
          });
        }
      }
    });
    
    return Array.from(tendencies.values());
  }

  /**
   * Extract problem-solving patterns
   */
  extractProblemSolvingPatterns(session: Session): Partial<ProblemSolvingPattern>[] {
    const patterns: Partial<ProblemSolvingPattern>[] = [];
    
    // Analyze the flow of the conversation
    const approach = this.identifyApproach(session);
    
    if (approach) {
      patterns.push({
        approach: approach.type,
        effectiveness: approach.effectiveness,
        contexts: approach.contexts,
        strengths: approach.strengths,
        weaknesses: approach.weaknesses
      });
    }
    
    return patterns;
  }

  // Helper methods
  private extractContext(messages: ProcessedMessage[], currentIndex: number): string {
    const contextWindow = 2; // Look at 2 messages before and after
    const start = Math.max(0, currentIndex - contextWindow);
    const end = Math.min(messages.length - 1, currentIndex + contextWindow);
    
    const contextMessages = messages.slice(start, end + 1)
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');
    
    // Extract the main topic/question
    const firstUserMessage = messages.find(m => m.role === 'user');
    return firstUserMessage ? 
      firstUserMessage.content.substring(0, 200) : 
      contextMessages.substring(0, 200);
  }

  private generateCodeExplanation(code: string, language?: string): string {
    // Simple heuristic-based explanation
    const lines = code.split('\n');
    const hasFunction = /function|const.*=.*=>|def|fn/.test(code);
    const hasClass = /class|interface|struct/.test(code);
    const hasImports = /import|require|from|using/.test(code);
    
    if (hasClass) return 'Class/Interface definition';
    if (hasFunction) return 'Function implementation';
    if (hasImports) return 'Module imports and dependencies';
    
    return `${language || 'Code'} implementation`;
  }

  private identifyCodingPatterns(content: string, patterns: Map<string, TechnicalPattern>): void {
    const lowerContent = content.toLowerCase();
    
    // Error handling patterns
    if (/try\s*{|catch\s*\(|\.catch\(|except\s*:/.test(content)) {
      this.addPattern(patterns, 'error_handling', 'Error Handling', 'positive');
    }
    
    // Async patterns
    if (/async|await|promise|then\(/.test(lowerContent)) {
      this.addPattern(patterns, 'async_programming', 'Asynchronous Programming', 'neutral');
    }
    
    // Design patterns
    if (/singleton|factory|observer|strategy/.test(lowerContent)) {
      this.addPattern(patterns, 'design_patterns', 'Design Patterns Usage', 'positive');
    }
  }

  private addPattern(
    patterns: Map<string, TechnicalPattern>, 
    key: string, 
    pattern: string, 
    impact: 'positive' | 'neutral' | 'negative'
  ): void {
    const existing = patterns.get(key) || {
      pattern,
      occurrences: 0,
      impact,
      context: ''
    };
    
    patterns.set(key, {
      ...existing,
      occurrences: existing.occurrences + 1
    });
  }

  private updateContext(existing: string, newContent: string): string {
    const snippet = newContent.substring(0, 100);
    return existing ? `${existing}; ${snippet}` : snippet;
  }

  private categorizePattern(pattern: string): string | null {
    const lowerPattern = pattern.toLowerCase();
    
    if (lowerPattern.includes('typescript')) return 'TypeScript';
    if (lowerPattern.includes('react')) return 'React';
    if (lowerPattern.includes('node')) return 'Node.js';
    if (lowerPattern.includes('test')) return 'Testing';
    if (lowerPattern.includes('database') || lowerPattern.includes('sql')) return 'Database';
    if (lowerPattern.includes('api') || lowerPattern.includes('rest')) return 'API Development';
    if (lowerPattern.includes('security')) return 'Security';
    if (lowerPattern.includes('performance')) return 'Performance';
    
    return null;
  }

  private hasDefensiveProgramming(content: string): boolean {
    const indicators = [
      /if\s*\(.*null.*\)/,
      /if\s*\(.*undefined.*\)/,
      /\?\./,  // Optional chaining
      /\?\?/,  // Nullish coalescing
      /try\s*{/,
      /validate/i,
      /sanitize/i
    ];
    
    return indicators.some(pattern => pattern.test(content));
  }

  private hasTestDrivenApproach(messages: ProcessedMessage[], currentIndex: number): boolean {
    // Look for test mentions before implementation
    const previousMessages = messages.slice(Math.max(0, currentIndex - 5), currentIndex);
    return previousMessages.some(m => 
      /test|spec|describe|it\(|expect/.test(m.content.toLowerCase())
    );
  }

  private hasEarlyOptimization(content: string): boolean {
    const indicators = [
      /performance/i,
      /optimize/i,
      /faster/i,
      /cache/i,
      /memo/i
    ];
    
    // Check if optimization is mentioned without measurement
    const hasMeasurement = /benchmark|profile|measure|metric/.test(content);
    return indicators.some(pattern => pattern.test(content)) && !hasMeasurement;
  }

  private hasGoodDocumentation(content: string): boolean {
    const indicators = [
      /\/\*\*/,  // JSDoc
      /\/\/\//,  // Triple slash comments
      /@param/,
      /@returns/,
      /""".*"""/s,  // Python docstrings
      /summary>/  // XML docs
    ];
    
    return indicators.some(pattern => pattern.test(content));
  }

  private updateTendency(
    tendencies: Map<string, Partial<CodingTendency>>, 
    key: string, 
    update: Partial<CodingTendency>
  ): void {
    const existing = tendencies.get(key) || { frequency: 0 };
    tendencies.set(key, {
      ...existing,
      ...update,
      frequency: (existing.frequency || 0) + 1
    });
  }

  private identifyApproach(session: Session): {
    type: string;
    effectiveness: number;
    contexts: string[];
    strengths: string[];
    weaknesses: string[];
  } | null {
    const messages = session.messages;
    
    // Analyze message flow patterns
    const hasResearch = messages.some(m => 
      /search|look|find|explore|investigate/.test(m.content.toLowerCase())
    );
    const hasIterativeRefinement = this.hasIterativePattern(messages);
    const hasTopDown = this.hasTopDownPattern(messages);
    
    if (hasResearch && hasTopDown) {
      return {
        type: 'Research-First Top-Down',
        effectiveness: 85,
        contexts: ['Complex features', 'Unfamiliar codebases'],
        strengths: ['Thorough understanding', 'Well-planned implementation'],
        weaknesses: ['Can be time-consuming for simple tasks']
      };
    }
    
    if (hasIterativeRefinement) {
      return {
        type: 'Iterative Refinement',
        effectiveness: 80,
        contexts: ['UI development', 'API design', 'Performance tuning'],
        strengths: ['Quick feedback loops', 'Adaptable to changes'],
        weaknesses: ['May miss big picture initially']
      };
    }
    
    if (hasTopDown) {
      return {
        type: 'Top-Down Design',
        effectiveness: 75,
        contexts: ['Architecture design', 'System integration'],
        strengths: ['Clear structure', 'Good for complex systems'],
        weaknesses: ['May overlook implementation details']
      };
    }
    
    return null;
  }

  private hasIterativePattern(messages: ProcessedMessage[]): boolean {
    // Look for patterns of implementation followed by refinement
    let implementationCount = 0;
    let refinementCount = 0;
    
    messages.forEach(m => {
      if (/implement|create|build|write/.test(m.content.toLowerCase())) {
        implementationCount++;
      }
      if (/update|fix|improve|refactor|change/.test(m.content.toLowerCase())) {
        refinementCount++;
      }
    });
    
    return implementationCount > 0 && refinementCount > implementationCount * 0.3;
  }

  private hasTopDownPattern(messages: ProcessedMessage[]): boolean {
    // Look for high-level design followed by implementation
    const firstHalf = messages.slice(0, Math.floor(messages.length / 2));
    const secondHalf = messages.slice(Math.floor(messages.length / 2));
    
    const firstHalfDesign = firstHalf.filter(m => 
      /architecture|design|structure|plan|approach/.test(m.content.toLowerCase())
    ).length;
    
    const secondHalfImplementation = secondHalf.filter(m => 
      /implement|code|function|class|method/.test(m.content.toLowerCase())
    ).length;
    
    return firstHalfDesign > 0 && secondHalfImplementation > firstHalfDesign;
  }
}