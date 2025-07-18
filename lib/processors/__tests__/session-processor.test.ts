import { SessionProcessor } from '../session-processor';
import { LogEntry } from '../../types';

describe('SessionProcessor', () => {
  let processor: SessionProcessor;

  beforeEach(() => {
    processor = new SessionProcessor();
  });

  const createMockEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
    type: 'user',
    uuid: '123',
    parentUuid: null,
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session1',
    message: {
      role: 'user',
      content: 'Test message'
    },
    ...overrides
  });

  describe('processSession', () => {
    it('should process a simple session', () => {
      const entries: LogEntry[] = [
        createMockEntry({
          uuid: '1',
          type: 'user',
          message: { role: 'user', content: 'Hello' }
        }),
        createMockEntry({
          uuid: '2',
          parentUuid: '1',
          type: 'assistant',
          timestamp: '2024-01-01T00:00:10Z',
          message: {
            role: 'assistant',
            content: 'Hi there!',
            usage: { input_tokens: 10, output_tokens: 20 }
          }
        })
      ];

      const session = processor.processSession(entries, 'session1');

      expect(session.id).toBe('session1');
      expect(session.messages).toHaveLength(2);
      expect(session.messages[0].content).toBe('Hello');
      expect(session.messages[1].content).toBe('Hi there!');
      expect(session.duration).toBeCloseTo(10 / 60); // 10 seconds in minutes
    });

    it('should handle parent-child relationships', () => {
      const entries: LogEntry[] = [
        createMockEntry({ uuid: '3', parentUuid: '2' }),
        createMockEntry({ uuid: '1', parentUuid: null }),
        createMockEntry({ uuid: '2', parentUuid: '1' })
      ];

      const session = processor.processSession(entries, 'session1');
      
      // Should be ordered by thread relationship
      expect(session.messages.map(m => m.id)).toEqual(['1', '2', '3']);
    });

    it('should extract tool usage', () => {
      const entries: LogEntry[] = [
        createMockEntry({
          uuid: '1',
          type: 'assistant',
          message: {
            role: 'assistant',
            content: 'Using Read tool to check the file'
          }
        }),
        createMockEntry({
          uuid: '2',
          type: 'assistant',
          toolUseResult: [{ toolName: 'Write' }],
          message: {
            role: 'assistant',
            content: 'Writing to file'
          }
        })
      ];

      const session = processor.processSession(entries, 'session1');
      
      expect(session.messages[0].toolsUsed).toContain('Read');
      expect(session.messages[1].toolsUsed).toContain('Write');
    });

    it('should use summary entry if available', () => {
      const entries: LogEntry[] = [
        createMockEntry({
          uuid: '1',
          type: 'user',
          message: { role: 'user', content: 'Question' }
        }),
        createMockEntry({
          uuid: '2',
          type: 'summary',
          message: { role: 'assistant', content: 'Session Summary: Discussed testing' }
        })
      ];

      const session = processor.processSession(entries, 'session1');
      expect(session.summary).toBe('Session Summary: Discussed testing');
    });

    it('should generate summary from first user message if no summary entry', () => {
      const entries: LogEntry[] = [
        createMockEntry({
          uuid: '1',
          type: 'user',
          message: { 
            role: 'user', 
            content: 'This is a very long question that should be truncated in the summary because it exceeds the character limit for summaries' 
          }
        })
      ];

      const session = processor.processSession(entries, 'session1');
      expect(session.summary).toEndWith('...');
      expect(session.summary.length).toBeLessThanOrEqual(103); // 100 chars + '...'
    });
  });

  describe('processSessions', () => {
    it('should process multiple sessions', () => {
      const sessionMap = new Map<string, LogEntry[]>([
        ['session1', [createMockEntry({ sessionId: 'session1' })]],
        ['session2', [createMockEntry({ sessionId: 'session2', timestamp: '2024-01-01T01:00:00Z' })]]
      ]);

      const sessions = processor.processSessions(sessionMap);
      
      expect(sessions).toHaveLength(2);
      // Should be sorted by start time, most recent first
      expect(sessions[0].id).toBe('session2');
      expect(sessions[1].id).toBe('session1');
    });

    it('should handle processing errors gracefully', () => {
      const sessionMap = new Map<string, LogEntry[]>([
        ['session1', []], // Empty session will cause error
        ['session2', [createMockEntry({ sessionId: 'session2' })]]
      ]);

      const sessions = processor.processSessions(sessionMap);
      
      // Should only return successfully processed sessions
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session2');
    });
  });
});