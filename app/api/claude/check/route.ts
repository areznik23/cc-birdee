import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Check if any Claude processes are running
    const { stdout } = await execAsync('ps aux | grep "claude --dangerously-skip-permissions" | grep -v grep');
    
    const processes = stdout.trim().split('\n').filter(line => line.length > 0);
    
    return NextResponse.json({
      running: processes.length > 0,
      count: processes.length,
      processes: processes.map(line => {
        const parts = line.split(/\s+/);
        return {
          pid: parts[1],
          cpu: parts[2],
          mem: parts[3],
          time: parts[9],
          command: parts.slice(10).join(' ').substring(0, 100) + '...'
        };
      })
    });
  } catch (error) {
    // grep returns exit code 1 when no matches found
    return NextResponse.json({
      running: false,
      count: 0,
      processes: []
    });
  }
}