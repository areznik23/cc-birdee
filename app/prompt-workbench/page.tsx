'use client';

import { useState } from 'react';
import { Layout, Button, Input, Space, Card, Typography, Spin, Alert, Form, Tag } from 'antd';
import { CopyOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { AppHeader } from '@/components/AppHeader';
import { useTerminal } from '@/lib/hooks/use-terminal';
import { useClaude } from '@/lib/hooks/use-claude';

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
  const { gatherContext, loading: terminalLoading } = useTerminal();
  const { gatherContextFromClaude, loading: claudeLoading, lastResult: claudeResult } = useClaude();

  const addStatus = (status: string) => {
    setExecutionStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${status}`]);
  };

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
        addStatus('📋 Command: claude --dangerously-skip-permissions [prompt]');
        addStatus('📁 Working directory: /Users/alexanderreznik/Desktop/cc-birdee');
        addStatus('⏳ Claude is processing your request...');
        addStatus('⚠️ This may take 1-3 minutes for complex analysis');
        
        const startTime = Date.now();
        
        // Start a timer to show progress
        const progressInterval = setInterval(() => {
          const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
          addStatus(`⏱️ Still processing... (${elapsedTime}s elapsed)`);
        }, 15000); // Update every 15 seconds
        
        const claudeContext = await gatherContextFromClaude(task, (status) => {
          addStatus(`🔄 ${status}`);
        });
        
        // Stop the progress timer
        clearInterval(progressInterval);
        
        // Show execution details
        if (claudeResult) {
          if (claudeResult.executionTime) {
            const seconds = (claudeResult.executionTime / 1000).toFixed(1);
            addStatus(`✅ Claude responded in ${seconds} seconds`);
          }
          if (claudeResult.stdout && !claudeResult.response) {
            addStatus(`📤 Stdout: ${claudeResult.stdout.substring(0, 100)}...`);
          }
          if (claudeResult.stderr) {
            addStatus(`⚠️ Stderr: ${claudeResult.stderr}`);
          }
        }
        
        addStatus('✅ Claude analysis complete');
        if (claudeContext) {
          addStatus('📝 Claude\'s response:');
          // Split response into lines and show first few
          const lines = claudeContext.split('\n').filter(line => line.trim());
          lines.slice(0, 5).forEach(line => {
            addStatus(`    ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
          });
          if (lines.length > 5) {
            addStatus(`    ... (${lines.length - 5} more lines)`);
          }
        }
        gatheredContext = { claudeAnalysis: claudeContext };
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
        {executionStatus.length > 0 && (
          <Card 
            title="Execution Log" 
            size="small"
            extra={
              <Button 
                size="small" 
                onClick={async () => {
                  const res = await fetch('/api/claude/check');
                  const data = await res.json();
                  if (data.running) {
                    addStatus(`✅ Claude is running (${data.count} process${data.count > 1 ? 'es' : ''})`);
                    data.processes.forEach((p: any) => {
                      addStatus(`  PID: ${p.pid}, CPU: ${p.cpu}%, MEM: ${p.mem}%`);
                    });
                  } else {
                    addStatus('❌ No Claude processes found');
                  }
                }}
              >
                Check Status
              </Button>
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
              {executionStatus.map((status, index) => (
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
      </Content>
    </Layout>
  );
}