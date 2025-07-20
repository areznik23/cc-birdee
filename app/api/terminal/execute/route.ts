import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Whitelist of allowed commands for security
const ALLOWED_COMMANDS: Record<string, string> = {
  // Git commands
  'git-status': 'git status --porcelain',
  'git-branch': 'git branch --show-current',
  'git-branches': 'git branch -a',
  'git-log': 'git log --oneline -10',
  'git-diff': 'git diff --name-only',
  'git-diff-staged': 'git diff --staged --name-only',
  'git-remote': 'git remote -v',
  
  // File system commands
  'pwd': 'pwd',
  'ls': 'ls -la',
  'tree': 'tree -L 2 -I "node_modules|.git|dist|build|.next"',
  'find-ts': 'find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | head -20',
  'find-js': 'find . -name "*.js" -o -name "*.jsx" | grep -v node_modules | head -20',
  
  // Project info
  'package-info': 'cat package.json',
  'npm-scripts': 'npm run',
  'dependencies': 'npm list --depth=0',
  'env-vars': 'printenv | grep -E "^(NODE_|NEXT_|PUBLIC_)" | sed "s/=.*/=***/"',
  
  // Process info
  'port-check': 'lsof -i :3000,3001 | grep LISTEN',
  'node-version': 'node --version',
  'npm-version': 'npm --version',
  
  // Claude commands
  'claude-version': 'claude --version',
  'claude-help': 'claude --help',
};

export async function POST(request: NextRequest) {
  try {
    const { command, cwd } = await request.json();

    if (!command || !ALLOWED_COMMANDS[command]) {
      return NextResponse.json(
        { error: 'Invalid or unauthorized command' },
        { status: 400 }
      );
    }

    // Get the actual command to execute
    const actualCommand = ALLOWED_COMMANDS[command];
    
    // Execute in specified directory or current directory
    const execOptions = {
      cwd: cwd || process.cwd(),
      timeout: 5000, // 5 second timeout
      maxBuffer: 1024 * 1024, // 1MB buffer
    };

    try {
      const { stdout, stderr } = await execAsync(actualCommand, execOptions);
      
      return NextResponse.json({
        success: true,
        command: command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    } catch (execError: any) {
      // Command failed but that's ok - return the error info
      return NextResponse.json({
        success: false,
        command: command,
        stdout: execError.stdout?.trim() || '',
        stderr: execError.stderr?.trim() || execError.message,
        error: execError.message,
      });
    }

  } catch (error) {
    console.error('Terminal execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute command' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available commands
export async function GET() {
  const commands = Object.keys(ALLOWED_COMMANDS).map(key => ({
    id: key,
    description: ALLOWED_COMMANDS[key],
  }));
  
  return NextResponse.json({ commands });
}