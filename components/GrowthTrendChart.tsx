'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GrowthTrendChartProps {
  data: {
    week: string;
    overallSkill: number;
    problemSolving: number;
    codeQuality: number;
    efficiency: number;
  }[];
  height?: number;
}

export function GrowthTrendChart({ data, height = 300 }: GrowthTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="week" 
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />
        <YAxis 
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          stroke="#6b7280"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
          formatter={(value: number) => `${value}%`}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        <Line 
          type="monotone" 
          dataKey="overallSkill" 
          stroke="#3b82f6" 
          strokeWidth={3}
          name="Overall Skill"
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="problemSolving" 
          stroke="#8b5cf6" 
          strokeWidth={2}
          name="Problem Solving"
          strokeDasharray="5 5"
        />
        <Line 
          type="monotone" 
          dataKey="codeQuality" 
          stroke="#10b981" 
          strokeWidth={2}
          name="Code Quality"
          strokeDasharray="5 5"
        />
        <Line 
          type="monotone" 
          dataKey="efficiency" 
          stroke="#f59e0b" 
          strokeWidth={2}
          name="Efficiency"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}