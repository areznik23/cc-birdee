'use client';

import React, { useState, useEffect } from 'react';
import SimpleAnalyticsView from './SimpleAnalyticsView';
import { PromptInsights } from './PromptInsights';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalyticsPanelProps {
  userId?: string;
}

interface SimpleAnalytics {
  strengths: Array<{ title: string; description: string; icon?: string }>;
  weaknesses: Array<{ title: string; description: string; icon?: string }>;
  tips: Array<{ title: string; description: string; icon?: string }>;
}

export function AnalyticsPanel({ userId = 'default-user' }: AnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<SimpleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useCached, setUseCached] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    console.log('AnalyticsPanel: Loading analytics for user:', userId);
    // Try to load cached data first
    const cached = loadFromLocalStorage();
    if (cached && useCached) {
      setAnalytics(cached.data);
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
    } else {
      fetchAnalytics();
    }
  }, [userId, useCached]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/analytics/simple?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
      // Save to local storage
      saveToLocalStorage(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = (): { data: SimpleAnalytics; timestamp: string } | null => {
    try {
      const stored = localStorage.getItem(`analytics_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  };

  const saveToLocalStorage = (data: SimpleAnalytics) => {
    try {
      localStorage.setItem(`analytics_${userId}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Generating analytics report...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Analytics</h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Check if we have analytics data or need to prompt for processing
  const hasAnalytics = analytics && (
    analytics.strengths[0]?.title !== 'Getting Started' ||
    analytics.strengths.length > 1
  );

  if (!hasAnalytics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="max-w-md text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#D4A574' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Welcome to Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Get insights into your coding patterns, strengths, and growth opportunities by analyzing your Claude Code sessions.
            </p>
            <ProcessSessionsButton userId={userId} onProcessComplete={fetchAnalytics} />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Your session data will be processed locally to generate personalized insights
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Coding Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Personalized insights from your Claude Code sessions
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setUseCached(false);
                  fetchAnalytics();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Refresh
              </button>
              <ProcessSessionsButton userId={userId} onProcessComplete={fetchAnalytics} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCached}
                  onChange={(e) => setUseCached(e.target.checked)}
                  className="mr-2 rounded border-gray-300"
                />
                <span className="text-gray-600 dark:text-gray-400">Use cached data</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Display */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Personal Analytics</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="mt-6">
          <SimpleAnalyticsView
            strengths={analytics?.strengths || []}
            weaknesses={analytics?.weaknesses || []}
            tips={analytics?.tips || []}
            isLoading={loading}
          />
        </TabsContent>
        
        <TabsContent value="prompts" className="mt-6">
          <PromptInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Process Sessions Button Component
function ProcessSessionsButton({ userId, onProcessComplete }: { userId: string; onProcessComplete: () => void }) {
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);

  const fetchAvailableFiles = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setAvailableFiles(data.files || []);
      setShowModal(true);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const processSessions = async () => {
    if (selectedFiles.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionPaths: selectedFiles,
          userId,
          analysisDepth: 'standard'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Processing complete:', result.summary);
        setShowModal(false);
        setSelectedFiles([]);
        // Small delay to show completion before refreshing
        setTimeout(() => {
          onProcessComplete();
        }, 500);
      } else {
        const error = await response.json();
        console.error('Processing failed:', error);
        alert(`Failed to process sessions: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to process sessions:', error);
      alert('Failed to process sessions. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={fetchAvailableFiles}
        className="px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2"
        style={{ backgroundColor: '#D4A574' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C49464'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D4A574'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Process Sessions
      </button>

      {/* Modal for file selection */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Select Sessions to Process</h3>
            
            <div className="flex-1 overflow-y-auto mb-4">
              {availableFiles.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No session files found</p>
              ) : (
                <div className="space-y-2">
                  {availableFiles.map((file) => (
                    <label key={file.path} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.path)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles([...selectedFiles, file.path]);
                          } else {
                            setSelectedFiles(selectedFiles.filter(f => f !== file.path));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB • {new Date(file.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => setSelectedFiles(availableFiles.map(f => f.path))}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={processSessions}
                  disabled={processing || selectedFiles.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : `Process ${selectedFiles.length} Sessions`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}