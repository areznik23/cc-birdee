'use client';

import { useState, useEffect } from 'react';

interface AnalyticsReportProps {
  userId?: string;
}

export function AnalyticsReport({ userId = 'default-user' }: AnalyticsReportProps) {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [userId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics/report?userId=${userId}&format=text`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('No analytics data found. Process some sessions first.');
          return;
        }
        throw new Error('Failed to fetch report');
      }
      
      const text = await response.text();
      setReport(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const processNewSessions = async () => {
    const processResponse = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionPaths: [], // Will be populated by file selector
        userId,
        analysisDepth: 'standard'
      })
    });
    
    if (processResponse.ok) {
      await fetchReport();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Generating report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-300">{error}</p>
          {error.includes('No analytics data') && (
            <button 
              onClick={processNewSessions}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Process Sessions
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <pre className="font-mono text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-6 rounded-lg overflow-x-auto">
        {report}
      </pre>
      
      <div className="mt-4 flex gap-4">
        <button 
          onClick={fetchReport}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Report
        </button>
        <button 
          onClick={() => navigator.clipboard.writeText(report)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}