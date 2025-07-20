import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Get Claude logs directory
function getClaudeLogsDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'projects');
}

// Find the most recent log file for a project
async function findLatestLogFile(projectPath: string): Promise<string | null> {
  try {
    // Convert path to Claude's project directory format
    // Claude uses format: -Users-username-Desktop-projectname
    const projectName = '-' + projectPath.replace(/^\//, '').replace(/\//g, '-');
    const projectDir = path.join(getClaudeLogsDir(), projectName);
    console.log('[Claude API] Looking for logs in:', projectDir);
    
    // Check if directory exists
    try {
      await fs.access(projectDir);
    } catch {
      console.log('[Claude API] Project directory does not exist:', projectDir);
      return null;
    }
    
    const files = await fs.readdir(projectDir);
    
    // Filter for .jsonl files (excluding analysis files)
    const logFiles = files.filter(f => f.endsWith('.jsonl') && !f.includes('analysis') && !f.includes('report'));
    console.log(`[Claude API] Found ${logFiles.length} log files in directory`);
    if (logFiles.length === 0) return null;
    
    // Get stats for all files
    const fileStats = await Promise.all(
      logFiles.map(async (file) => ({
        file,
        mtime: (await fs.stat(path.join(projectDir, file))).mtime
      }))
    );
    
    // Sort by modification time (newest first)
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    return path.join(projectDir, fileStats[0].file);
  } catch (error) {
    console.error('Error finding log file:', error);
    return null;
  }
}

// Parse the last message from Claude in the log file
async function parseClaudeResponse(logPath: string): Promise<string> {
  try {
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Parse from the end to find the last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.role === 'assistant' && entry.content) {
          // Extract text content from the message
          if (typeof entry.content === 'string') {
            return entry.content;
          } else if (Array.isArray(entry.content)) {
            // Handle structured content
            return entry.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('\n');
          }
        }
      } catch (e) {
        // Skip malformed lines
        continue;
      }
    }
    
    return 'No response found from Claude';
  } catch (error) {
    console.error('Error parsing log file:', error);
    return 'Failed to parse Claude response';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, projectPath } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log('[Claude API] Starting execution');
    console.log('[Claude API] Prompt:', prompt);
    console.log('[Claude API] Project path:', projectPath || 'current directory');

    // Build the claude command - properly escape the prompt
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    const command = `claude --dangerously-skip-permissions "${escapedPrompt}"`;
    console.log('[Claude API] Command:', command);
    
    // Execute claude command
    const execOptions = {
      cwd: projectPath || process.cwd(),
      timeout: 300000, // 5 minute timeout for Claude to handle complex prompts
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    };

    try {
      // First check existing log files
      const projectName = '-' + (projectPath || process.cwd()).replace(/^\//, '').replace(/\//g, '-');
      const projectDir = path.join(getClaudeLogsDir(), projectName);
      console.log('[Claude API] Project directory:', projectDir);
      
      let existingLogCount = 0;
      try {
        await fs.access(projectDir);
        const filesBeforeExec = await fs.readdir(projectDir);
        existingLogCount = filesBeforeExec.filter(f => f.endsWith('.jsonl') && !f.includes('analysis')).length;
        console.log(`[Claude API] Existing log files before execution: ${existingLogCount}`);
      } catch (e) {
        console.log('[Claude API] Project directory does not exist yet, Claude will create it');
      }
      
      // Record timestamp before execution
      const startTime = Date.now();
      console.log('[Claude API] Executing Claude command...');
      console.log('[Claude API] Working directory for execution:', execOptions.cwd);
      
      const { stdout, stderr } = await execAsync(command, execOptions);
      const executionTime = Date.now() - startTime;
      console.log(`[Claude API] Command executed in ${executionTime}ms`);
      console.log('[Claude API] stdout:', stdout?.slice(0, 200) + (stdout?.length > 200 ? '...' : ''));
      console.log('[Claude API] stderr:', stderr || 'none');
      
      // Check if Claude responded directly via stdout
      if (stdout && stdout.trim() && !stdout.includes('prompt evaluator')) {
        console.log('[Claude API] Claude responded directly via stdout');
        return NextResponse.json({
          success: true,
          response: stdout.trim(),
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          executionTime,
        });
      }
      
      // Otherwise wait for log file to be written
      console.log('[Claude API] Waiting for Claude to process and write log file...');
      console.log('[Claude API] This may take 1-3 minutes for complex prompts...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds initially
      
      // Retry logic for finding and reading log file
      let claudeResponse = stdout || 'Claude command completed but no direct output captured';
      let retries = 12; // Try for up to 2 minutes (12 * 10 seconds)
      let foundNewLog = false;
      let logFile: string | null = null;
      
      while (retries > 0 && !foundNewLog) {
        const attemptNumber = 13 - retries;
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        console.log(`[Claude API] Looking for log file (attempt ${attemptNumber}/12, ${elapsedSeconds.toFixed(1)}s elapsed)...`);
        
        // Check current log file count
        try {
          const filesAfterWait = await fs.readdir(projectDir);
          const currentLogCount = filesAfterWait.filter(f => f.endsWith('.jsonl') && !f.includes('analysis')).length;
          console.log(`[Claude API] Current log files: ${currentLogCount} (was ${existingLogCount})`);
          
          if (currentLogCount > existingLogCount) {
            console.log('[Claude API] New log file detected!');
          }
        } catch (e) {
          console.log('[Claude API] Could not read project directory');
        }
        
        logFile = await findLatestLogFile(projectPath || process.cwd());
        
        if (logFile) {
          console.log('[Claude API] Found log file:', logFile);
          // Check if log file was modified after we started
          const logStats = await fs.stat(logFile);
          const fileAge = Date.now() - logStats.mtime.getTime();
          console.log(`[Claude API] Log file age: ${fileAge}ms (command started ${Date.now() - startTime}ms ago)`);
          
          if (logStats.mtime.getTime() > startTime) {
            console.log('[Claude API] Log file is new, parsing response...');
            claudeResponse = await parseClaudeResponse(logFile);
            console.log('[Claude API] Parsed response length:', claudeResponse.length);
            foundNewLog = true;
            break;
          } else {
            console.log('[Claude API] Log file not updated yet, waiting...');
          }
        } else {
          console.log('[Claude API] No log file found yet');
        }
        
        retries--;
        if (retries > 0) {
          console.log('[Claude API] Waiting 10 seconds before next check...');
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between retries
        }
      }
      
      if (!foundNewLog) {
        console.log(`[Claude API] Could not find updated log file after ${(Date.now() - startTime) / 1000}s`);
        console.log('[Claude API] Claude may still be processing or the prompt was rejected');
      }
      
      console.log('[Claude API] Execution completed successfully');
      return NextResponse.json({
        success: true,
        response: claudeResponse,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        logFile: logFile,
        executionTime,
      });
      
    } catch (execError: any) {
      console.error('[Claude API] Execution error:', execError.message);
      console.error('[Claude API] Error stdout:', execError.stdout?.slice(0, 200));
      console.error('[Claude API] Error stderr:', execError.stderr?.slice(0, 200));
      
      return NextResponse.json({
        success: false,
        error: execError.message,
        stdout: execError.stdout?.trim() || '',
        stderr: execError.stderr?.trim() || '',
      });
    }

  } catch (error) {
    console.error('[Claude API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to execute Claude command' },
      { status: 500 }
    );
  }
}