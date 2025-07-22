// Shared job store for Claude jobs
// This needs to be a singleton that persists across requests

interface ClaudeJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  prompt: string;
  output: string;
  error?: string;
  startTime: Date;
  endTime?: Date;
  processInfo?: {
    pid?: number;
    exitCode?: number;
  };
  logFile?: string; // Path to the Claude log file
}

// Use global to persist across hot reloads in development
const globalForJobs = global as unknown as {
  claudeJobs: Map<string, ClaudeJob>;
};

// Create a singleton Map that persists
export const jobs = globalForJobs.claudeJobs ?? new Map<string, ClaudeJob>();

if (!globalForJobs.claudeJobs) {
  globalForJobs.claudeJobs = jobs;
}

// Job cleanup logic
if (typeof global !== 'undefined' && !(global as any).claudeJobCleanupInterval) {
  (global as any).claudeJobCleanupInterval = setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [jobId, job] of jobs.entries()) {
      if (job.endTime && (now - job.endTime.getTime()) > maxAge) {
        jobs.delete(jobId);
        console.log(`[Claude Job] Cleaned up old job: ${jobId}`);
      }
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}