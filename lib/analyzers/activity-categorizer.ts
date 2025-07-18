import { ProcessedMessage, ActivityType } from '../types';

export class ActivityCategorizer {
  /**
   * Categorize a message based on its content and context
   */
  categorizeActivity(
    message: ProcessedMessage,
    previousMessage?: ProcessedMessage,
    nextMessage?: ProcessedMessage
  ): ActivityType {
    // Skip assistant messages for now - focus on user messages
    if (message.role === 'assistant') {
      return this.categorizeAssistantActivity(message, previousMessage);
    }

    const content = message.content.toLowerCase();
    const tools = message.toolsUsed;

    // Check for specific patterns in order of priority
    if (this.isInitialQuestion(message, previousMessage)) {
      return 'initial_question';
    }

    if (this.isTaskManagement(content, tools)) {
      return 'task_management';
    }

    if (this.isErrorHandling(content, previousMessage, nextMessage)) {
      return 'error_handling';
    }

    if (this.isImplementation(content, tools)) {
      return 'implementation';
    }

    if (this.isDeepDive(message, previousMessage)) {
      return 'deep_dive';
    }

    if (this.isConceptualPivot(message, previousMessage)) {
      return 'conceptual_pivot';
    }

    if (this.isCodeExploration(content, tools)) {
      return 'code_exploration';
    }

    if (this.isValidation(content)) {
      return 'validation';
    }

    if (this.isSolutionDesign(content)) {
      return 'solution_design';
    }

    // Check for follow-up/continuation patterns
    if (this.isFollowUp(content)) {
      return 'code_exploration';
    }

    // Default to exploration for questions, implementation for statements
    if (content.includes('?') || /\b(what|how|why|when|where|which)\b/i.test(content)) {
      return 'code_exploration';
    }
    
    return 'implementation';
  }

  private categorizeAssistantActivity(
    message: ProcessedMessage,
    previousMessage?: ProcessedMessage
  ): ActivityType {
    // Assistant messages typically follow the user's activity type
    if (previousMessage?.activity) {
      return previousMessage.activity;
    }

    // Otherwise, infer from tools used
    const tools = message.toolsUsed;
    if (tools.includes('Write') || tools.includes('MultiEdit') || tools.includes('Edit')) {
      return 'implementation';
    }
    if (tools.includes('TodoWrite')) {
      return 'task_management';
    }
    if (tools.includes('Read') || tools.includes('Grep') || tools.includes('Glob') || tools.includes('LS')) {
      return 'code_exploration';
    }
    if (tools.includes('Bash')) {
      return 'validation';
    }
    if (tools.includes('Task')) {
      return 'deep_dive';
    }

    // Default based on content analysis
    const content = message.content.toLowerCase();
    if (content.includes('error') || content.includes('fail')) {
      return 'error_handling';
    }
    
    return 'code_exploration';
  }

  private isInitialQuestion(
    message: ProcessedMessage,
    previousMessage?: ProcessedMessage
  ): boolean {
    // First message in session or significant time gap
    if (!previousMessage) return true;

    const timeDiff = message.timestamp.getTime() - previousMessage.timestamp.getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    return timeDiff > fifteenMinutes;
  }

