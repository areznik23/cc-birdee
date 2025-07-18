import { useState, useEffect, useCallback } from 'react';
import { FileInfo, Session } from '../types';

interface ParseResult {
  totalEntries: number;
  sessionCount: number;
  sessions: Session[];
}

export function useSessions() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions');
      }
      
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    files,
    loading,
    error,
    refetch: fetchSessions
  };
}

export function useParseSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseSession = useCallback(async (filePath: string): Promise<ParseResult | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sessions/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse session');
      }
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    parseSession,
    loading,
    error
  };
}