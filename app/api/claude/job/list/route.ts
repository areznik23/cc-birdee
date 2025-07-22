import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/claude-job-store';

export async function GET(request: NextRequest) {
  try {
    // Convert Map to array of job summaries
    const jobList = Array.from(jobs.entries()).map(([jobId, job]) => ({
      jobId,
      status: job.status,
      prompt: job.prompt.substring(0, 100) + (job.prompt.length > 100 ? '...' : ''),
      startTime: job.startTime,
      endTime: job.endTime,
      hasError: !!job.error,
      outputLength: job.output.length,
    }));
    
    // Sort by start time (newest first)
    jobList.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    return NextResponse.json({
      jobs: jobList,
      total: jobList.length,
      running: jobList.filter(j => j.status === 'running').length,
      completed: jobList.filter(j => j.status === 'completed').length,
      failed: jobList.filter(j => j.status === 'failed').length,
    });
    
  } catch (error) {
    console.error('Job list error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve job list' },
      { status: 500 }
    );
  }
}