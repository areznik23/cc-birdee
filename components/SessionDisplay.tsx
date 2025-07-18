'use client';

import { Session } from '@/lib/types';
import { formatDuration, formatTokenCount } from '@/lib/utils';
import { ActivityTimeline } from './ActivityTimeline';
import { SessionSummaryDiff } from './SessionSummaryDiff';

interface SessionDisplayProps {
  session: Session;
}

export function SessionDisplay({ session }: SessionDisplayProps) {
  const { metrics } = session;
  
  // Find the initial user prompt
  let initialPrompt = session.messages.find(msg => 
    msg.role === 'user' && 
    msg.activity === 'initial_question' &&
    !msg.content.includes('[Request interrupted by user]') &&
    !msg.content.includes('<system-reminder>')
  );
  
  // Fallback: if no initial_question found, get first user message without system-reminder
  if (!initialPrompt) {
    initialPrompt = session.messages.find(msg => 
      msg.role === 'user' && 
      !msg.content.includes('<system-reminder>') &&
      !msg.content.includes('[Request interrupted by user]')
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Session Analysis
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {session.summary}
        </p>
        
        {/* Session Score */}
        <div className="mt-4 flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold" style={{ color: '#D4A574' }}>
              {metrics.sessionScore}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Session Score
            </div>
          </div>
          
          {/* Score Breakdown */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(metrics.scoreBreakdown).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {key}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline 
        messages={session.messages}
        startTime={session.startTime}
        endTime={session.endTime}
      />

      {/* Session Summary */}
      <SessionSummaryDiff 
        messages={session.messages} 
        initialPrompt={initialPrompt} 
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Duration"
          value={formatDuration(session.duration)}
          icon="duration"
        />
        <MetricCard
          title="Tokens"
          value={formatTokenCount(metrics.totalTokens)}
          icon="tokens"
        />
        <MetricCard
          title="Quality"
          value={`${metrics.avgPromptQuality}/100`}
          icon="quality"
        />
        <MetricCard
          title="Messages"
          value={`${metrics.messageCount.user}`}
          icon="messages"
        />
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Activity Breakdown
        </h3>
        <div className="space-y-2">
          {Object.entries(metrics.activityBreakdown).map(([activity, count]) => (
            <div key={activity} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {activity.replace(/_/g, ' ')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: string;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  const iconMap: Record<string, JSX.Element> = {
    duration: (
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tokens: (
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    quality: (
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    messages: (
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        {icon && iconMap[icon]}
      </div>
    </div>
  );
}