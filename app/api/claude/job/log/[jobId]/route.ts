import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/claude-job-store';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    const job = jobs.get(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (!job.logFile) {
      return NextResponse.json(
        { error: 'Log file not available yet' },
        { status: 404 }
      );
    }
    
    try {
      // Read the log file
      const logContent = await fs.readFile(job.logFile, 'utf8');
      const lines = logContent.trim().split('\n');
      
      // Parse JSONL format
      const entries = lines.map((line, index) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { error: 'Failed to parse line', line, index };
        }
      });
      
      return NextResponse.json({
        jobId,
        logFile: job.logFile,
        entries,
        totalLines: lines.length,
      });
      
    } catch (error) {
      console.error('Error reading log file:', error);
      return NextResponse.json(
        { error: 'Failed to read log file' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Log retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve log' },
      { status: 500 }
    );
  }
}