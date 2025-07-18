'use client';

import { useState } from 'react';
import { ProcessedMessage, ActivityType } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/constants';

interface ActivityTimelineProps {
  messages: ProcessedMessage[];
  startTime: Date;
  endTime: Date;
}

interface TimelineSegment {
  sequenceNumber: number;
  timestamp: Date;
  minutesFromStart: number;
  activity: ActivityType;
  color: string;
  label: string;
  content: string;
}

interface ActivityRow {
  activity: ActivityType;
  label: string;
  color: string;
  segments: TimelineSegment[];
}

export function ActivityTimeline({ messages, startTime, endTime }: ActivityTimelineProps) {
  const [selectedMessage, setSelectedMessage] = useState<TimelineSegment | null>(null);
  
  // Ensure startTime is a Date object
  const sessionStartTime = startTime instanceof Date ? startTime : new Date(startTime);
  
  // Create timeline segments from user messages only
  const segments = createTimelineSegments(messages, sessionStartTime);
  
  // Group segments by activity type
  const activityRows = groupSegmentsByActivity(segments);
  
  // Calculate dynamic segment width based on number of messages
  const segmentWidth = Math.max(40, Math.min(60, 800 / Math.max(segments.length, 1)));
  const totalTimelineWidth = segments.length * (segmentWidth + 4) + 120; // segments + gaps + label width

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Activity Timeline
      </h3>
      
      {/* Timeline visualization */}
      <div className="relative" style={{ minHeight: `${activityRows.length * 36 + 40}px` }}>
        {/* Fixed labels column */}
        <div className="absolute left-0 top-0 bottom-0 z-10 bg-white dark:bg-gray-800">
          <div className="pr-2">
            <div className="h-8 mb-2 flex items-center">
              <div className="w-[100px] text-xs text-gray-500 dark:text-gray-400">
                Message Sequence
              </div>
            </div>
            <div className="space-y-1">
              {activityRows.map(({ activity, label }) => (
                <div key={activity} className="h-[28px] flex items-center">
                  <div className="w-[100px] text-xs text-gray-700 dark:text-gray-300 truncate pr-2">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Scrollable timeline area */}
        <div className="overflow-x-auto ml-[100px]">
          <div style={{ width: `${totalTimelineWidth}px` }}>
            {/* Sequence numbers header */}
            <div className="flex items-center mb-2 h-8">
              <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                →
              </div>
              <div className="flex gap-1">
                {segments.map((_, idx) => (
                  <div key={idx} className="text-[10px] text-gray-500 dark:text-gray-400 font-mono" style={{ width: `${segmentWidth}px`, textAlign: 'center' }}>
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Activity rows */}
            <div className="space-y-1">
              {activityRows.map(({ activity, color, segments: rowSegments }) => (
                <div key={activity} className="flex items-center h-[28px]">
                  {/* Timeline segments */}
                  <div className="flex gap-1 ml-2">
                    {segments.map((segment, idx) => {
                    const isThisActivity = segment.activity === activity;
                    const segmentInRow = rowSegments.find(s => s.sequenceNumber === idx + 1);
                    
                    return (
                      <div
                        key={idx}
                        className="relative"
                        style={{ width: `${segmentWidth}px` }}
                      >
                        {isThisActivity && segmentInRow ? (
                          <div
                            className="rounded-md p-1 cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:z-10"
                            style={{
                              backgroundColor: color,
                              height: '28px',
                            }}
                            onClick={() => setSelectedMessage(segmentInRow)}
                            title={`Message #${idx + 1} at ${formatTimestamp(segmentInRow.minutesFromStart)}\n"${segmentInRow.content.slice(0, 100)}..."`}
                          >
                            {/* Short timestamp */}
                            <div className="text-[10px] text-white text-center opacity-90">
                              {Math.round(segmentInRow.minutesFromStart)}m
                            </div>
                          </div>
                        ) : (
                          <div className="h-[28px]" /> // Empty space for alignment
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Summary stats - outside scrollable area */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Total messages: <span className="font-medium text-gray-900 dark:text-white">{segments.length}</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Unique activities: <span className="font-medium text-gray-900 dark:text-white">{activityRows.length}</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Session duration: <span className="font-medium text-gray-900 dark:text-white">{formatTimestamp(segments[segments.length - 1]?.minutesFromStart || 0)}</span>
          </div>
        </div>
      </div>
      
      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMessage(null)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Message #{selectedMessage.sequenceNumber}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white"
                      style={{ backgroundColor: selectedMessage.color }}
                    >
                      {selectedMessage.label}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTimestamp(selectedMessage.minutesFromStart)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="prose dark:prose-invert max-w-none overflow-y-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {selectedMessage.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function createTimelineSegments(
  messages: ProcessedMessage[], 
  sessionStartTime: Date
): TimelineSegment[] {
  // Filter to only user messages
  const userMessages = messages.filter(msg => msg.role === 'user');

  return userMessages
    .filter(msg => msg.activity) // Only messages with activities
    .filter(msg => {
      const content = msg.content.trim();
      
      // Filter out messages that contain "[Request interrupted by user]"
      if (content.includes('[Request interrupted by user]')) return false;
      
      // Filter out initial_question since it's displayed above the timeline
      if (msg.activity === 'initial_question') return false;
      
      // Filter out implementation blocks that are just short follow-ups or acknowledgments
      if (msg.activity === 'implementation') {
        // Remove if it's a very short message (likely just "ok", "continue", etc.)
        if (content.length < 20) return false;
        // Remove if it matches common follow-up patterns
        const followUpPatterns = [
          /^(yes|no|ok|okay|sure|thanks|thank you|got it|i see|ah|oh)\.?$/i,
          /^(continue|proceed|go ahead|next)\.?$/i,
          /^(done|finished|completed)\.?$/i
        ];
        if (followUpPatterns.some(pattern => pattern.test(content))) return false;
      }
      return true;
    })
    .map((message, index) => {
      const messageTime = new Date(message.timestamp);
      const minutesFromStart = (messageTime.getTime() - sessionStartTime.getTime()) / 1000 / 60;

      return {
        sequenceNumber: index + 1,
        timestamp: messageTime,
        minutesFromStart,
        activity: message.activity!,
        color: ACTIVITY_COLORS[message.activity!] || ACTIVITY_COLORS.completion,
        label: message.activity!.replace(/_/g, ' '),
        content: message.content
      };
    });
}

function groupSegmentsByActivity(segments: TimelineSegment[]): ActivityRow[] {
  const activityOrder: ActivityType[] = [
    'solution_design',
    'task_management',
    'code_exploration',
    'deep_dive',
    'implementation',
    'validation',
    'error_handling',
    'conceptual_pivot',
    'completion'
  ];

  const grouped = new Map<ActivityType, ActivityRow>();

  // Group segments by activity
  segments.forEach(segment => {
    if (!grouped.has(segment.activity)) {
      grouped.set(segment.activity, {
        activity: segment.activity,
        label: segment.label,
        color: segment.color,
        segments: []
      });
    }
    
    grouped.get(segment.activity)!.segments.push(segment);
  });

  // Return in preferred order, filtering to only include activities with segments
  return activityOrder
    .filter(activity => grouped.has(activity))
    .map(activity => grouped.get(activity)!);
}

function formatTimestamp(minutes: number): string {
  if (minutes < 1) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}