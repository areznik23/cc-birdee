import { ActivityType } from './types';

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  initial_question: '#D4A574', // warm sand
  task_management: '#D89B7F', // terracotta
  implementation: '#9B8B7E', // warm taupe
  error_handling: '#C08B7C', // dusty rose
  deep_dive: '#B8956F', // camel
  conceptual_pivot: '#C9A882', // wheat
  code_exploration: '#A68B6F', // mushroom
  validation: '#B5A492', // warm gray
  solution_design: '#C4A57B', // honey
  completion: '#A69B87', // sage brown
};

export const STRAIN_ZONES = {
  low: { min: 0, max: 4, color: '#A69B87', label: 'Recovery' },
  optimal: { min: 4, max: 8, color: '#B8956F', label: 'Optimal' },
  overreaching: { min: 8, max: 10, color: '#D89B7F', label: 'Overreaching' },
} as const;

export const TOOL_COLORS: Record<string, string> = {
  Read: '#B8956F',
  Write: '#9B8B7E',
  MultiEdit: '#C08B7C',
  Grep: '#D4A574',
  Bash: '#D89B7F',
  TodoWrite: '#C9A882',
  Task: '#A68B6F',
  default: '#9B9186',
};

export const SESSION_LOG_PATH = '~/.claude/projects';
export const MAX_FILE_SIZE_MB = 50;
export const DEFAULT_SESSION_LIMIT = 10;
export const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes