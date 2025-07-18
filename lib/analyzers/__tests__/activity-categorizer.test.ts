import { ActivityCategorizer } from '../activity-categorizer';
import { ProcessedMessage } from '../../types';

describe('ActivityCategorizer', () => {
  let categorizer: ActivityCategorizer;

  beforeEach(() => {
    categorizer = new ActivityCategorizer();
  });

  const createMessage = (overrides: Partial<ProcessedMessage> = {}): ProcessedMessage => ({
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    tokens: { input: 0, output: 0 },
    toolsUsed: [],
    ...overrides
  });

  describe('categorizeActivity', () => {
    it('should identify initial question', () => {
      const message = createMessage({ content: 'How do I implement authentication?' });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('initial_question');
    });

    it('should identify task management', () => {
      const message = createMessage({ 
        content: 'Create a todo list for this feature',
        toolsUsed: ['TodoWrite']
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('task_management');
    });

    it('should identify error handling', () => {
      const message = createMessage({ 
        content: 'I got an error when running the code'
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('error_handling');
    });

    it('should identify implementation', () => {
      const message = createMessage({ 
        content: 'Create a new component',
        toolsUsed: ['Write']
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('implementation');
    });

    it('should identify deep dive', () => {
      const message = createMessage({ 
        content: 'Help me understand how this works',
        toolsUsed: ['Read', 'Read', 'Read', 'Read']
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('deep_dive');
    });

    it('should identify conceptual pivot', () => {
      const prev = createMessage({ 
        content: 'Implement authentication',
        timestamp: new Date('2024-01-01T00:00:00Z')
      });
      const message = createMessage({ 
        content: 'Actually, lets try a different approach',
        timestamp: new Date('2024-01-01T00:00:30Z')
      });
      const activity = categorizer.categorizeActivity(message, prev);
      expect(activity).toBe('conceptual_pivot');
    });

    it('should identify code exploration', () => {
      const message = createMessage({ 
        content: 'Find all occurrences of getUserData',
        toolsUsed: ['Grep']
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('code_exploration');
    });

    it('should identify validation', () => {
      const message = createMessage({ 
        content: 'Run the tests to make sure everything works'
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('validation');
    });

    it('should identify solution design', () => {
      const message = createMessage({ 
        content: 'What is the best architecture for this feature?'
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('solution_design');
    });

    it('should default to completion', () => {
      const message = createMessage({ 
        content: 'Thanks'
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('completion');
    });

    it('should categorize assistant messages based on tools', () => {
      const message = createMessage({ 
        role: 'assistant',
        content: 'Creating the file',
        toolsUsed: ['Write']
      });
      const activity = categorizer.categorizeActivity(message);
      expect(activity).toBe('implementation');
    });
  });

  describe('categorizeSession', () => {
    it('should categorize all messages in a session', () => {
      const messages: ProcessedMessage[] = [
        createMessage({ content: 'How do I build a form?' }),
        createMessage({ 
          role: 'assistant', 
          content: 'Ill help you build a form',
          toolsUsed: ['Write']
        }),
        createMessage({ content: 'I got an error' }),
        createMessage({ 
          role: 'assistant', 
          content: 'Let me fix that error'
        })
      ];

      const categorized = categorizer.categorizeSession(messages);
      
      expect(categorized[0].activity).toBe('initial_question');
      expect(categorized[1].activity).toBe('initial_question'); // Follows user activity
      expect(categorized[2].activity).toBe('error_handling');
      expect(categorized[3].activity).toBe('error_handling'); // Follows user activity
    });

    it('should detect time gaps for new questions', () => {
      const messages: ProcessedMessage[] = [
        createMessage({ 
          content: 'First question',
          timestamp: new Date('2024-01-01T00:00:00Z')
        }),
        createMessage({ 
          content: 'New question after break',
          timestamp: new Date('2024-01-01T00:20:00Z') // 20 min gap
        })
      ];

      const categorized = categorizer.categorizeSession(messages);
      
      expect(categorized[0].activity).toBe('initial_question');
      expect(categorized[1].activity).toBe('initial_question');
    });
  });
});