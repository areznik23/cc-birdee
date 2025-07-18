'use client';

import { Session } from '@/lib/types';
import { formatDuration, formatTokenCount } from '@/lib/utils';
import { ActivityTimeline } from './ActivityTimeline';
import { ToolUsageChart } from './ToolUsageChart';
import { PromptQualityTrend } from './PromptQualityTrend';

interface SessionDisplayProps {
  session: Session;
}

export function SessionDisplay({ session }: SessionDisplayProps) {
  const { metrics } = session;

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
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Duration"
          value={formatDuration(session.duration)}
          icon="⏱️"
        />
        <MetricCard
          title="Tokens"
          value={formatTokenCount(metrics.totalTokens)}
          icon="🔤"
        />
        <MetricCard
          title="Quality"
          value={`${metrics.avgPromptQuality}/100`}
          icon="⭐"
        />
        <MetricCard
          title="Messages"
          value={`${metrics.messageCount.user + metrics.messageCount.assistant}`}
          icon="💬"
        />
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline 
        messages={session.messages}
        startTime={session.startTime}
        endTime={session.endTime}
      />

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

      {/* Tool Usage Chart */}
      <ToolUsageChart toolUsage={metrics.toolUsage} />

      {/* Prompt Quality Trend */}
      <PromptQualityTrend messages={session.messages} />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: string;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}