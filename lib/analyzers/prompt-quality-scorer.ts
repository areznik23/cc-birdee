import { ProcessedMessage, PromptCharacteristics } from '../types';

export class PromptQualityScorer {
  /**
   * Score a prompt from 0-100 based on multiple quality factors
   */
  scorePrompt(message: ProcessedMessage): number {
    // Only score user messages
    if (message.role !== 'user') {
      return 0;
    }

    const content = message.content;
    const characteristics = this.analyzePromptCharacteristics(content);
    
    // Calculate component scores
    const scores = {
      specificity: this.calculateSpecificityScore(characteristics),
      clarity: this.calculateClarityScore(characteristics, content),
      context: this.calculateContextScore(characteristics),
      actionability: this.calculateActionabilityScore(characteristics),
      scope: this.calculateScopeScore(characteristics, content)
    };

    // Weight the scores
    const weights = {
      specificity: 0.30,   // 30%
      clarity: 0.25,       // 25%
      context: 0.20,       // 20%
      actionability: 0.15, // 15%
      scope: 0.10          // 10%
    };

    // Calculate weighted average
    const totalScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights]);
    }, 0);

    return Math.round(totalScore);
  }

  /**
   * Analyze prompt characteristics
   */
  private analyzePromptCharacteristics(content: string): PromptCharacteristics {
    return {
      hasCodeRefs: this.hasCodeReferences(content),
      hasTechTerms: this.hasTechnicalTerms(content),
      isQuestion: this.isQuestion(content),
      hasDirective: this.hasDirective(content),
      hasConstraints: this.hasConstraints(content),
      hasNextSteps: this.hasNextSteps(content),
      length: content.length
    };
  }

  /**
   * Calculate specificity score (0-100)
   * Higher scores for prompts with code references, file paths, function names
   */
  private calculateSpecificityScore(characteristics: PromptCharacteristics): number {
    let score = 0;

    if (characteristics.hasCodeRefs) score += 30;
    if (characteristics.hasTechTerms) score += 20;
    
    // Bonus for balanced length (not too short, not too long)
    if (characteristics.length >= 50 && characteristics.length <= 500) {
      score += 20;
    } else if (characteristics.length > 500) {
      score += 15; // Still good but might be too verbose
    } else if (characteristics.length >= 20) {
      score += 10; // Very short but not terrible
    }

    // Additional specificity checks
    const content = characteristics.length.toString(); // Using length as proxy for content
    if (content.length > 0) score += 30; // Base score for having content

    return Math.min(score, 100);
  }

  /**
   * Calculate clarity score (0-100)
   * Higher scores for clear questions or directives
   */
  private calculateClarityScore(characteristics: PromptCharacteristics, content: string): number {
    let score = 0;

    if (characteristics.isQuestion) score += 25;
    if (characteristics.hasDirective) score += 25;

    // Check for clear action words
    const actionWords = [
      'create', 'implement', 'fix', 'add', 'update', 'remove', 'modify',
      'explain', 'show', 'find', 'help', 'build', 'test', 'debug'
    ];
    
    const hasActionWords = actionWords.some(word => 
      content.toLowerCase().includes(word)
    );
    if (hasActionWords) score += 25;

    // Check for structure (bullet points, numbered lists)
    const hasStructure = /[-*•]\s|\d+\.\s|^\s*\d+\)/m.test(content);
    if (hasStructure) score += 25;

    return Math.min(score, 100);
  }

  /**
   * Calculate context score (0-100)
   * Higher scores for prompts that provide background or explain the situation
   */
  private calculateContextScore(characteristics: PromptCharacteristics): number {
    let score = 0;

    // Longer prompts tend to have more context
    if (characteristics.length > 200) score += 20;
    if (characteristics.length > 100) score += 15;
    else if (characteristics.length > 50) score += 10;

    // Technical terms suggest domain context
    if (characteristics.hasTechTerms) score += 20;

    // Code references provide concrete context
    if (characteristics.hasCodeRefs) score += 20;

    // Constraints show understanding of requirements
    if (characteristics.hasConstraints) score += 25;

    return Math.min(score, 100);
  }

  /**
   * Calculate actionability score (0-100)
   * Higher scores for prompts that clearly state what needs to be done
   */
  private calculateActionabilityScore(characteristics: PromptCharacteristics): number {
    let score = 0;

    if (characteristics.hasDirective) score += 30;
    if (characteristics.hasNextSteps) score += 30;
    if (characteristics.hasConstraints) score += 20;
    
    // Questions can be actionable too
    if (characteristics.isQuestion) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Calculate scope score (0-100)
   * Higher scores for well-scoped prompts (not too broad, not too narrow)
   */
  private calculateScopeScore(characteristics: PromptCharacteristics, content: string): number {
    let score = 0;

    if (characteristics.hasConstraints) score += 35;

    // Check for scope limiters
    const scopeLimiters = [
      'only', 'just', 'specific', 'single', 'one', 'this',
      'don\'t', 'avoid', 'without', 'except', 'focus on'
    ];
    
    const hasScopeLimiters = scopeLimiters.some(limiter => 
      content.toLowerCase().includes(limiter)
    );
    if (hasScopeLimiters) score += 35;

    // Moderate length suggests appropriate scope
    if (characteristics.length >= 50 && characteristics.length <= 300) {
      score += 30;
    } else if (characteristics.length > 300 && characteristics.length <= 500) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Check if content has code references
   */
  private hasCodeReferences(content: string): boolean {
    const patterns = [
      /`[^`]+`/,                    // Backtick code
      /\b\w+\(\)/,                  // Function calls
      /\b\w+\.\w+/,                 // Property access
      /\/[\w/]+\.\w+/,              // File paths
      /\b(class|function|const|let|var)\s+\w+/, // Code declarations
      /<\/?[\w\s="/.':;#-\/]+>/    // HTML/JSX tags
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has technical terms
   */
  private hasTechnicalTerms(content: string): boolean {
    const techTerms = [
      'api', 'function', 'method', 'class', 'component', 'variable',
      'database', 'server', 'client', 'frontend', 'backend', 'endpoint',
      'algorithm', 'data structure', 'array', 'object', 'string',
      'async', 'promise', 'callback', 'event', 'state', 'props',
      'typescript', 'javascript', 'react', 'node', 'npm', 'yarn'
    ];

    const lowerContent = content.toLowerCase();
    return techTerms.some(term => lowerContent.includes(term));
  }

  /**
   * Check if content is a question
   */
  private isQuestion(content: string): boolean {
    return /\?|^(how|what|where|when|why|can|could|should|would|is|are|do|does)/i.test(content);
  }

  /**
   * Check if content has a directive
   */
  private hasDirective(content: string): boolean {
    const directives = [
      /^(please\s+)?(create|implement|build|add|fix|update|modify|remove|delete|show|explain|help)/i,
      /\b(need to|want to|trying to|would like to|please)\b/i,
      /\b(make|write|develop|design|refactor|optimize)\b/i
    ];

    return directives.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has constraints
   */
  private hasConstraints(content: string): boolean {
    const constraints = [
      /\b(must|should|need to|require|constraint|limitation|only|just)\b/i,
      /\b(don't|avoid|without|except|but not|excluding)\b/i,
      /\b(within|less than|more than|between|up to|at least)\b/i
    ];

    return constraints.some(pattern => pattern.test(content));
  }

  /**
   * Check if content has next steps
   */
  private hasNextSteps(content: string): boolean {
    const nextSteps = [
      /\b(then|after|next|finally|afterwards|step \d+)\b/i,
      /\b(first|second|third|lastly)\b/i,
      /\d+\.\s+\w+/,  // Numbered lists
      /[-*]\s+\w+/    // Bullet points
    ];

    return nextSteps.some(pattern => pattern.test(content));
  }

  /**
   * Calculate average prompt quality for a session
   */
  calculateAverageQuality(messages: ProcessedMessage[]): number {
    const userMessages = messages.filter(m => m.role === 'user');
    
    if (userMessages.length === 0) return 0;

    const scores = userMessages.map(m => this.scorePrompt(m));
    const total = scores.reduce((sum, score) => sum + score, 0);

    return Math.round(total / userMessages.length);
  }
}