'use client';

import { useState, useCallback, useRef } from 'react';

interface ClaudeJobResult {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  parsedOutput?: any;
  error?: string;
  executionTime?: number;
  logFile?: string;
}

interface UseClaudeJobOptions {
  pollingInterval?: number; // milliseconds
  maxPollingDuration?: number; // milliseconds
  onStatusUpdate?: (status: string) => void;
  allowedTools?: string;
  outputFormat?: 'json' | 'text';
  maxTurns?: number;
}

export function useClaudeJob() {
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<ClaudeJobResult | null>(null);
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const addStatus = useCallback((status: string) => {
    const timestampedStatus = `${new Date().toLocaleTimeString()}: ${status}`;
    setStatusHistory(prev => [...prev, timestampedStatus]);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (
    jobId: string,
    options: UseClaudeJobOptions = {}
  ): Promise<ClaudeJobResult> => {
    const { 
      pollingInterval = 2000,
      maxPollingDuration = 5 * 60 * 1000, // 5 minutes
      onStatusUpdate 
    } = options;

    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/claude/job/status/${jobId}`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to get job status');
          }
          
          setCurrentJob(data);
          
          // Update status
          if (data.status === 'running') {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const status = `Claude still processing... (${elapsed}s elapsed)`;
            addStatus(status);
            onStatusUpdate?.(status);
          }
          
          // Check if job is complete
          if (data.status === 'completed' || data.status === 'failed') {
            stopPolling();
            
            if (data.status === 'completed') {
              addStatus(`✅ Job completed in ${(data.executionTime / 1000).toFixed(1)}s`);
              resolve(data);
            } else {
              addStatus(`❌ Job failed: ${data.error || 'Unknown error'}`);
              reject(new Error(data.error || 'Job failed'));
            }
          }
          
          // Check for timeout
          if (Date.now() - startTime > maxPollingDuration) {
            stopPolling();
            addStatus('⏱️ Polling timeout reached');
            reject(new Error('Polling timeout'));
          }
        } catch (error) {
          stopPolling();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          addStatus(`❌ Polling error: ${errorMsg}`);
          reject(error);
        }
      };
      
      // Start polling
      pollingRef.current = setInterval(checkStatus, pollingInterval);
      // Also check immediately
      checkStatus();
    });
  }, [addStatus, stopPolling]);

  const executeClaude = useCallback(async (
    prompt: string,
    options: UseClaudeJobOptions = {}
  ): Promise<ClaudeJobResult> => {
    setLoading(true);
    setStatusHistory([]);
    setCurrentJob(null);
    
    try {
      addStatus('🚀 Starting Claude job...');
      
      // Start the job
      const response = await fetch('/api/claude/job/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options: {
            allowedTools: options.allowedTools,
            outputFormat: options.outputFormat,
            maxTurns: options.maxTurns,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start job');
      }
      
      const { jobId } = await response.json();
      addStatus(`📋 Job created: ${jobId}`);
      
      // Start polling for results
      const result = await pollJobStatus(jobId, options);
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addStatus(`❌ Error: ${errorMsg}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addStatus, pollJobStatus]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  return {
    executeClaude,
    loading,
    currentJob,
    statusHistory,
    cleanup,
  };
}