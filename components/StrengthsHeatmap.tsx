'use client';

interface StrengthsHeatmapProps {
  strengths: {
    category: string;
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    confidenceScore: number;
    growthTrend: 'improving' | 'stable' | 'declining';
  }[];
}

export function StrengthsHeatmap({ strengths }: StrengthsHeatmapProps) {
  const getColorIntensity = (score: number) => {
    if (score >= 90) return 'bg-blue-600';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-blue-400';
    if (score >= 45) return 'bg-blue-300';
    if (score >= 30) return 'bg-blue-200';
    return 'bg-blue-100';
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    if (trend === 'improving') return '↗';
    if (trend === 'declining') return '↘';
    return '→';
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining') => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  // Group strengths by proficiency level
  const groupedStrengths = strengths.reduce((acc, strength) => {
    if (!acc[strength.proficiencyLevel]) {
      acc[strength.proficiencyLevel] = [];
    }
    acc[strength.proficiencyLevel].push(strength);
    return acc;
  }, {} as Record<string, typeof strengths>);

  const levels: Array<'expert' | 'advanced' | 'intermediate' | 'beginner'> = 
    ['expert', 'advanced', 'intermediate', 'beginner'];

  return (
    <div className="space-y-6">
      {levels.map(level => {
        const levelStrengths = groupedStrengths[level] || [];
        if (levelStrengths.length === 0) return null;

        return (
          <div key={level}>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 capitalize">
              {level} Level
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {levelStrengths.map(strength => (
                <div
                  key={strength.category}
                  className={`
                    relative p-4 rounded-lg text-white transition-all hover:scale-105
                    ${getColorIntensity(strength.confidenceScore)}
                  `}
                >
                  <div className="font-medium text-sm mb-1">
                    {strength.category}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-90">
                      {strength.confidenceScore}%
                    </span>
                    <span className={`text-lg ${getTrendColor(strength.growthTrend)}`}>
                      {getTrendIcon(strength.growthTrend)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>90-100% Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <span>60-89% Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 rounded"></div>
          <span>0-59% Confidence</span>
        </div>
      </div>
    </div>
  );
}