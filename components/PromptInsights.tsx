'use client';

import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Select, Button, Spin, Progress, Typography, Space, Collapse } from 'antd';
import { ThunderboltOutlined, ReloadOutlined, BulbOutlined } from '@ant-design/icons';
import { 
  PromptAnalysisResponse, 
  ProjectPromptAnalysis, 
  PromptClassification 
} from '@/lib/types/prompt-analysis';

const { Text, Title } = Typography;
const { Panel } = Collapse;

// Suggest automation solutions based on classification
const getAutomationSuggestion = (classification: string): string => {
  const lowerClass = classification.toLowerCase();
  
  if (lowerClass.includes('manual file context retrieval')) {
    return 'Project-wide search & AI file navigation';
  }
  if (lowerClass.includes('manual git branch management')) {
    return 'Git aliases & automated workflows';
  }
  if (lowerClass.includes('manual incremental ui tweaks')) {
    return 'Component library & design system';
  }
  if (lowerClass.includes('manual logging consistency')) {
    return 'Structured logging & log aggregation';
  }
  if (lowerClass.includes('repetitive debugging')) {
    return 'Automated testing & error monitoring';
  }
  if (lowerClass.includes('boilerplate code')) {
    return 'Code generators & templates';
  }
  if (lowerClass.includes('context rebuilding')) {
    return 'CLAUDE.md files & context persistence';
  }
  
  return 'Workflow optimization needed';
};

interface InsightItemProps {
  classification: PromptClassification;
}

const InsightItem: React.FC<InsightItemProps> = ({ classification }) => {
  const suggestion = getAutomationSuggestion(classification.o3_classification);
  const percentage = classification.percentage.toFixed(0);
  
  return (
    <List.Item
      actions={[
        <Progress 
          key="progress"
          type="circle" 
          percent={parseInt(percentage)} 
          width={50}
          strokeColor="#D4A574"
        />
      ]}
    >
      <List.Item.Meta
        avatar={<BulbOutlined style={{ fontSize: 20, color: '#D4A574' }} />}
        title={
          <Space>
            <Text strong>{classification.o3_classification}</Text>
            <Tag color="blue">{classification.prompt_count} prompts</Tag>
          </Space>
        }
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {suggestion}
            </Text>
          </Space>
        }
      />
    </List.Item>
  );
};

export const PromptInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PromptAnalysisResponse | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  
  if (loading) {
    return (
      <Card size="small" style={{ textAlign: 'center' }}>
        <Spin size="small" />
      </Card>
    );
  }
  
  if (error || !data || data.projects.length === 0) {
    return null;
  }
  
  const selectedProjectData = data.projects.find(p => p.projectPath === selectedProject);
  const classifications = selectedProjectData?.analysisData?.classifications || [];
  const totalPrompts = classifications.reduce((sum, c) => sum + c.prompt_count, 0);
  const displayedClassifications = showAll ? classifications : classifications.slice(0, 3);
  
  return (
    <Card
      size="small"
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#D4A574' }} />
          <Text strong>Workflow Automation Opportunities</Text>
          <Tag>{totalPrompts} prompts analyzed</Tag>
        </Space>
      }
      extra={
        <Space>
          {data.projects.length > 1 && (
            <Select
              size="small"
              value={selectedProject || ''}
              onChange={setSelectedProject}
              style={{ width: 150 }}
              options={data.projects.map(project => ({
                label: project.projectName.replace('Cc Birdee', '').trim(),
                value: project.projectPath
              }))}
            />
          )}
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={fetchPromptInsights}
            loading={loading}
          />
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <List
        dataSource={displayedClassifications}
        renderItem={(classification) => (
          <InsightItem
            key={classification.topic_id}
            classification={classification}
          />
        )}
        footer={
          classifications.length > 3 && (
            <div style={{ textAlign: 'center', padding: 8 }}>
              <Button
                type="link"
                size="small"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? '← Show less' : `Show ${classifications.length - 3} more →`}
              </Button>
            </div>
          )
        }
      />
    </Card>
  );
};