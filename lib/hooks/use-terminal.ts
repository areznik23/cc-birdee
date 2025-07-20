import { useState } from 'react';

interface TerminalResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export function useTerminal() {
  const [loading, setLoading] = useState(false);

  const execute = async (command: string, cwd?: string): Promise<TerminalResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setLoading(false);
    }
  };

  const gatherContext = async () => {
    const context: Record<string, string> = {};
    
    console.log('[Terminal Hook] Starting context gathering...');
    
    // Gather git context
    const gitBranch = await execute('git-branch');
    if (gitBranch.success) {
      context.gitBranch = gitBranch.stdout;
      console.log('[Terminal Hook] Git branch:', gitBranch.stdout);
    }
    
    const gitStatus = await execute('git-status');
    if (gitStatus.success) {
      context.gitStatus = gitStatus.stdout;
      console.log('[Terminal Hook] Git status:', gitStatus.stdout || 'clean');
    }
    
    // Gather project context
    const pwd = await execute('pwd');
    if (pwd.success) {
      context.currentDirectory = pwd.stdout;
      console.log('[Terminal Hook] Current directory:', pwd.stdout);
    }
    
    const files = await execute('ls');
    if (files.success) {
      context.files = files.stdout;
      console.log('[Terminal Hook] Files found:', files.stdout.split('\n').length);
    }
    
    console.log('[Terminal Hook] Context gathering complete');
    return context;
  };

  return { execute, gatherContext, loading };
}