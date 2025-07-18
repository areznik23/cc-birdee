import { LogEntry } from '../types';
import { MAX_FILE_SIZE_MB } from '../constants';

export class JSONLParseError extends Error {
  constructor(message: string, public line: number, public cause?: Error) {
    super(`Line ${line}: ${message}`);
    this.name = 'JSONLParseError';
  }
}

export interface ParseOptions {
  maxSizeMB?: number;
  strict?: boolean;
}

export class JSONLParser {
  private maxSizeBytes: number;
  private strict: boolean;

  constructor(options: ParseOptions = {}) {
    this.maxSizeBytes = (options.maxSizeMB || MAX_FILE_SIZE_MB) * 1024 * 1024;
    this.strict = options.strict ?? true;
  }

  /**
   * Parse JSONL content into LogEntry array
   */
  parse(content: string): LogEntry[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    // Check size limit
    const sizeInBytes = new TextEncoder().encode(content).length;
    if (sizeInBytes > this.maxSizeBytes) {
      throw new Error(
        `File size ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`
      );
    }

    const lines = content.split('\n').filter(line => line.trim());
    const entries: LogEntry[] = [];
    const errors: JSONLParseError[] = [];

    lines.forEach((line, index) => {
      try {
        const entry = this.parseLine(line, index + 1);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        if (this.strict) {
          throw error;
        }
        errors.push(error as JSONLParseError);
      }
    });

    if (errors.length > 0 && !this.strict) {
      console.warn(`Parsed with ${errors.length} errors:`, errors);
    }

    return entries;
  }

  /**
   * Parse a single JSONL line
   */
  private parseLine(line: string, lineNumber: number): LogEntry | null {
    if (!line.trim()) {
      return null;
    }

    try {
      const data = JSON.parse(line);
      return this.validateLogEntry(data, lineNumber);
    } catch (error) {
      throw new JSONLParseError(
        'Invalid JSON',
        lineNumber,
        error as Error
      );
    }
  }

  /**
   * Validate parsed data matches LogEntry schema
   */
  private validateLogEntry(data: any, lineNumber: number): LogEntry {
    // Required fields
    if (!data.type || !['user', 'assistant', 'summary'].includes(data.type)) {
      throw new JSONLParseError(
        `Invalid type: ${data.type}`,
        lineNumber
      );
    }

    if (!data.uuid || typeof data.uuid !== 'string') {
      throw new JSONLParseError(
        'Missing or invalid uuid',
        lineNumber
      );
    }

    if (!data.timestamp || typeof data.timestamp !== 'string') {
      throw new JSONLParseError(
        'Missing or invalid timestamp',
        lineNumber
      );
    }

    if (!data.sessionId || typeof data.sessionId !== 'string') {
      throw new JSONLParseError(
        'Missing or invalid sessionId',
        lineNumber
      );
    }

    if (!data.message || typeof data.message !== 'object') {
      throw new JSONLParseError(
        'Missing or invalid message',
        lineNumber
      );
    }

    // Validate message structure
    if (!data.message.role || !['user', 'assistant'].includes(data.message.role)) {
      throw new JSONLParseError(
        `Invalid message role: ${data.message.role}`,
        lineNumber
      );
    }

    if (data.message.content === undefined || data.message.content === null) {
      throw new JSONLParseError(
        'Missing message content',
        lineNumber
      );
    }

    return {
      type: data.type,
      uuid: data.uuid,
      parentUuid: data.parentUuid || null,
      timestamp: data.timestamp,
      sessionId: data.sessionId,
      message: data.message,
      toolUseResult: data.toolUseResult
    };
  }

  /**
   * Parse JSONL file content and group by session
   */
  parseAndGroupBySessions(content: string): Map<string, LogEntry[]> {
    const entries = this.parse(content);
    const sessions = new Map<string, LogEntry[]>();

    entries.forEach(entry => {
      const sessionId = entry.sessionId;
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)!.push(entry);
    });

    // Sort entries within each session by timestamp
    sessions.forEach(entries => {
      entries.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    return sessions;
  }
}