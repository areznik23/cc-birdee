import { SessionScorer } from '../session-scorer';
import { Session, ProcessedMessage } from '../../types';

describe('SessionScorer', () => {
  let scorer: SessionScorer;

  beforeEach(() => {
    scorer = new SessionScorer();
  });

  const createMessage = (overrides: Partial<ProcessedMessage> = {}): ProcessedMessage => ({
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date(),
    tokens: { input: 10, output: 20 },
    toolsUsed: [],
    activity: 'initial_question',
    promptQuality: 70,
    ...overrides
  });

  const createSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session1',
    summary: 'Test session',
    duration: 30,
    messages: [],
    metrics: {
      totalTokens: 3000,
      messageCount: { user: 5, assistant: 5 },
      toolUsage: { Read: 3, Write: 2 },
      avgPromptQuality: 70,
      loopCount: 0,
      activityBreakdown: {
        initial_question: 1,
        code_exploration: 2,
        implementation: 3,
        validation: 1
      },
      sessionScore: 0,
      scoreBreakdown: {
        efficiency: 0,
        quality: 0,
        progression: 0,
        toolMastery: 0
      }
    },
    startTime: new Date(),
    endTime: new Date(),
    ...overrides
  });

  describe('scoreSession', () => {
    it('should calculate composite score', () => {
      const session = createSession();
      const score = scorer.scoreSession(session);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give high scores for efficient sessions', () => {
      const efficientSession = createSession({
        duration: 10, // Short duration
        metrics: {
          ...createSession().metrics,
          totalTokens: 3000, // High token count
          loopCount: 0
        }
      });

      const inefficientSession = createSession({
        duration: 60, // Long duration
        metrics: {
          ...createSession().metrics,
          totalTokens: 1000, // Low token count
          loopCount: 3
        }
      });

      const efficientScore = scorer.scoreSession(efficientSession);
      const inefficientScore = scorer.scoreSession(inefficientSession);

      expect(efficientScore).toBeGreaterThan(inefficientScore);
    });
  });

  describe('calculateScoreBreakdown', () => {
    it('should calculate all score components', () => {
      const session = createSession();
      const breakdown = scorer.calculateScoreBreakdown(session);

      expect(breakdown).toHaveProperty('efficiency');
      expect(breakdown).toHaveProperty('quality');
      expect(breakdown).toHaveProperty('progression');
      expect(breakdown).toHaveProperty('toolMastery');

      Object.values(breakdown).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('efficiency scoring', () => {
    it('should score based on tokens per minute', () => {
      const session = createSession({
        duration: 10,
        metrics: {
          ...createSession().metrics,
          totalTokens: 2000 // 200 tokens/minute
        }
      });

      const breakdown = scorer.calculateScoreBreakdown(session);
      expect(breakdown.efficiency).toBeGreaterThan(60);
    });

    it('should penalize too many messages', () => {
      const normalSession = createSession({
        duration: 10,
        metrics: {
          ...createSession().metrics,
          messageCount: { user: 5, assistant: 5 } // 1 message/minute
        }
      });

      const chattySe
ssion = createSession({
        duration: 10,
        metrics: {
          ...createSession().metrics,
          messageCount: { user: 15, assistant: 15 } // 3 messages/minute
        }
      });

      const normalBreakdown = scorer.calculateScoreBreakdown(normalSession);
      const chattyBreakdown = scorer.calculateScoreBreakdown(chattySession);

      expect(normalBreakdown.efficiency).toBeGreaterThan(chattyBreakdown.efficiency);
    });
  });

  describe('quality scoring', () => {
    it('should use average prompt quality', () => {
      const session = createSession({
        metrics: {
          ...createSession().metrics,
          avgPromptQuality: 85
        }
      });

      const breakdown = scorer.calculateScoreBreakdown(session);
      expect(breakdown.quality).toBe(85);
    });
  });

  describe('progression scoring', () => {
    it('should penalize loops', () => {
      const noLoopSession = createSession({
        metrics: {
          ...createSession().metrics,
          loopCount: 0
        }
      });

      const loopSession = createSession({
        metrics: {
          ...createSession().metrics,
          loopCount: 3
        }
      });

      const noLoopBreakdown = scorer.calculateScoreBreakdown(noLoopSession);
      const loopBreakdown = scorer.calculateScoreBreakdown(loopSession);

      expect(noLoopBreakdown.progression).toBeGreaterThan(loopBreakdown.progression);
    });

    it('should reward productive activities', () => {
      const productiveSession = createSession({
        metrics: {
          ...createSession().metrics,
          activityBreakdown: {
            implementation: 5,
            validation: 2,
            completion: 1
          }
        }
      });

      const unproductiveSession = createSession({
        metrics: {
          ...createSession().metrics,
          activityBreakdown: {
            error_handling: 5,
            code_exploration: 3
          }
        }
      });

      const productiveBreakdown = scorer.calculateScoreBreakdown(productiveSession);
      const unproductiveBreakdown = scorer.calculateScoreBreakdown(unproductiveSession);

      expect(productiveBreakdown.progression).toBeGreaterThan(unproductiveBreakdown.progression);
    });

    it('should reward good activity flow', () => {
      const messages = [
        createMessage({ activity: 'initial_question' }),
        createMessage({ activity: 'code_exploration' }),
        createMessage({ activity: 'implementation' })
      ];

      const session = createSession({ messages });
      const breakdown = scorer.calculateScoreBreakdown(session);

      expect(breakdown.progression).toBeGreaterThan(50);
    });
  });

  describe('tool mastery scoring', () => {
    it('should reward tool diversity', () => {
      const diverseSession = createSession({
        metrics: {
          ...createSession().metrics,
          toolUsage: { Read: 2, Write: 2, Grep: 1, TodoWrite: 1 }
        }
      });

      const singleToolSession = createSession({
        metrics: {
          ...createSession().metrics,
          toolUsage: { Read: 6 }
        }
      });

      const diverseBreakdown = scorer.calculateScoreBreakdown(diverseSession);
      const singleBreakdown = scorer.calculateScoreBreakdown(singleToolSession);

      expect(diverseBreakdown.toolMastery).toBeGreaterThan(singleBreakdown.toolMastery);
    });

    it('should reward appropriate tool usage', () => {
      const messages = [
        createMessage({ 
          toolsUsed: ['Read', 'Grep'],
          activity: 'code_exploration'
        }),
        createMessage({ 
          toolsUsed: ['Write'],
          activity: 'implementation'
        })
      ];

      const session = createSession({ messages });
      const breakdown = scorer.calculateScoreBreakdown(session);

      expect(breakdown.toolMastery).toBeGreaterThan(50);
    });
  });

  describe('updateSessionScores', () => {
    it('should update session with calculated scores', () => {
      const session = createSession();
      const updatedSession = scorer.updateSessionScores(session);

      expect(updatedSession.metrics.sessionScore).toBeGreaterThan(0);
      expect(updatedSession.metrics.scoreBreakdown.efficiency).toBeGreaterThan(0);
      expect(updatedSession.metrics.scoreBreakdown.quality).toBe(70);
      expect(updatedSession.metrics.scoreBreakdown.progression).toBeGreaterThan(0);
      expect(updatedSession.metrics.scoreBreakdown.toolMastery).toBeGreaterThan(0);
    });
  });
});