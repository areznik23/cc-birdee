import { NextResponse } from "next/server";
import { homedir } from "os";
import { join } from "path";
import { readdir, stat } from "fs/promises";

export async function GET() {
  try {
    const projectPath = join(homedir(), '.claude', 'projects', '-Users-alexanderreznik-Desktop-cc-birdee');
    
    const files = await readdir(projectPath);
    
    // Filter and parse log files
    const logFiles = await Promise.all(
      files
        .filter(f => f.endsWith('.jsonl'))
        .map(async (filename) => {
          const filePath = join(projectPath, filename);
          const stats = await stat(filePath);
          
          // Extract timestamp from filename
          const match = filename.match(/claude-code-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.jsonl/);
          const timestamp = match ? new Date(match[1]) : stats.birthtime;
          
          return {
            filename,
            path: filePath,
            timestamp: timestamp.toISOString(),
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString()
          };
        })
    );
    
    // Sort by timestamp (newest first)
    logFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return NextResponse.json({ 
      logs: logFiles,
      projectPath,
      count: logFiles.length
    });
  } catch (error) {
    console.error('Error reading logs:', error);
    return NextResponse.json({ 
      error: 'Failed to read logs',
      logs: [] 
    }, { status: 500 });
  }
}