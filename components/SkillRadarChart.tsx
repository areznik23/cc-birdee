'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SkillRadarChartProps {
  data: {
    skill: string;
    value: number;
    fullMark: number;
  }[];
  height?: number;
}

export function SkillRadarChart({ data, height = 300 }: SkillRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid 
          gridType="polygon" 
          radialLines={true}
          stroke="#e5e7eb"
          strokeDasharray="3 3"
        />
        <PolarAngleAxis 
          dataKey="skill" 
          tick={{ fontSize: 12 }}
          className="text-gray-600 dark:text-gray-400"
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          tickCount={5}
          tick={{ fontSize: 10 }}
          className="text-gray-500"
        />
        <Radar 
          name="Skill Level" 
          dataKey="value" 
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
          strokeWidth={2}
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
      </RadarChart>
    </ResponsiveContainer>
  );
}