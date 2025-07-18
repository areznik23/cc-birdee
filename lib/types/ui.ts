import { ActivityType } from './session';

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  lastModified: Date;
}

export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface TimelineSegment {
  activity: ActivityType;
  startTime: number;
  endTime: number;
  duration: number;
  color: string;
}

export interface MetricCard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon?: string;
}

export interface ToolUsageBar {
  tool: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: any;
  retryable?: boolean;
}