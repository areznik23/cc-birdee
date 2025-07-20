import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Get Claude logs directory
function getClaudeLogsDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'projects');
}

// Convert path to Claude's project directory format
function getProjectDir(projectPath: string): string {
  const projectName = '-' + projectPath.replace(/^\//, '').replace(/\//g, '-');
  return path.join(getClaudeLogsDir(), projectName);
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const { prompt, projectPath } = await request.json();

    if (!prompt) {
      return new Response('Prompt is required', { status: 400 });
    }

    const projectDir = getProjectDir(projectPath || process.cwd());
    
    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        send({ type: 'status', message: 'Starting Claude execution...' });
        
        // Check existing log files
        let existingLogCount = 0;
        try {
          await fs.access(projectDir);
          const filesBeforeExec = await fs.readdir(projectDir);
          existingLogCount = filesBeforeExec.filter(f => f.endsWith('.jsonl') && !f.includes('analysis')).length;
          send({ type: 'status', message: `Found ${existingLogCount} existing log files` });
        } catch {
          send({ type: 'status', message: 'Project directory will be created by Claude' });
        }

        const startTime = Date.now();
        const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        
        // Spawn Claude process
        const claudeProcess = spawn('claude', ['--dangerously-skip-permissions', escapedPrompt], {
          cwd: projectPath || process.cwd(),
          shell: true,
        });

        let stdout = '';
        let stderr = '';
        let processExited = false;

        // Monitor stdout
        claudeProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          stdout += chunk;
          send({ type: 'stdout', data: chunk });
        });

        // Monitor stderr
        claudeProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          stderr += chunk;
          send({ type: 'stderr', data: chunk });
        });

        // Monitor process exit
        claudeProcess.on('exit', (code) => {
          processExited = true;
          const executionTime = Date.now() - startTime;
          send({ 
            type: 'status', 
            message: `Claude process exited with code ${code} after ${(executionTime/1000).toFixed(1)}s` 
          });
        });

        // Monitor process errors
        claudeProcess.on('error', (error) => {
          send({ type: 'error', message: error.message });
          controller.close();
        });

        // Check for log file updates periodically
        const checkLogFile = async () => {
          if (processExited) {
            // Final check for log file
            try {
              const filesAfter = await fs.readdir(projectDir);
              const currentLogCount = filesAfter.filter(f => f.endsWith('.jsonl') && !f.includes('analysis')).length;
              
              if (currentLogCount > existingLogCount) {
                send({ type: 'status', message: 'New log file created!' });
                // TODO: Read and parse the log file
              }
            } catch (e) {
              send({ type: 'status', message: 'Could not check for log files' });
            }
            
            send({ 
              type: 'complete', 
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              success: true
            });
            controller.close();
            return;
          }

          // Check if process is still running
          try {
            process.kill(claudeProcess.pid!, 0); // Check if process exists
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            send({ type: 'status', message: `Claude still processing... (${elapsed}s elapsed)` });
          } catch {
            send({ type: 'status', message: 'Claude process no longer running' });
          }

          // Check for new log files
          try {
            const filesAfter = await fs.readdir(projectDir);
            const currentLogCount = filesAfter.filter(f => f.endsWith('.jsonl') && !f.includes('analysis')).length;
            
            if (currentLogCount > existingLogCount) {
              send({ type: 'status', message: `Log file count increased: ${currentLogCount} (was ${existingLogCount})` });
            }
          } catch {
            // Directory might not exist yet
          }

          // Continue checking
          setTimeout(checkLogFile, 5000);
        };

        // Start checking after 5 seconds
        setTimeout(checkLogFile, 5000);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Claude stream error:', error);
    return new Response('Failed to execute Claude command', { status: 500 });
  }
}