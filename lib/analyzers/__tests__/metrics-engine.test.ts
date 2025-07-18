import { MetricsEngine } from '../metrics-engine';
import { Session, ProcessedMessage } from '../../types';

describe('MetricsEngine', () => {
  let engine: MetricsEngine;

  beforeEach(() => {
    engine = new MetricsEngine();
  });

  const createMessage = (overrides: Partial<ProcessedMessage> = {}): ProcessedMessage => ({
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    tokens: { input: 10, output: 20 },
    toolsUsed: [],
    activity: 'initial_question',
    ...overrides
  });

  const createSession = (messages: ProcessedMessage[]): Session => ({
    id: 'session1',
    summary: 'Test session',
    duration: 30, // 30 minutes
    messages,
    metrics: {
      totalTokens: 0,
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
    startTime: new Date('2024-01-01T00:00:00Z'),
    endTime: new Date('2024-01-01T00:30:00Z')
  });

  describe('calculateMetrics', () => {
    it('should calculate total tokens', () => {
      const messages = [
        createMessage({ tokens: { input: 10, output: 20 } }),
        createMessage({ tokens: { input: 15, output: 25 } })
      ];
      const session = createSession(messages);
      
      const metrics = engine.calculateMetrics(session);
      
      expect(metrics.totalTokens).toBe(70); // 10+20+15+25
    });

    it('should count messages by role', () => {
      const messages = [
        createMessage({ role: 'user' }),
        createMessage({ role: 'assistant' }),
        createMessage({ role: 'user' }),
        createMessage({ role: 'assistant' })
      ];
      const session = createSession(messages);
      
      const metrics = engine.calculateMetrics(session);
      
      expect(metrics.messageCount.user).toBe(2);
      expect(metrics.messageCount.assistant).toBe(2);
    });

    it('should calculate tool usage', () => {
      const messages = [
        createMessage({ toolsUsed: ['Read', 'Grep'] }),
        createMessage({ toolsUsed: ['Read', 'Write'] }),
        createMessage({ toolsUsed: ['Read'] })
      ];
      const session = createSession(messages);
      
      const metrics = engine.calculateMetrics(session);
      
      expect(metrics.toolUsage).toEqual({
        Read: 3,
        Grep: 1,
        Write: 1
      });
    });

    it('should calculate activity breakdown', () => {
      const messages = [
        createMessage({ activity: 'initial_question' }),
        createMessage({ activity: 'code_exploration' }),
        createMessage({ activity: 'implementation' }),
        createMessage({ activity: 'code_exploration' })
      ];
      const session = createSession(messages);
      
      const metrics = engine.calculateMetrics(session);
      
      expect(metrics.activityBreakdown).toEqual({
        initial_question: 1,
        code_exploration: 2,
        implementation: 1
      });
    });
  });

  describe('calculateAggregateMetrics', () => {
    it('should aggregate metrics across sessions', () => {
      const session1 = createSession([
        createMessage({ tokens: { input: 10, output: 20 }, toolsUsed: ['Read'] })
      ]);
      session1.metrics = engine.calculateMetrics(session1);
      
      const session2 = createSession([
        createMessage({ tokens: { input: 15, output: 25 }, toolsUsed: ['Write'] })
      ]);
      session2.metrics = engine.calculateMetrics(session2);
      
      const aggregate = engine.calculateAggregateMetrics([session1, session2]);
      
      expect(aggregate.totalSessions).toBe(2);
      expect(aggregate.totalTokens).toBe(70);
      expect(aggregate.avgTokensPerSession).toBe(35);
      expect(aggregate.topTools).toEqual([
        { tool: 'Read', count: 1 },
        { tool: 'Write', count: 1 }
      ]);
    });
  });

  describe('calculateEfficiencyMetrics', () => {
    it('should calculate efficiency metrics', () => {
      const messages = [
        createMessage({ tokens: { input: 10, output: 20 }, toolsUsed: ['Read'] }),
        createMessage({ tokens: { input: 20, output: 40 }, toolsUsed: ['Write', 'Grep'] })
      ];
      const session = createSession(messages);
      session.duration = 10; // 10 minutes
      session.metrics = engine.calculateMetrics(session);
      
      const efficiency = engine.calculateEfficiencyMetrics(session);
      
      expect(efficiency.tokensPerMinute).toBe(9); // 90 tokens / 10 minutes
      expect(efficiency.messagesPerMinute).toBe(0.2); // 2 messages / 10 minutes
      expect(efficiency.toolsPerMessage).toBe(1.5); // 3 tools / 2 messages
    });

    it('should handle zero duration', () => {
      const session = createSession([createMessage()]);
      session.duration = 0;
      session.metrics = engine.calculateMetrics(session);
      
      const efficiency = engine.calculateEfficiencyMetrics(session);
      
      // Should use 1 as minimum duration
      expect(efficiency.tokensPerMinute).toBe(30); // Default tokens
      expect(efficiency.messagesPerMinute).toBe(1);
    });
  });

  describe('calculateSessionMetrics', () => {
    it('should calculate metrics for multiple sessions', () => {
      const sessions = [
        createSession([createMessage()]),
        createSession([createMessage(), createMessage()])
      ];
      
      const sessionsWithMetrics = engine.calculateSessionMetrics(sessions);
      
      expect(sessionsWithMetrics[0].metrics.totalTokens).toBeGreaterThan(0);
      expect(sessionsWithMetrics[1].metrics.totalTokens).toBeGreaterThan(0);
    });
  });
});