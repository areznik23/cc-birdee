'use client';

import { useState } from 'react';
import { Session } from '@/lib/types';
import { FileSelector } from './FileSelector';
import { SessionDisplay } from './SessionDisplay';
import { useParseSession } from '@/lib/hooks/use-sessions';

export function Dashboard() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMobileSelector, setShowMobileSelector] = useState(false);
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
          CC-Birdee
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Fly between branches with Claude Code
        </p>
      </header>

      {/* Mobile Session Selector Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileSelector(!showMobileSelector)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedSession ? 'Change Session' : 'Select Session'}
              </p>
              {selectedSession && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Current: {selectedSession.id.replace(/-/g, ' ')}
                </p>
              )}
            </div>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${showMobileSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Fixed Sidebar - Desktop only */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <FileSelector onFileSelect={handleFileSelect} />
        </div>

        {/* Mobile Session Selector - Slides down */}
        {showMobileSelector && (
          <div className="lg:hidden mb-6">
            <FileSelector onFileSelect={(filePath) => {
              handleFileSelect(filePath);
              setShowMobileSelector(false);
            }} />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {loading || parseLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#D4A574' }}></div>
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