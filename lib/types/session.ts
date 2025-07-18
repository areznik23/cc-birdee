export type MessageRole = 'user' | 'assistant';
export type LogEntryType = 'user' | 'assistant' | 'summary';

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: any;
}

export type MessageContent = string | ContentBlock[];

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface Message {
  role: MessageRole;
  content: MessageContent;
  usage?: Usage;
}

export interface LogEntry {
  type: LogEntryType;
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  message: Message;
  toolUseResult?: any;
}

export interface ProcessedMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  tokens: {
    input: number;
    output: number;
  };
  toolsUsed: string[];
  activity?: ActivityType;
  promptQuality?: number;
}

export type ActivityType = 
  | 'initial_question'
  | 'task_management' 
  | 'implementation'
  | 'error_handling'
  | 'deep_dive'
  | 'conceptual_pivot'
  | 'code_exploration'
  | 'validation'
  | 'solution_design'
  | 'completion';

export interface ToolUsage {
  [toolName: string]: number;
}

export interface ActivityBreakdown {
  [activity: string]: number;
}

export interface ScoreBreakdown {
  efficiency: number;
  quality: number;
  progression: number;
  toolMastery: number;
}

export interface MetricsSummary {
  totalTokens: number;
  messageCount: {
    user: number;
    assistant: number;
  };
  toolUsage: ToolUsage;
  avgPromptQuality: number;
  loopCount: number;
  activityBreakdown: ActivityBreakdown;
  sessionScore: number;
  scoreBreakdown: ScoreBreakdown;
}

export interface Session {
  id: string;
  summary: string;
  duration: number; // minutes
  messages: ProcessedMessage[];
  metrics: MetricsSummary;
  startTime: Date;
  endTime: Date;
}