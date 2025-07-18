import { PromptQualityScorer } from '../prompt-quality-scorer';
import { ProcessedMessage } from '../../types';

describe('PromptQualityScorer', () => {
  let scorer: PromptQualityScorer;

  beforeEach(() => {
    scorer = new PromptQualityScorer();
  });

  const createMessage = (content: string, role: 'user' | 'assistant' = 'user'): ProcessedMessage => ({
    id: '1',
    role,
    content,
    timestamp: new Date(),
    tokens: { input: 0, output: 0 },
    toolsUsed: []
  });

  describe('scorePrompt', () => {
    it('should score a high-quality prompt', () => {
      const message = createMessage(`
        I need to implement a user authentication system in Next.js.
        Requirements:
        - JWT-based authentication
        - Secure password hashing with bcrypt
        - Session management
        
        Please create the authentication middleware and user model.
        The middleware should check for valid JWT tokens in the Authorization header.
      `);

      const score = scorer.scorePrompt(message);
      expect(score).toBeGreaterThan(70);
    });

    it('should score a low-quality prompt', () => {
      const message = createMessage('fix it');
      const score = scorer.scorePrompt(message);
      expect(score).toBeLessThan(30);
    });

    it('should give high scores for specific code references', () => {
      const message = createMessage(
        'Update the `getUserData()` function in `/api/users.ts` to handle null values'
      );
      const score = scorer.scorePrompt(message);
      expect(score).toBeGreaterThan(60);
    });

    it('should give high scores for clear questions', () => {
      const message = createMessage(
        'How can I optimize the React rendering performance for a list of 1000+ items?'
      );
      const score = scorer.scorePrompt(message);
      expect(score).toBeGreaterThan(50);
    });

    it('should give high scores for prompts with constraints', () => {
      const message = createMessage(
        'Create a sorting algorithm that must run in O(n log n) time and should not use more than O(1) extra space'
      );
      const score = scorer.scorePrompt(message);
      expect(score).toBeGreaterThan(60);
    });

    it('should give high scores for structured prompts', () => {
      const message = createMessage(`
        Help me refactor this code:
        1. Extract the validation logic into a separate function
        2. Add error handling for edge cases
        3. Write unit tests for the new functions
      `);
      const score = scorer.scorePrompt(message);
      expect(score).toBeGreaterThan(70);
    });

    it('should return 0 for assistant messages', () => {
      const message = createMessage('Here is the solution', 'assistant');
      const score = scorer.scorePrompt(message);
      expect(score).toBe(0);
    });
  });

  describe('prompt characteristics analysis', () => {
    it('should detect code references', () => {
      const prompts = [
        'Update `config.json` file',
        'Fix the getUserData() function',
        'Modify user.name property',
        'Edit /src/components/Header.tsx'
      ];

      prompts.forEach(prompt => {
        const score = scorer.scorePrompt(createMessage(prompt));
        expect(score).toBeGreaterThan(40);
      });
    });

    it('should detect technical terms', () => {
      const prompts = [
        'Implement API endpoint',
        'Debug the async function',
        'Create React component',
        'Configure TypeScript settings'
      ];

      prompts.forEach(prompt => {
        const score = scorer.scorePrompt(createMessage(prompt));
        expect(score).toBeGreaterThan(40);
      });
    });

    it('should detect questions', () => {
      const prompts = [
        'How do I implement authentication?',
        'What is the best way to handle errors?',
        'Can you explain this code?',
        'Why is this not working?'
      ];

      prompts.forEach(prompt => {
        const score = scorer.scorePrompt(createMessage(prompt));
        expect(score).toBeGreaterThan(40);
      });
    });

    it('should detect directives', () => {
      const prompts = [
        'Please create a new component',
        'Implement the following features',
        'Help me fix this bug',
        'I need to add validation'
      ];

      prompts.forEach(prompt => {
        const score = scorer.scorePrompt(createMessage(prompt));
        expect(score).toBeGreaterThan(40);
      });
    });
  });

  describe('calculateAverageQuality', () => {
    it('should calculate average quality for multiple messages', () => {
      const messages = [
        createMessage('Fix the bug'), // Low quality
        createMessage('Update the `auth.ts` file to handle JWT token expiration and refresh tokens'), // High quality
        createMessage('How can I improve the performance of the database queries?'), // Medium quality
      ];

      const average = scorer.calculateAverageQuality(messages);
      expect(average).toBeGreaterThan(30);
      expect(average).toBeLessThan(70);
    });

    it('should only consider user messages', () => {
      const messages = [
        createMessage('Good prompt with details', 'user'),
        createMessage('Assistant response', 'assistant'),
        createMessage('Another good user prompt', 'user')
      ];

      const average = scorer.calculateAverageQuality(messages);
      expect(average).toBeGreaterThan(40);
    });

    it('should return 0 for no user messages', () => {
      const messages = [
        createMessage('Assistant response', 'assistant')
      ];

      const average = scorer.calculateAverageQuality(messages);
      expect(average).toBe(0);
    });
  });
});