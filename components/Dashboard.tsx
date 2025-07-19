'use client';

import { useState } from 'react';
import { Layout, Tabs, Button, Card, Typography, Space, Spin, Alert, Row, Col } from 'antd';
import { FileSearchOutlined, BarChartOutlined } from '@ant-design/icons';
import { Session } from '@/lib/types';
import { FileSelector } from './FileSelector';
import { SessionDisplay } from './SessionDisplay';
import { AnalyticsPanel } from './AnalyticsPanel';
import { PromptInsights } from './PromptInsights';
import { Logo } from './Logo';
import { useParseSession } from '@/lib/hooks/use-sessions';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

export function Dashboard() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<'sessions' | 'analytics'>('sessions');
  const { parseSession, loading: parseLoading, error: parseError } = useParseSession();

  const handleFileSelect = async (filePath: string) => {
    setLoading(true);
    setSelectedSession(null);
    
    try {
      const result = await parseSession(filePath);
      if (result && result.sessions.length > 0) {
        setSelectedSession(result.sessions[0]);
      }
    } catch (err) {
      console.error('Failed to parse session:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Space align="center" style={{ height: '100%' }}>
          <Logo width={40} height={40} />
          <Title level={3} style={{ margin: 0 }}>CC-Birdee</Title>
          <Text type="secondary">Fly between branches with Claude Code</Text>
        </Space>
      </Header>
      
      <Layout>
        <Content style={{ padding: '24px', marginTop: '64px' }}>
          {/* Prompt Insights Card */}
          <Card style={{ marginBottom: 24, borderColor: '#D4A574' }}>
            <PromptInsights />
          </Card>

          {/* Main Content Tabs */}
          <Tabs 
            activeKey={activeView} 
            onChange={(key) => setActiveView(key as 'sessions' | 'analytics')}
            size="large"
            tabBarStyle={{ marginBottom: 24 }}
          >
            <TabPane 
              tab={
                <span>
                  <FileSearchOutlined />
                  Sessions
                </span>
              } 
              key="sessions"
            >
              <Layout style={{ background: 'transparent' }}>
                <Sider 
                  width={320} 
                  breakpoint="lg"
                  collapsedWidth="0"
                  onCollapse={setCollapsed}
                  style={{ 
                    background: '#fff',
                    borderRadius: 8,
                    marginRight: 24
                  }}
                >
                  <div style={{ padding: 16 }}>
                    <FileSelector onFileSelect={handleFileSelect} />
                  </div>
                </Sider>
                
                <Content>
                  {loading || parseLoading ? (
                    <Card style={{ textAlign: 'center', padding: 40 }}>
                      <Space>
                        <Spin size="large" />
                        <Text>Analyzing session...</Text>
                      </Space>
                    </Card>
                  ) : parseError ? (
                    <Alert
                      message="Error"
                      description={parseError}
                      type="error"
                      showIcon
                    />
                  ) : selectedSession ? (
                    <SessionDisplay session={selectedSession} />
                  ) : (
                    <Card style={{ textAlign: 'center', padding: 40 }}>
                      <Text type="secondary">
                        Select a session file to begin analysis
                      </Text>
                    </Card>
                  )}
                </Content>
              </Layout>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <BarChartOutlined />
                  Analytics
                </span>
              } 
              key="analytics"
            >
              <AnalyticsPanel userId="default-user" />
            </TabPane>
          </Tabs>
        </Content>
      </Layout>
    </Layout>
  );
}