import { ContentBlock, MessageContent } from './types';

export function isContentBlock(content: any): content is ContentBlock {
  return typeof content === 'object' && 'type' in content;
}

export function isContentBlockArray(content: any): content is ContentBlock[] {
  return Array.isArray(content) && content.every(isContentBlock);
}

export function extractTextFromContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (isContentBlockArray(content)) {
    return content
      .map(block => block.text || '')
      .filter(Boolean)
      .join('\n');
  }
  
  return '';
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  
  return `${(count / 1000000).toFixed(2)}M`;
}

export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / oldValue) * 100;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}