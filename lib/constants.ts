import { ActivityType } from './types';

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  initial_question: '#3B82F6', // blue
  task_management: '#8B5CF6', // purple
  implementation: '#10B981', // green
  error_handling: '#EF4444', // red
  deep_dive: '#F59E0B', // amber
  conceptual_pivot: '#EC4899', // pink
  code_exploration: '#06B6D4', // cyan
  validation: '#84CC16', // lime
  solution_design: '#6366F1', // indigo
  completion: '#22C55E', // emerald
};

export const STRAIN_ZONES = {
  low: { min: 0, max: 4, color: '#10B981', label: 'Recovery' },
  optimal: { min: 4, max: 8, color: '#3B82F6', label: 'Optimal' },
  overreaching: { min: 8, max: 10, color: '#EF4444', label: 'Overreaching' },
} as const;

export const TOOL_COLORS: Record<string, string> = {
  Read: '#3B82F6',
  Write: '#10B981',
  MultiEdit: '#8B5CF6',
  Grep: '#F59E0B',
  Bash: '#EF4444',
  TodoWrite: '#EC4899',
  Task: '#06B6D4',
  default: '#6B7280',
};

export const SESSION_LOG_PATH = '~/.claude/projects';
export const MAX_FILE_SIZE_MB = 50;
export const DEFAULT_SESSION_LIMIT = 10;
export const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes