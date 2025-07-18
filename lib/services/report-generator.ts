import { UserProfile, AnalyticsSession } from '../types/user-analytics';

export function generateTextReport(profile: UserProfile, sessions: AnalyticsSession[]): string {
  const lines: string[] = [];
  
  // Header
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('          DISTINGUISHED ENGINEER ANALYTICS REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Analysis Depth: ${profile.totalSessions} sessions, ${profile.totalHours.toFixed(1)} hours`);
  lines.push('');
  
  // Executive Assessment
  lines.push('EXECUTIVE ASSESSMENT');
  lines.push('───────────────────');
  
  const engineerLevel = getDistinguishedEngineerLevel(profile);
  lines.push(`Engineering Level: ${engineerLevel.level}`);
  lines.push(`Overall Trajectory: ${profile.overallSkillLevel.trajectory}`);
  lines.push('');
  
  // Key Strengths at Distinguished Level
  lines.push('DISTINGUISHED ENGINEERING STRENGTHS');
  lines.push('───────────────────────────────────');
  
  const distinguishedStrengths = analyzeDistinguishedStrengths(profile.technicalStrengths);
  if (distinguishedStrengths.length > 0) {
    distinguishedStrengths.forEach(strength => {
      lines.push(`\n${strength.title}`);
      lines.push(`  Level: ${strength.level} | Evidence: ${strength.evidence}`);
      if (strength.advancedPatterns && strength.advancedPatterns.length > 0) {
        lines.push(`  Advanced Patterns: ${strength.advancedPatterns.join(', ')}`);
      }
      lines.push(`  Industry Comparison: ${strength.comparison}`);
    });
  } else {
    lines.push('\nDeveloping distinguished engineering capabilities...');
  }
  lines.push('');
  
  // Technical Profile
  lines.push('TECHNICAL PROFILE');
  lines.push('─────────────────');
  lines.push('');
  
  lines.push('Skill Breakdown:');
  Object.entries(profile.overallSkillLevel.breakdown).forEach(([skill, value]) => {
    const skillName = skill.replace(/([A-Z])/g, ' $1').trim();
    const bar = generateProgressBar(value as number);
    lines.push(`  ${skillName.padEnd(20)} ${bar} ${value}%`);
  });
  lines.push('');
  
  // Strengths Analysis
  lines.push('TECHNICAL STRENGTHS');
  lines.push('───────────────────');
  profile.technicalStrengths.forEach(strength => {
    lines.push(`\n${strength.category}`);
    lines.push(`  Level: ${strength.proficiencyLevel}`);
    lines.push(`  Confidence: ${strength.confidenceScore}%`);
    lines.push(`  Trend: ${getTrendSymbol(strength.growthTrend)} ${strength.growthTrend}`);
  });
  lines.push('');
  
  // Critical Improvement Areas - Distinguished Engineer Perspective
  if (profile.weaknesses.length > 0) {
    lines.push('CRITICAL IMPROVEMENT AREAS');
    lines.push('──────────────────────────');
    lines.push('Areas requiring attention to reach distinguished engineer level:');
    
    const criticalWeaknesses = analyzeCriticalWeaknesses(profile.weaknesses);
    criticalWeaknesses.forEach(weakness => {
      lines.push(`\n${weakness.area} [${weakness.severity.toUpperCase()}]`);
      lines.push(`  Impact: ${weakness.impact}`);
      lines.push(`  Frequency: ${weakness.frequency.toFixed(0)}% of sessions`);
      
      if (weakness.rootCauses && weakness.rootCauses.length > 0) {
        lines.push(`  Root Causes: ${weakness.rootCauses.join(', ')}`);
      }
      
      lines.push(`  Improvement Potential: ${weakness.improvementPotential}%`);
      
      if (weakness.recommendations.length > 0) {
        lines.push('  Action Plan:');
        weakness.recommendations.slice(0, 2).forEach((rec, idx) => {
          lines.push(`    ${idx + 1}. ${rec.title} (${rec.priority} priority)`);
          lines.push(`       → ${rec.expectedImprovement}`);
        });
      }
      
      if (weakness.examples && weakness.examples.length > 0) {
        lines.push(`  Recent Example: ${weakness.examples[0].context}...`);
      }
    });
    lines.push('');
  }
  
  // Coding Patterns
  lines.push('CODING PATTERNS & TENDENCIES');
  lines.push('────────────────────────────');
  const significantTendencies = profile.codingTendencies.filter(t => t.frequency > 20);
  
  if (significantTendencies.length > 0) {
    significantTendencies.forEach(tendency => {
      const impactSymbol = tendency.impact === 'positive' ? '✓' : 
                          tendency.impact === 'negative' ? '✗' : '•';
      lines.push(`  ${impactSymbol} ${tendency.pattern} (${tendency.frequency.toFixed(0)}% of sessions)`);
      if (tendency.recommendation) {
        lines.push(`    → ${tendency.recommendation}`);
      }
    });
  } else {
    lines.push('  No significant patterns detected yet. Keep coding!');
  }
  lines.push('');
  
  // Growth Areas
  lines.push('GROWTH ROADMAP');
  lines.push('──────────────');
  profile.growthAreas.slice(0, 3).forEach(area => {
    lines.push(`\n${area.skill}`);
    lines.push(`  Current: ${area.currentLevel}% → Target: ${area.targetLevel}%`);
    lines.push(`  Timeline: ${area.timeline}`);
    lines.push(`  Growth Rate: ${area.improvementRate}% per week`);
    
    if (area.recommendedActions.length > 0) {
      lines.push('  Next Steps:');
      area.recommendedActions.slice(0, 2).forEach(action => {
        lines.push(`    • ${action.title} (${action.priority} priority)`);
      });
    }
  });
  lines.push('');
  
  // Tool Usage
  lines.push('TOOL PROFICIENCY');
  lines.push('────────────────');
  const topTools = profile.preferredTools
    .sort((a, b) => b.usageFrequency - a.usageFrequency)
    .slice(0, 5);
  
  topTools.forEach(tool => {
    lines.push(`  ${tool.toolName.padEnd(20)} ${tool.proficiency} (${tool.usageFrequency} uses)`);
  });
  lines.push('');
  
  // Session Insights Summary
  if (sessions.length > 0) {
    lines.push('RECENT SESSION INSIGHTS');
    lines.push('───────────────────────');
    
    const recentSessions = sessions.slice(0, 3);
    recentSessions.forEach(session => {
      lines.push(`\n${new Date(session.session.startTime).toLocaleDateString()} - ${session.session.summary.substring(0, 60)}...`);
      if (session.insights.keyTakeaways.length > 0) {
        lines.push('  Key Takeaways:');
        session.insights.keyTakeaways.slice(0, 2).forEach(takeaway => {
          lines.push(`    • ${takeaway}`);
        });
      }
    });
    lines.push('');
  }
  
  // Distinguished Engineer Development Path
  lines.push('DISTINGUISHED ENGINEER DEVELOPMENT PATH');
  lines.push('───────────────────────────────────────');
  
  const developmentPath = generateDevelopmentPath(profile);
  
  lines.push('\nImmediate Focus (Next 2 Weeks):');
  developmentPath.immediate.forEach((action, idx) => {
    lines.push(`  ${idx + 1}. ${action.title}`);
    lines.push(`     Impact: ${action.impact} | Effort: ${action.effort}`);
  });
  
  lines.push('\nMedium-term Goals (1-2 Months):');
  developmentPath.mediumTerm.forEach((goal, idx) => {
    lines.push(`  ${idx + 1}. ${goal.title}`);
    lines.push(`     Target: ${goal.target}`);
  });
  
  lines.push('\nLong-term Vision (3-6 Months):');
  lines.push(`  ${developmentPath.longTermVision}`);
  
  // Engineering Excellence Metrics
  lines.push('\n\nENGINEERING EXCELLENCE METRICS');
  lines.push('──────────────────────────────');
  
  const metrics = calculateExcellenceMetrics(profile, sessions);
  lines.push(`  Code Quality Score: ${metrics.codeQuality}/100`);
  lines.push(`  Problem-Solving Efficiency: ${metrics.problemSolving}/100`);
  lines.push(`  Architectural Thinking: ${metrics.architecture}/100`);
  lines.push(`  Innovation Index: ${metrics.innovation}/100`);
  lines.push(`  Consistency Rating: ${metrics.consistency}/100`);
  
  lines.push('\n  Distinguished Engineer Readiness: ' + getReadinessBar(metrics.overall));
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  return lines.join('\n');
}

function getSkillLevelDescription(level: number): string {
  if (level >= 85) return 'highly skilled';
  if (level >= 70) return 'proficient';
  if (level >= 50) return 'competent';
  if (level >= 30) return 'developing';
  return 'beginner';
}

function generateProgressBar(value: number, width: number = 20): string {
  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

function getTrendSymbol(trend: 'improving' | 'stable' | 'declining'): string {
  switch (trend) {
    case 'improving': return '↑';
    case 'declining': return '↓';
    default: return '→';
  }
}

/**
 * Analyze engineering level based on comprehensive metrics
 */
function getDistinguishedEngineerLevel(profile: UserProfile): {
  level: string;
  percentile: number;
} {
  const { overall, breakdown } = profile.overallSkillLevel;
  const expertStrengths = profile.technicalStrengths.filter(s => s.proficiencyLevel === 'expert').length;
  const advancedStrengths = profile.technicalStrengths.filter(s => s.proficiencyLevel === 'advanced').length;
  
  if (overall >= 90 && expertStrengths >= 3) {
    return { level: 'Distinguished Engineer', percentile: 95 };
  } else if (overall >= 80 && (expertStrengths >= 2 || advancedStrengths >= 4)) {
    return { level: 'Staff Engineer', percentile: 85 };
  } else if (overall >= 70 && advancedStrengths >= 3) {
    return { level: 'Senior Engineer', percentile: 70 };
  } else if (overall >= 60) {
    return { level: 'Mid-level Engineer', percentile: 50 };
  } else {
    return { level: 'Junior Engineer', percentile: 30 };
  }
}

/**
 * Analyze strengths for distinguished engineering characteristics
 */
function analyzeDistinguishedStrengths(strengths: any[]): Array<{
  title: string;
  level: string;
  evidence: string;
  advancedPatterns?: string[];
  comparison: string;
}> {
  return strengths
    .filter(s => s.proficiencyLevel === 'expert' || s.proficiencyLevel === 'advanced')
    .map(strength => {
      const advancedPatterns = strength.advancedPatterns || [];
      const comparison = getIndustryComparison(strength.proficiencyLevel, strength.confidenceScore);
      
      return {
        title: strength.category,
        level: strength.proficiencyLevel,
        evidence: `${strength.confidenceScore}% confidence, ${strength.consistencyScore || 0}% consistency`,
        advancedPatterns,
        comparison
      };
    })
    .slice(0, 5);
}

/**
 * Get industry comparison for proficiency level
 */
function getIndustryComparison(proficiency: string, confidence: number): string {
  if (proficiency === 'expert' && confidence >= 90) {
    return 'Top 5% of engineers';
  } else if (proficiency === 'expert') {
    return 'Top 10% of engineers';
  } else if (proficiency === 'advanced' && confidence >= 80) {
    return 'Top 20% of engineers';
  } else if (proficiency === 'advanced') {
    return 'Top 30% of engineers';
  } else {
    return 'Above average';
  }
}

/**
 * Analyze critical weaknesses with root cause analysis
 */
function analyzeCriticalWeaknesses(weaknesses: any[]): any[] {
  return weaknesses
    .filter(w => w.severity !== 'minor' || w.frequency > 50)
    .slice(0, 3);
}

/**
 * Generate personalized development path
 */
function generateDevelopmentPath(profile: UserProfile): {
  immediate: Array<{ title: string; impact: string; effort: string }>;
  mediumTerm: Array<{ title: string; target: string }>;
  longTermVision: string;
} {
  const immediate = [];
  const mediumTerm = [];
  
  // Prioritize based on weaknesses and growth areas
  const criticalWeaknesses = profile.weaknesses
    .filter(w => w.severity === 'significant')
    .slice(0, 2);
    
  criticalWeaknesses.forEach(weakness => {
    if (weakness.recommendations.length > 0) {
      const rec = weakness.recommendations[0];
      immediate.push({
        title: rec.title,
        impact: rec.expectedImprovement,
        effort: rec.effort
      });
    }
  });
  
  // Add growth area goals
  profile.growthAreas.slice(0, 3).forEach(area => {
    mediumTerm.push({
      title: `Advance ${area.skill} from ${area.currentLevel}% to ${area.targetLevel}%`,
      target: area.timeline
    });
  });
  
  // Long-term vision based on current level
  const level = profile.overallSkillLevel.overall;
  let longTermVision = '';
  
  if (level >= 80) {
    longTermVision = 'Achieve Distinguished Engineer status with expertise in system design and technical leadership';
  } else if (level >= 70) {
    longTermVision = 'Progress to Staff Engineer level with deep expertise in 2-3 core domains';
  } else if (level >= 60) {
    longTermVision = 'Advance to Senior Engineer with strong architectural and mentoring capabilities';
  } else {
    longTermVision = 'Build solid engineering fundamentals and specialize in key technical areas';
  }
  
  return { immediate, mediumTerm, longTermVision };
}

/**
 * Calculate engineering excellence metrics
 */
function calculateExcellenceMetrics(profile: UserProfile, sessions: AnalyticsSession[]): {
  codeQuality: number;
  problemSolving: number;
  architecture: number;
  innovation: number;
  consistency: number;
  overall: number;
} {
  const { breakdown } = profile.overallSkillLevel;
  
  // Calculate architecture score based on strengths
  const architectureStrength = profile.technicalStrengths.find(s => 
    s.category.toLowerCase().includes('architecture')
  );
  const architectureScore = architectureStrength ? 
    Math.min(100, architectureStrength.confidenceScore * 1.1) : 50;
  
  // Calculate innovation based on tool usage and patterns
  const innovationIndicators = profile.technicalStrengths.filter(s => 
    s.advancedPatterns && s.advancedPatterns.length > 3
  ).length;
  const innovationScore = Math.min(100, 50 + (innovationIndicators * 15));
  
  // Calculate consistency
  const consistencyScores = profile.technicalStrengths
    .map(s => s.consistencyScore || 70)
    .filter(score => score > 0);
  const avgConsistency = consistencyScores.length > 0 ?
    consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length : 70;
  
  const metrics = {
    codeQuality: breakdown.codeQuality,
    problemSolving: breakdown.problemSolving,
    architecture: architectureScore,
    innovation: innovationScore,
    consistency: Math.round(avgConsistency),
    overall: 0
  };
  
  // Calculate overall readiness
  metrics.overall = Math.round(
    (metrics.codeQuality + metrics.problemSolving + metrics.architecture + 
     metrics.innovation + metrics.consistency) / 5
  );
  
  return metrics;
}

/**
 * Generate readiness bar visualization
 */
function getReadinessBar(percentage: number): string {
  const width = 30;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  
  if (percentage >= 80) {
    return `${bar} ${percentage}% - Ready for Distinguished Engineer role`;
  } else if (percentage >= 65) {
    return `${bar} ${percentage}% - Approaching senior technical leadership`;
  } else if (percentage >= 50) {
    return `${bar} ${percentage}% - Building advanced capabilities`;
  } else {
    return `${bar} ${percentage}% - Developing core competencies`;
  }
}