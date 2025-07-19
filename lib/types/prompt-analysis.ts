export interface PromptClassification {
  topic_id: number;
  o3_classification: string;
  bertopic_name: string;
  prompt_count: number;
  percentage: number;
}

export interface PromptAnalysisData {
  timestamp: string;
  classifications: PromptClassification[];
}

export interface ProjectPromptAnalysis {
  projectPath: string;
  projectName: string;
  analysisData: PromptAnalysisData | null;
  lastUpdated: string;
}

export interface PromptAnalysisResponse {
  projects: ProjectPromptAnalysis[];
}