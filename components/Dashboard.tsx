'use client';

import { useState } from 'react';
import { Session } from '@/lib/types';
import { FileSelector } from './FileSelector';
import { SessionDisplay } from './SessionDisplay';
import { useParseSession } from '@/lib/hooks/use-sessions';

export function Dashboard() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const { parseSession, loading: parseLoading, error: parseError } = useParseSession();

  const handleFileSelect = async (filePath: string) => {
    setLoading(true);
    setSelectedSession(null);
    
    try {
      const result = await parseSession(filePath);
      if (result && result.sessions.length > 0) {
        // For now, just select the first session
        // In the future, we could show a session selector if multiple sessions exist
        setSelectedSession(result.sessions[0]);
      }
    } catch (err) {
      console.error('Failed to parse session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Claude Code Analyzer
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Transform your Claude Code session logs into actionable insights
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <FileSelector onFileSelect={handleFileSelect} />
        </div>

        <div className="lg:col-span-8">
          {loading || parseLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  Analyzing session...
                </span>
              </div>
            </div>
          ) : parseError ? (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-md p-8">
              <p className="text-red-600 dark:text-red-400">
                Error: {parseError}
              </p>
            </div>
          ) : selectedSession ? (
            <SessionDisplay session={selectedSession} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Select a session file to begin analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}