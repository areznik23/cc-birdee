import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { PromptAnalysisData, ProjectPromptAnalysis, PromptAnalysisResponse } from '@/lib/types/prompt-analysis';

// Dynamically find all projects with analysis files
async function findProjectsWithAnalysis(): Promise<string[]> {
  const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects');
  
  try {
    const projectDirs = await fs.readdir(claudeProjectsPath);
    const projectsWithAnalysis: string[] = [];
    
    // Check each project directory for analysis files
    for (const dir of projectDirs) {
      const analysisFilePath = path.join(claudeProjectsPath, dir, 'prompt_analysis_report_o3_classifications.json');
      try {
        await fs.access(analysisFilePath);
        projectsWithAnalysis.push(dir);
      } catch {
        // File doesn't exist, skip this project
      }
    }
    
    return projectsWithAnalysis;
  } catch (error) {
    console.error('Error reading Claude projects directory:', error);
    return [];
  }
}

async function getPromptAnalysisForProject(projectDir: string): Promise<ProjectPromptAnalysis | null> {
  try {
    const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects', projectDir);
    const analysisFilePath = path.join(claudeProjectsPath, 'prompt_analysis_report_o3_classifications.json');
    
    // Check if the analysis file exists
    await fs.access(analysisFilePath);
    
    // Read and parse the analysis file
    const fileContent = await fs.readFile(analysisFilePath, 'utf-8');
    const analysisData: PromptAnalysisData = JSON.parse(fileContent);
    
    // Get file stats for last updated time
    const stats = await fs.stat(analysisFilePath);
    
    // Extract a clean project name from the directory name
    const projectName = projectDir
      .replace(/-Users-alexanderreznik-Desktop-/, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      projectPath: projectDir,
      projectName,
      analysisData,
      lastUpdated: stats.mtime.toISOString()
    };
  } catch (error) {
    // File doesn't exist or couldn't be read
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Dynamically find all projects with analysis
    const projectsWithAnalysis = await findProjectsWithAnalysis();
    
    console.log(`Found ${projectsWithAnalysis.length} projects with prompt analysis`);
    
    // Get all available prompt analyses
    const projectAnalyses = await Promise.all(
      projectsWithAnalysis.map(projectDir => getPromptAnalysisForProject(projectDir))
    );
    
    // Filter out null results (shouldn't happen but just in case)
    const availableAnalyses = projectAnalyses.filter(analysis => analysis !== null) as ProjectPromptAnalysis[];
    
    // Sort by last updated, most recent first
    availableAnalyses.sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
    
    const response: PromptAnalysisResponse = {
      projects: availableAnalyses
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching prompt analyses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt analyses' },
      { status: 500 }
    );
  }
}

// POST endpoint for future: kick off analysis job
export async function POST(request: NextRequest) {
  // TODO: Implement running the Python script for a specific project
  return NextResponse.json(
    { error: 'Analysis job execution not implemented yet' },
    { status: 501 }
  );
}