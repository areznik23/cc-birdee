'use client';

import { ProcessedMessage, ActivityType } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/constants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';

interface ActivityTimelineProps {
  messages: ProcessedMessage[];
  startTime: Date;
  endTime: Date;
}

interface TimelineSegment {
  startTime: number;
  endTime: number;
  duration: number;
  activity: ActivityType;
  color: string;
  label: string;
}

export function ActivityTimeline({ messages, startTime, endTime }: ActivityTimelineProps) {
  // Create timeline segments from messages
  const segments = createTimelineSegments(messages, startTime);

  // Convert to chart data
  const chartData = segments.map((segment, index) => ({
    index: index + 1,
    duration: segment.duration,
    activity: segment.activity,
    color: segment.color,
    label: segment.label,
    tooltip: `${segment.label} (${Math.round(segment.duration)} min)`
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Activity Timeline
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis 
              dataKey="index" 
              label={{ value: 'Activity Sequence', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 text-white p-2 rounded shadow-lg">
                      <p className="text-sm">{data.tooltip}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(getUniqueActivities(segments)).map(([activity, count]) => (
          <div key={activity} className="flex items-center gap-1 text-xs">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: ACTIVITY_COLORS[activity as ActivityType] }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {activity.replace(/_/g, ' ')} ({count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function createTimelineSegments(
  messages: ProcessedMessage[], 
  sessionStartTime: Date
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let currentSegment: TimelineSegment | null = null;

  messages.forEach((message, index) => {
    if (!message.activity) return;

    const messageTime = new Date(message.timestamp).getTime();
    const startMinutes = (messageTime - sessionStartTime.getTime()) / 1000 / 60;

    if (!currentSegment || currentSegment.activity !== message.activity) {
      // Start a new segment
      if (currentSegment) {
        segments.push(currentSegment);
      }

      currentSegment = {
        startTime: startMinutes,
        endTime: startMinutes,
        duration: 0,
        activity: message.activity,
        color: ACTIVITY_COLORS[message.activity] || ACTIVITY_COLORS.completion,
        label: message.activity.replace(/_/g, ' ')
      };
    }

    // Update the current segment's end time
    if (index < messages.length - 1) {
      const nextMessageTime = new Date(messages[index + 1].timestamp).getTime();
      const endMinutes = (nextMessageTime - sessionStartTime.getTime()) / 1000 / 60;
      currentSegment.endTime = endMinutes;
      currentSegment.duration = endMinutes - currentSegment.startTime;
    } else {
      // Last message - estimate duration
      currentSegment.duration = Math.max(1, currentSegment.duration);
    }
  });

  // Add the last segment
  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

function getUniqueActivities(segments: TimelineSegment[]): Record<string, number> {
  return segments.reduce((acc, segment) => {
    acc[segment.activity] = (acc[segment.activity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}