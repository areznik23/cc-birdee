import { JSONLParser } from '../jsonl-parser';
import { LogEntry } from '../../types';

describe('JSONLParser', () => {
  let parser: JSONLParser;

  beforeEach(() => {
    parser = new JSONLParser();
  });

  describe('parse', () => {
    it('should parse valid JSONL content', () => {
      const content = `
{"type":"user","uuid":"123","timestamp":"2024-01-01T00:00:00Z","sessionId":"session1","message":{"role":"user","content":"Hello"}}
{"type":"assistant","uuid":"124","parentUuid":"123","timestamp":"2024-01-01T00:00:01Z","sessionId":"session1","message":{"role":"assistant","content":"Hi there!","usage":{"input_tokens":10,"output_tokens":20}}}
      `.trim();

      const entries = parser.parse(content);
      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('user');
      expect(entries[1].type).toBe('assistant');
    });

    it('should handle empty content', () => {
      expect(parser.parse('')).toEqual([]);
      expect(parser.parse('   \n\n   ')).toEqual([]);
    });

    it('should throw on invalid JSON in strict mode', () => {
      const content = 'invalid json';
      expect(() => parser.parse(content)).toThrow('Invalid JSON');
    });

    it('should skip invalid lines in non-strict mode', () => {
      parser = new JSONLParser({ strict: false });
      const content = `
{"type":"user","uuid":"123","timestamp":"2024-01-01T00:00:00Z","sessionId":"session1","message":{"role":"user","content":"Valid"}}
invalid json line
{"type":"assistant","uuid":"124","timestamp":"2024-01-01T00:00:01Z","sessionId":"session1","message":{"role":"assistant","content":"Also valid"}}
      `.trim();

      const entries = parser.parse(content);
      expect(entries).toHaveLength(2);
    });
  });

  describe('parseAndGroupBySessions', () => {
    it('should group entries by session ID', () => {
      const content = `
{"type":"user","uuid":"1","timestamp":"2024-01-01T00:00:00Z","sessionId":"session1","message":{"role":"user","content":"Q1"}}
{"type":"user","uuid":"2","timestamp":"2024-01-01T00:01:00Z","sessionId":"session2","message":{"role":"user","content":"Q2"}}
{"type":"assistant","uuid":"3","timestamp":"2024-01-01T00:00:30Z","sessionId":"session1","message":{"role":"assistant","content":"A1"}}
      `.trim();

      const sessions = parser.parseAndGroupBySessions(content);
      expect(sessions.size).toBe(2);
      expect(sessions.get('session1')).toHaveLength(2);
      expect(sessions.get('session2')).toHaveLength(1);
    });

    it('should sort entries within sessions by timestamp', () => {
      const content = `
{"type":"assistant","uuid":"2","timestamp":"2024-01-01T00:00:30Z","sessionId":"session1","message":{"role":"assistant","content":"Second"}}
{"type":"user","uuid":"1","timestamp":"2024-01-01T00:00:00Z","sessionId":"session1","message":{"role":"user","content":"First"}}
      `.trim();

      const sessions = parser.parseAndGroupBySessions(content);
      const session1 = sessions.get('session1')!;
      expect(session1[0].message.content).toBe('First');
      expect(session1[1].message.content).toBe('Second');
    });
  });
});