  private isTaskManagement(content: string, tools: string[]): boolean {
    const patterns = [
      /\btodo\b/i,
      /\btask\b/i,
      /\bplan\b/i,
      /\bsteps?\b/i,
      /\borganize\b/i,
      /\bschedule\b/i,
      /\bprioritize\b/i,
      /\blet's\s+(start|begin|do)/i,
      /\bwhat\s+(should|do)\s+(i|we)\s+do/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  private isErrorHandling(
    content: string,
    previousMessage?: ProcessedMessage,
    nextMessage?: ProcessedMessage
  ): boolean {
    const errorPatterns = [
      /\berror\b/i,
      /\bfailed?\b/i,
      /\bexception\b/i,
      /\bbug\b/i,
      /\bcrash/i,
      /\bnot working\b/i,
      /\bdoesn't work\b/i,
      /\bfix\b/i,
      /\bissue\b/i,
      /\bproblem\b/i,
      /\bwrong\b/i,
      /\bbroken\b/i,
      /\b404\b/,
      /\b500\b/,
      /\bwarning\b/i,
      /\bgetting\s+this\s*:/i,
      /\bwhy\s+is\s+this\b/i
    ];

    return errorPatterns.some(pattern => pattern.test(content));
  }

  private isImplementation(content: string, tools: string[]): boolean {
    const patterns = [
      /\bimplement\b/i,
      /\bcreate\b/i,
      /\bbuild\b/i,
      /\badd\b/i,
      /\bwrite\b/i,
      /\bcode\b/i,
      /\bdevelop\b/i,
      /\bmake\b/i,
      /\bgenerate\b/i,
      /\bupdate\b/i,
      /\bmodify\b/i,
      /\brefactor\b/i,
      /\bchange\b/i,
      /\bedit\b/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  private isDeepDive(
    message: ProcessedMessage,
    previousMessage?: ProcessedMessage
  ): boolean {
    const tools = message.toolsUsed;
    
    // Multiple reads indicate deep exploration
    const readCount = tools.filter(t => t === 'Read').length;
    if (readCount > 3) return true;

    const content = message.content.toLowerCase();
    const patterns = [
      /\bunderstand\b/i,
      /\banalyze\b/i,
      /\bexplain\b/i,
      /\bhow does\b/i,
      /\bwhy does\b/i,
      /\bdeep dive\b/i,
      /\binvestigate\b/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  private isConceptualPivot(
    message: ProcessedMessage,
    previousMessage?: ProcessedMessage
  ): boolean {
    if (!previousMessage) return false;

    const content = message.content.toLowerCase();
    const prevContent = previousMessage.content.toLowerCase();

    // Check for topic change indicators
    const pivotPatterns = [
      /\binstead\b/i,
      /\bactually\b/i,
      /\bwait\b/i,
      /\blet's try\b/i,
      /\bdifferent approach\b/i,
      /\bchange\b/i,
      /\bswitch\b/i,
      /\bnew idea\b/i
    ];

    const hasPivotIndicator = pivotPatterns.some(pattern => pattern.test(content));

    // Check for significant content change
    const hasConceptualShift = this.calculateSimilarity(content, prevContent) < 0.3;

    return hasPivotIndicator || hasConceptualShift;
  }

  private isCodeExploration(content: string, tools: string[]): boolean {
    const patterns = [
      /\bfind\b/i,
      /\bsearch\b/i,
      /\blook\s+(for|at)\b/i,
      /\bwhere\s+(is|are)\b/i,
      /\blocate\b/i,
      /\bexplore\b/i,
      /\bcheck\b/i,
      /\bshow\s+me\b/i,
      /\bwhat\s+(is|are)\b/i,
      /\bread\b/i,
      /\bopen\b/i,
      /\bview\b/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  private isValidation(content: string): boolean {
    const patterns = [
      /\btest\b/i,
      /\bverify\b/i,
      /\bvalidate\b/i,
      /\bconfirm\b/i,
      /\bcheck if\b/i,
      /\bensure\b/i,
      /\bmake sure\b/i,
      /\brun\b.*\b(test|build|lint|check)\b/i,
      /\btry\b/i,
      /\bsee if\b/i,
      /\bdoes\s+it\s+work\b/i,
      /\bis\s+it\s+working\b/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  private isSolutionDesign(content: string): boolean {
    const patterns = [
      /\bdesign\b/i,
      /\barchitecture\b/i,
      /\bstructure\b/i,
      /\bapproach\b/i,
      /\bstrategy\b/i,
      /\bpattern\b/i,
      /\bsolution\b/i,
      /\bhow should\b/i,
      /\bbest way\b/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Calculate simple similarity between two strings (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check if message is a follow-up or continuation
   */
  private isFollowUp(content: string): boolean {
    const patterns = [
      /^(yes|no|ok|okay|sure|thanks|thank you|got it|i see|ah|oh)/i,
      /^(continue|proceed|go ahead|next)/i,
      /^(done|finished|completed)/i,
      /^(also|additionally|furthermore)/i,
      /^(now|then)/i
    ];

    return patterns.some(pattern => pattern.test(content.trim()));
  }

  /**
   * Categorize all messages in a session
   */
  categorizeSession(messages: ProcessedMessage[]): ProcessedMessage[] {
    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : undefined;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
      
      const activity = this.categorizeActivity(message, previousMessage, nextMessage);
      
      return {
        ...message,
        activity
      };
    });
  }
}