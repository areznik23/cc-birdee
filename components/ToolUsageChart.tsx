'use client';

import { ToolUsage } from '@/lib/types';
import { TOOL_COLORS } from '@/lib/constants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface ToolUsageChartProps {
  toolUsage: ToolUsage;
}

export function ToolUsageChart({ toolUsage }: ToolUsageChartProps) {
  // Convert tool usage to chart data
  const chartData = Object.entries(toolUsage)
    .map(([tool, count]) => ({
      tool,
      count,
      percentage: 0, // Will be calculated below
      color: TOOL_COLORS[tool] || TOOL_COLORS.default
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate percentages
  const totalUsage = chartData.reduce((sum, item) => sum + item.count, 0);
  chartData.forEach(item => {
    item.percentage = totalUsage > 0 ? (item.count / totalUsage) * 100 : 0;
  });

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tool Usage Analytics
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No tools were used in this session
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Tool Usage Analytics
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="tool" 
              tick={{ fill: '#9CA3AF' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: '#9CA3AF' }}
              label={{ 
                value: 'Usage Count', 
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
                    <div className="bg-gray-900 text-white p-3 rounded shadow-lg">
                      <p className="font-semibold">{data.tool}</p>
                      <p className="text-sm">Count: {data.count}</p>
                      <p className="text-sm">Usage: {data.percentage.toFixed(1)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tool Usage Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {chartData.length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unique Tools
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalUsage}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Uses
          </p>
        </div>
      </div>

      {/* Most Used Tool */}
      {chartData.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Most used: <span className="font-semibold">{chartData[0].tool}</span> ({chartData[0].count} times)
          </p>
        </div>
      )}
    </div>
  );
}