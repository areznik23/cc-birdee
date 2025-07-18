import { LogEntry, Session, ProcessedMessage, ActivityType } from '../types';
import { extractTextFromContent } from '../utils';
import { ActivityCategorizer } from '../analyzers/activity-categorizer';

export class SessionProcessor {
  private activityCategorizer: ActivityCategorizer;

  constructor() {
    this.activityCategorizer = new ActivityCategorizer();
  }

  /**
   * Process log entries into a structured session
   */
  processSession(entries: LogEntry[], sessionId: string): Session {
    if (entries.length === 0) {
      throw new Error('Cannot process empty session');
    }

    // Sort entries by timestamp to ensure chronological order
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Build parent-child relationships
    const entryMap = new Map<string, LogEntry>();
    sortedEntries.forEach(entry => {
      entryMap.set(entry.uuid, entry);
    });

    // Process messages
    const messages: ProcessedMessage[] = [];
    const processedUuids = new Set<string>();

    sortedEntries.forEach(entry => {
      if (processedUuids.has(entry.uuid)) return;
      
      const thread = this.buildThread(entry, entryMap);
      const processedMessages = this.processThread(thread);
      messages.push(...processedMessages);
      
      thread.forEach(e => processedUuids.add(e.uuid));
    });

    // Categorize activities for all messages
    const categorizedMessages = this.activityCategorizer.categorizeSession(messages);

    // Calculate session metrics
    const startTime = new Date(sortedEntries[0].timestamp);
    const endTime = new Date(sortedEntries[sortedEntries.length - 1].timestamp);
    const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // minutes

    // Extract summary
    const summaryEntry = sortedEntries.find(e => e.type === 'summary');
    const summary = summaryEntry 
      ? extractTextFromContent(summaryEntry.message.content) 
      : this.generateSummary(categorizedMessages);

    return {
      id: sessionId,
      summary,
      duration,
      messages: categorizedMessages,
      metrics: {
        totalTokens: 0, // Will be calculated by metrics engine
        messageCount: { user: 0, assistant: 0 },
        toolUsage: {},
        avgPromptQuality: 0,
        loopCount: 0,
        activityBreakdown: {},
        sessionScore: 0,
        scoreBreakdown: {
          efficiency: 0,
          quality: 0,
          progression: 0,
          toolMastery: 0
        }
      },
      startTime,
      endTime
    };
  }

  /**
   * Build a thread from an entry by following parent-child relationships
   */
  private buildThread(entry: LogEntry, entryMap: Map<string, LogEntry>): LogEntry[] {
    const thread: LogEntry[] = [];
    let current: LogEntry | undefined = entry;

    // Traverse up to root
    while (current) {
      thread.unshift(current);
      current = current.parentUuid ? entryMap.get(current.parentUuid) : undefined;
    }

    // Collect all children
    const collectChildren = (parentUuid: string) => {
      entryMap.forEach(e => {
        if (e.parentUuid === parentUuid && !thread.includes(e)) {
          thread.push(e);
          collectChildren(e.uuid);
        }
      });
    };

    thread.forEach(e => collectChildren(e.uuid));

    // Sort thread chronologically
    return thread.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Process a thread of entries into processed messages
   */
  private processThread(thread: LogEntry[]): ProcessedMessage[] {
    return thread
      .filter(entry => entry.type !== 'summary') // Exclude summary entries
      .map(entry => this.processMessage(entry));
  }

  /**
   * Process a single log entry into a processed message
   */
  private processMessage(entry: LogEntry): ProcessedMessage {
    const content = extractTextFromContent(entry.message.content);
    const toolsUsed = this.extractToolsUsed(entry);

    return {
      id: entry.uuid,
      role: entry.message.role,
      content,
      timestamp: new Date(entry.timestamp),
      tokens: {
        input: entry.message.usage?.input_tokens || 0,
        output: entry.message.usage?.output_tokens || 0
      },
      toolsUsed
    };
  }

  /**
   * Extract tool names used in a message
   */
  private extractToolsUsed(entry: LogEntry): string[] {
    const tools: string[] = [];
    
    if (entry.toolUseResult) {
      // Extract from toolUseResult if available
      if (Array.isArray(entry.toolUseResult)) {
        entry.toolUseResult.forEach(result => {
          if (result.toolName) tools.push(result.toolName);
        });
      }
    }

    // Also check content for tool usage patterns
    const content = extractTextFromContent(entry.message.content);
    const toolPatterns = [
      /using (\w+) tool/gi,
      /<tool>(\w+)<\/tool>/gi,
      /\[(\w+)\]/g // Common tool notation
    ];

    toolPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !tools.includes(match[1])) {
          tools.push(match[1]);
        }
      }
    });

    return tools;
  }

  /**
   * Generate a summary from messages if none exists
   */
  private generateSummary(messages: ProcessedMessage[]): string {
    if (messages.length === 0) return 'Empty session';

    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const preview = firstUserMessage.content.slice(0, 100);
      return preview.length < firstUserMessage.content.length 
        ? `${preview}...` 
        : preview;
    }

    return 'Session without user messages';
  }

  /**
   * Process multiple sessions from grouped entries
   */
  processSessions(sessionMap: Map<string, LogEntry[]>): Session[] {
    const sessions: Session[] = [];

    sessionMap.forEach((entries, sessionId) => {
      try {
        const session = this.processSession(entries, sessionId);
        sessions.push(session);
      } catch (error) {
        console.error(`Failed to process session ${sessionId}:`, error);
      }
    });

    // Sort by start time, most recent first
    return sessions.sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    );
  }
}