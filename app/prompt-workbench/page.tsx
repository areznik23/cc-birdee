'use client';

import { useState, useEffect } from 'react';
import { Layout, Button, Input, Space, Card, Typography, Spin, Alert, Form, Tag, Modal } from 'antd';
import { CopyOutlined, ThunderboltOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { AppHeader } from '@/components/AppHeader';
import { useTerminal } from '@/lib/hooks/use-terminal';
import { useClaudeJob } from '@/lib/hooks/use-claude-job';

const { Content } = Layout;
const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

export default function PromptWorkbench() {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [error, setError] = useState('');
  const [context, setContext] = useState<Record<string, string>>({});
  const [useClaudeForContext, setUseClaudeForContext] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string[]>([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logContent, setLogContent] = useState<any>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const { gatherContext, loading: terminalLoading } = useTerminal();
  const { executeClaude, loading: claudeLoading, currentJob, statusHistory, cleanup } = useClaudeJob();

  const addStatus = (status: string) => {
    setExecutionStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${status}`]);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleEnhance = async () => {
    if (!task.trim()) return;

    setLoading(true);
    setError('');
    setQuestions([]);
    setEnhancedPrompt('');
    setAnswers({});
    setExecutionStatus([]);

    try {
      // Gather context based on user preference
      let gatheredContext = {};
      
      if (useClaudeForContext) {
        // Ask Claude what context is needed
        addStatus('🤖 Asking Claude to analyze context requirements...');
        addStatus('📋 Using headless mode: claude -p [prompt]');
        
        // Build context analysis prompt
        const contextPrompt = `I'm working on a Next.js application and need help understanding what context I should gather for the following task:

Task: "${task}"

Please analyze this task and tell me:
1. What files or code should I examine?
2. What existing implementation details are relevant?
3. What design patterns or architecture decisions should be considered?
4. Are there any dependencies or integrations to be aware of?

Please provide a comprehensive list of all the context that should be gathered before implementing this task.`;
        
        try {
          const result = await executeClaude(contextPrompt, {
            onStatusUpdate: (status) => addStatus(`🔄 ${status}`),
            allowedTools: 'Edit,Bash(git:*),Bash(npm:test*)',
            maxTurns: 3,
          });
          
          if (result.output) {
            addStatus('✅ Claude analysis complete');
            addStatus('📝 Claude\'s response:');
            // Split response into lines and show first few
            const lines = result.output.split('\n').filter(line => line.trim());
            lines.slice(0, 5).forEach(line => {
              addStatus(`    ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
            });
            if (lines.length > 5) {
              addStatus(`    ... (${lines.length - 5} more lines)`);
            }
            gatheredContext = { claudeAnalysis: result.output };
          }
        } catch (error) {
          console.error('Claude context gathering failed:', error);
          addStatus('❌ Failed to gather context from Claude');
        }
      } else {
        // Gather terminal context
        addStatus('🔍 Gathering terminal context...');
        gatheredContext = await gatherContext();
        addStatus('✅ Terminal context gathered');
        
        // Show what was gathered
        if (gatheredContext.gitBranch) {
          addStatus(`  📌 Git branch: ${gatheredContext.gitBranch}`);
        }
        if (gatheredContext.gitStatus) {
          addStatus(`  📋 Git status: ${gatheredContext.gitStatus || 'clean'}`);
        }
        if (gatheredContext.currentDirectory) {
          addStatus(`  📁 Directory: ${gatheredContext.currentDirectory}`);
        }
        if (gatheredContext.files) {
          const fileList = gatheredContext.files.split('\n').slice(0, 3).join(', ');
          addStatus(`  📄 Files: ${fileList}...`);
        }
      }
      
      setContext(gatheredContext);

      addStatus('🔮 Sending to O3 for context question generation...');
      const response = await fetch('/api/prompt-workbench/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context: gatheredContext }),
      });

      if (!response.ok) throw new Error('Failed to enhance prompt');

      const data = await response.json();
      setQuestions(data.questions || []);
      addStatus(`✅ Generated ${data.questions?.length || 0} context questions`);
      
      // Store the template for later use
      sessionStorage.setItem('promptTemplate', data.template);
      addStatus('✨ Ready for your input!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      addStatus(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFinalPrompt = () => {
    const template = sessionStorage.getItem('promptTemplate') || '';
    let finalPrompt = template;

    // Replace placeholders with answers
    Object.entries(answers).forEach(([index, answer]) => {
      finalPrompt = finalPrompt.replace(`{${index}}`, answer);
    });

    // Add terminal context as a footer if available
    if (Object.keys(context).length > 0) {
      finalPrompt += '\n\n---\nEnvironment Context:\n';
      if (context.gitBranch) finalPrompt += `- Git branch: ${context.gitBranch}\n`;
      if (context.gitStatus) finalPrompt += `- Git status: ${context.gitStatus || 'clean'}\n`;
      if (context.currentDirectory) finalPrompt += `- Working directory: ${context.currentDirectory}\n`;
    }

    setEnhancedPrompt(finalPrompt);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(enhancedPrompt);
  };

  const allQuestionsAnswered = questions.length > 0 && 
    questions.every((_, index) => answers[index]?.trim());

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Content style={{ padding: '24px', marginTop: '64px' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <Title level={2}>Prompt Workbench</Title>
            <Paragraph className="text-muted-foreground">
              Transform simple requests into comprehensive prompts that eliminate Claude's follow-up questions
            </Paragraph>
          </div>

        {/* Task Input */}
        <Card>
          <Space direction="vertical" size="middle" className="w-full">
            <Text strong>What do you want Claude to help with?</Text>
            <TextArea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g., fix the API endpoint, add dark mode to settings, refactor the user service..."
              rows={3}
              className="w-full"
            />
            <Space>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleEnhance}
                loading={loading || terminalLoading || claudeLoading}
                disabled={!task.trim()}
                size="large"
              >
                Enhance with Context
              </Button>
              <Button
                type={useClaudeForContext ? 'primary' : 'default'}
                onClick={() => setUseClaudeForContext(!useClaudeForContext)}
              >
                {useClaudeForContext ? 'Using Claude' : 'Using Terminal'}
              </Button>
            </Space>
            {Object.keys(context).length > 0 && (
              <Space size={[0, 8]} wrap>
                <Text type="secondary">Gathered context:</Text>
                {context.gitBranch && <Tag icon={<CheckCircleOutlined />} color="success">Git: {context.gitBranch}</Tag>}
                {context.currentDirectory && <Tag icon={<CheckCircleOutlined />} color="processing">Dir: {context.currentDirectory.split('/').pop()}</Tag>}
                {context.claudeAnalysis && <Tag icon={<CheckCircleOutlined />} color="blue">Claude analyzed context</Tag>}
              </Space>
            )}
          </Space>
        </Card>

        {/* Execution Status */}
        {(executionStatus.length > 0 || statusHistory.length > 0) && (
          <Card 
            title="Execution Log" 
            size="small"
            extra={
              <Space>
                <Button 
                  size="small" 
                  onClick={async () => {
                    const res = await fetch('/api/claude/job/list');
                    const data = await res.json();
                    addStatus(`📊 Jobs: ${data.running} running, ${data.completed} completed, ${data.failed} failed`);
                  }}
                >
                  List Jobs
                </Button>
                {currentJob && (
                  <Button 
                    size="small" 
                    type="primary"
                    onClick={async () => {
                      const res = await fetch(`/api/claude/job/status/${currentJob.jobId}`);
                      const data = await res.json();
                      addStatus(`🔄 Job ${currentJob.jobId}: ${data.status}`);
                    }}
                  >
                    Refresh Status
                  </Button>
                )}
              </Space>
            }
            style={{ 
              backgroundColor: '#f5f5f5',
              borderColor: '#d9d9d9',
            }}
            bodyStyle={{
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '12px'
            }}
          >
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              {[...executionStatus, ...statusHistory].map((status, index) => (
                <Text 
                  key={index} 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '12px',
                    color: status.includes('❌') ? '#cf1322' : '#000',
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {status}
                </Text>
              ))}
            </Space>
          </Card>
        )}

        {/* Current Job Status */}
        {currentJob && (
          <Card 
            title="Claude Job Status" 
            size="small"
            extra={
              <Tag color={
                currentJob.status === 'running' ? 'processing' :
                currentJob.status === 'completed' ? 'success' :
                currentJob.status === 'failed' ? 'error' : 'default'
              }>
                {currentJob.status}
              </Tag>
            }
            style={{ 
              backgroundColor: '#fafafa',
              borderColor: '#d9d9d9',
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text><strong>Job ID:</strong> {currentJob.jobId}</Text>
              {currentJob.executionTime && (
                <Text><strong>Execution Time:</strong> {(currentJob.executionTime / 1000).toFixed(1)}s</Text>
              )}
              <Button 
                size="small"
                icon={<FileTextOutlined />}
                loading={loadingLog}
                onClick={async () => {
                  setLoadingLog(true);
                  try {
                    const res = await fetch(`/api/claude/job/log/${currentJob.jobId}`);
                    const data = await res.json();
                    if (data.logFile) {
                      setLogContent(data);
                      setLogModalVisible(true);
                    } else if (data.error) {
                      addStatus(`⚠️ ${data.error}`);
                    }
                  } finally {
                    setLoadingLog(false);
                  }
                }}
                disabled={currentJob.status === 'pending'}
              >
                View Claude Session Log
              </Button>
              {currentJob.error && (
                <Alert message={currentJob.error} type="error" showIcon />
              )}
            </Space>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert message={error} type="error" showIcon closable onClose={() => setError('')} />
        )}

        {/* Context Questions */}
        {questions.length > 0 && (
          <Card title="Context Questions" className="animate-in fade-in slide-in-from-bottom-4">
            <Form layout="vertical">
              {questions.map((question, index) => (
                <Form.Item key={index} label={question}>
                  <TextArea
                    value={answers[index] || ''}
                    onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                    placeholder="Your answer..."
                    rows={2}
                  />
                </Form.Item>
              ))}
              <Button
                type="primary"
                onClick={handleGenerateFinalPrompt}
                disabled={!allQuestionsAnswered}
                className="mt-4"
              >
                Generate Enhanced Prompt
              </Button>
            </Form>
          </Card>
        )}

        {/* Enhanced Prompt */}
        {enhancedPrompt && (
          <Card 
            title="Enhanced Prompt" 
            className="animate-in fade-in slide-in-from-bottom-4"
            extra={
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                Copy
              </Button>
            }
          >
            <TextArea
              value={enhancedPrompt}
              readOnly
              rows={12}
              className="font-mono text-sm"
            />
          </Card>
        )}
        </div>
        
        {/* Log File Modal */}
        <Modal
          title={
            <Space>
              <FileTextOutlined />
              <Text>Claude Session Log</Text>
            </Space>
          }
          open={logModalVisible}
          onCancel={() => setLogModalVisible(false)}
          width={800}
          footer={[
            <Button key="close" onClick={() => setLogModalVisible(false)}>
              Close
            </Button>,
            <Button 
              key="copy" 
              icon={<CopyOutlined />} 
              onClick={() => {
                if (logContent?.logFile) {
                  navigator.clipboard.writeText(logContent.logFile);
                  addStatus('📋 Log file path copied to clipboard');
                }
              }}
            >
              Copy Path
            </Button>
          ]}
        >
          {logContent && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text code style={{ fontSize: '12px' }}>{logContent.logFile}</Text>
              <Text type="secondary">Total entries: {logContent.totalLines}</Text>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '16px' }}>
                {logContent.entries?.map((entry: any, index: number) => (
                  <Card 
                    key={index} 
                    size="small" 
                    style={{ marginBottom: '8px' }}
                    type={entry.message?.role === 'assistant' ? 'inner' : undefined}
                  >
                    {entry.message ? (
                      <>
                        <Tag color={entry.message.role === 'user' ? 'blue' : 'green'}>
                          {entry.message.role}
                        </Tag>
                        {entry.message.content && (
                          <Text style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                            {typeof entry.message.content === 'string' 
                              ? entry.message.content.substring(0, 500) 
                              : JSON.stringify(entry.message.content).substring(0, 500)}
                            {(typeof entry.message.content === 'string' ? entry.message.content : JSON.stringify(entry.message.content)).length > 500 && '...'}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={{ fontSize: '12px' }} type="secondary">
                        {JSON.stringify(entry).substring(0, 200)}...
                      </Text>
                    )}
                  </Card>
                ))}
              </div>
            </Space>
          )}
        </Modal>
      </Content>
    </Layout>
  );
}