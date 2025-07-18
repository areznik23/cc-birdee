import { useState, useCallback } from 'react';
import { UserAnalyticsSummary, UserProfile } from '../types/user-analytics';

export function useAnalytics(userId: string = 'default-user') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics/profile?userId=${userId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch profile');
      }
      
      return await response.json() as UserProfile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics/summary?userId=${userId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch summary');
      }
      
      return await response.json() as UserAnalyticsSummary;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch summary';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const processSession = useCallback(async (
    sessionPath: string,
    analysisDepth: 'quick' | 'standard' | 'deep' = 'standard'
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionPath, userId, analysisDepth })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process session');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process session';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const processBatch = useCallback(async (
    sessionPaths: string[],
    analysisDepth: 'quick' | 'standard' | 'deep' = 'standard',
    parallel: boolean = true
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionPaths, userId, analysisDepth, parallel })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process batch');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process batch';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const cleanupOldSessions = useCallback(async (daysToKeep: number = 90) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics/sessions?daysToKeep=${daysToKeep}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cleanup sessions');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cleanup sessions';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchProfile,
    fetchSummary,
    processSession,
    processBatch,
    cleanupOldSessions
  };
}