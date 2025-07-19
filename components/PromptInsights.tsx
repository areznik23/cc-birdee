'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  PromptAnalysisResponse, 
  ProjectPromptAnalysis, 
  PromptClassification 
} from '@/lib/types/prompt-analysis';
// Removed icon imports for simpler UI


// Suggest automation solutions based on classification
const getAutomationSuggestion = (classification: string): string => {
  const lowerClass = classification.toLowerCase();
  
  if (lowerClass.includes('manual file context retrieval')) {
    return 'Implement project-wide search, better file organization, or AI-powered file navigation';
  }
  if (lowerClass.includes('manual git branch management')) {
    return 'Use git aliases, automated branch workflows, or CI/CD integration';
  }
  if (lowerClass.includes('manual incremental ui tweaks')) {
    return 'Create UI component library, design system, or visual regression testing';
  }
  if (lowerClass.includes('manual logging consistency')) {
    return 'Implement structured logging, log aggregation, or automated log analysis';
  }
  if (lowerClass.includes('repetitive debugging')) {
    return 'Add automated testing, linting rules, or error monitoring';
  }
  if (lowerClass.includes('boilerplate code')) {
    return 'Create code generators, templates, or scaffolding tools';
  }
  if (lowerClass.includes('context rebuilding')) {
    return 'Improve documentation, add CLAUDE.md files, or implement context persistence';
  }
  
  return 'Consider automation or workflow optimization for this pattern';
};

interface ClassificationCardProps {
  classification: PromptClassification;
  index: number;
}

const ClassificationCard: React.FC<ClassificationCardProps> = ({ classification, index }) => {
  const suggestion = getAutomationSuggestion(classification.o3_classification);
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">
          {classification.o3_classification}
        </h3>
        <span className="text-sm text-gray-500">
          {classification.percentage.toFixed(1)}%
        </span>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        {classification.prompt_count} prompts analyzed
      </div>
      
      <div className="bg-gray-50 rounded p-3">
        <p className="text-sm text-gray-700">{suggestion}</p>
      </div>
    </Card>
  );
};

interface ProjectInsightsProps {
  project: ProjectPromptAnalysis;
}

const ProjectInsights: React.FC<ProjectInsightsProps> = ({ project }) => {
  const totalPrompts = project.analysisData?.classifications.reduce(
    (sum, c) => sum + c.prompt_count, 0
  ) || 0;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{project.projectName.replace('Cc Birdee', '').trim() || 'Project Analysis'}</h2>
        <div className="text-sm text-gray-600">
          <span>{totalPrompts} prompts • Updated {new Date(project.lastUpdated).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {project.analysisData?.classifications.map((classification, index) => (
          <ClassificationCard
            key={classification.topic_id}
            classification={classification}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export const PromptInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PromptAnalysisResponse | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  useEffect(() => {
    fetchPromptInsights();
  }, []);
  
  const fetchPromptInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/prompt-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch prompt insights');
      }
      const data: PromptAnalysisResponse = await response.json();
      setData(data);
      
      // Select first project by default
      if (data.projects.length > 0 && !selectedProject) {
        setSelectedProject(data.projects[0].projectPath);
      }
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading prompt insights...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }
  
  if (!data || data.projects.length === 0) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No Prompt Analysis Available</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Run the prompt analysis script on your Claude session logs to see automation insights here.
        </p>
        <pre className="mt-4 text-xs bg-gray-100 p-2 rounded inline-block">
          python scripts/analyze_prompt_topics.py ~/.claude/projects/YOUR_PROJECT
        </pre>
      </div>
    );
  }
  
  const selectedProjectData = data.projects.find(p => p.projectPath === selectedProject);
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Prompt Analysis Insights</h1>
          <p className="text-gray-600">
            Automation opportunities and workflow improvements identified in your Claude usage patterns
          </p>
          {data && data.projects.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchPromptInsights}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>
      
      {data.projects.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project
          </label>
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {data.projects.map(project => (
              <option key={project.projectPath} value={project.projectPath}>
                {project.projectName}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {selectedProjectData && (
        <ProjectInsights project={selectedProjectData} />
      )}
    </div>
  );
};