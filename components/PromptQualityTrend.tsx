'use client';

import { ProcessedMessage } from '@/lib/types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

interface PromptQualityTrendProps {
  messages: ProcessedMessage[];
}

export function PromptQualityTrend({ messages }: PromptQualityTrendProps) {
  // Filter for user messages with prompt quality scores
  const userMessages = messages.filter(m => m.role === 'user' && m.promptQuality !== undefined);
  
  if (userMessages.length === 0) {
    return null;
  }

  // Create chart data with moving average
  const chartData = userMessages.map((message, index) => {
    // Calculate moving average (last 3 messages)
    const start = Math.max(0, index - 2);
    const relevantMessages = userMessages.slice(start, index + 1);
    const movingAvg = relevantMessages.reduce((sum, m) => sum + (m.promptQuality || 0), 0) / relevantMessages.length;

    return {
      index: index + 1,
      quality: message.promptQuality || 0,
      movingAverage: Math.round(movingAvg),
      timestamp: new Date(message.timestamp).toLocaleTimeString(),
      content: message.content.substring(0, 50) + '...'
    };
  });

  // Calculate overall average
  const overallAverage = Math.round(
    userMessages.reduce((sum, m) => sum + (m.promptQuality || 0), 0) / userMessages.length
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Prompt Quality Trend
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#9B9186" opacity={0.2} />
            <XAxis 
              dataKey="index" 
              label={{ 
                value: 'Message Number', 
                position: 'insideBottom', 
                offset: -5,
                style: { fill: '#9CA3AF' }
              }}
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fill: '#9CA3AF' }}
              label={{ 
                value: 'Quality Score', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#9CA3AF' }
              }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 text-white p-3 rounded shadow-lg max-w-xs">
                      <p className="font-semibold">Message #{data.index}</p>
                      <p className="text-sm">Quality: {data.quality}/100</p>
                      <p className="text-sm">Moving Avg: {data.movingAverage}/100</p>
                      <p className="text-xs mt-1 text-gray-300">{data.content}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine 
              y={overallAverage} 
              stroke="#9B9186" 
              strokeDasharray="5 5" 
              label={{ 
                value: `Avg: ${overallAverage}`, 
                position: 'right',
                style: { fill: '#9CA3AF' }
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="quality" 
              stroke="#B8956F" 
              strokeWidth={2}
              dot={{ fill: '#B8956F', r: 4 }}
              name="Quality Score"
            />
            <Line 
              type="monotone" 
              dataKey="movingAverage" 
              stroke="#C4A57B" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Moving Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {userMessages[0]?.promptQuality || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            First Score
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overallAverage}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Average
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {userMessages[userMessages.length - 1]?.promptQuality || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last Score
          </p>
        </div>
      </div>

      {/* Improvement Indicator */}
      {userMessages.length > 1 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {chartData[chartData.length - 1].movingAverage > chartData[0].movingAverage ? (
              <span className="text-green-700 dark:text-green-600">
                ↑ Improving trend (+{chartData[chartData.length - 1].movingAverage - chartData[0].movingAverage} points)
              </span>
            ) : chartData[chartData.length - 1].movingAverage < chartData[0].movingAverage ? (
              <span className="text-red-700 dark:text-red-600">
                ↓ Declining trend ({chartData[chartData.length - 1].movingAverage - chartData[0].movingAverage} points)
              </span>
            ) : (
              <span>→ Stable quality</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}