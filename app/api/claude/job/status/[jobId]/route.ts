import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/claude-job-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    console.log(`[Claude Job Status] Looking for job ${jobId}, total jobs: ${jobs.size}`);
    const job = jobs.get(jobId);
    
    if (!job) {
      console.log(`[Claude Job Status] Job ${jobId} not found. Available jobs:`, Array.from(jobs.keys()));
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Calculate execution time
    let executionTime;
    if (job.startTime) {
      const endTime = job.endTime || new Date();
      executionTime = endTime.getTime() - job.startTime.getTime();
    }
    
    // Parse output if it's JSON format
    let parsedOutput;
    if (job.status === 'completed' && job.output) {
      try {
        // Try to parse as JSON if it looks like JSON
        if (job.output.trim().startsWith('{') || job.output.trim().startsWith('[')) {
          parsedOutput = JSON.parse(job.output);
        }
      } catch (e) {
        // Not JSON, use raw output
      }
    }
    
    // Return job status
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      prompt: job.prompt,
      output: job.output,
      parsedOutput,
      error: job.error,
      startTime: job.startTime,
      endTime: job.endTime,
      executionTime,
      processInfo: job.processInfo,
      logFile: job.logFile,
    });
    
  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}