import { useState } from 'react';

interface ClaudeResult {
  success: boolean;
  response?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  executionTime?: number;
}

export function useClaude() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ClaudeResult | null>(null);
  const [streamStatus, setStreamStatus] = useState<string[]>([]);

  const askClaudeStream = async (
    prompt: string, 
    projectPath?: string,
    onStatus?: (message: string) => void
  ): Promise<ClaudeResult> => {
    setLoading(true);
    setStreamStatus([]);
    
    try {
      const response = await fetch('/api/claude/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectPath }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let stdout = '';
      let stderr = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                setStreamStatus(prev => [...prev, data.message]);
                if (onStatus) onStatus(data.message);
              } else if (data.type === 'stdout') {
                stdout += data.data;
              } else if (data.type === 'stderr') {
                stderr += data.data;
              } else if (data.type === 'complete') {
                const result = {
                  success: data.success,
                  response: data.stdout || stdout,
                  stdout: data.stdout || stdout,
                  stderr: data.stderr || stderr,
                };
                setLastResult(result);
                return result;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Failed to parse stream data:', e);
            }
          }
        }
      }

      return {
        success: false,
        error: 'Stream ended without completion',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setLoading(false);
    }
  };

  const askClaude = async (prompt: string, projectPath?: string): Promise<ClaudeResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/claude/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectPath }),
      });

      const data = await response.json();
      
      const result = data.success ? {
        success: true,
        response: data.response,
        stdout: data.stdout,
        stderr: data.stderr,
        executionTime: data.executionTime,
      } : {
        success: false,
        error: data.error || 'Claude execution failed',
        stdout: data.stdout,
        stderr: data.stderr,
      };
      
      setLastResult(result);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setLoading(false);
    }
  };

  const gatherContextFromClaude = async (task: string, onStatus?: (message: string) => void): Promise<string> => {
    // Create a more detailed prompt that Claude will actually process
    const contextPrompt = `I'm working on a Next.js application and need help with the following task: "${task}"

Before I can help you effectively, I need to understand the current codebase. Please analyze what context would be needed:

1. What specific files or components would need to be examined?
2. What existing implementation details are relevant?
3. What design patterns or architecture decisions should be considered?
4. Are there any dependencies or integrations to be aware of?

Please provide a comprehensive list of all the context that should be gathered before implementing this task.`;
    
    console.log('[Claude Hook] Gathering context for task:', task);
    console.log('[Claude Hook] Sending prompt to Claude:', contextPrompt);
    
    // Use the current project directory - hardcode for now
    const projectPath = '/Users/alexanderreznik/Desktop/cc-birdee';
    
    // Use streaming version for better visibility
    const result = await askClaudeStream(contextPrompt, projectPath, onStatus);
    
    if (result.success && result.response) {
      console.log('[Claude Hook] Claude response received, length:', result.response.length);
      return result.response;
    }
    
    console.error('[Claude Hook] Failed to get context from Claude:', result.error);
    return '';
  };

  return { askClaude, askClaudeStream, gatherContextFromClaude, loading, lastResult, streamStatus };
}