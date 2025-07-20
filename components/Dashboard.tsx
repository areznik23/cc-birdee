'use client';

import { useState } from 'react';
import { Layout, Tabs, Card, Typography, Space, Spin, Alert } from 'antd';
import { FileSearchOutlined, BarChartOutlined } from '@ant-design/icons';
import { Session } from '@/lib/types';
import { FileSelector } from './FileSelector';
import { SessionDisplay } from './SessionDisplay';
import { AnalyticsPanel } from './AnalyticsPanel';
import { PromptInsights } from './PromptInsights';
import { AppHeader } from './AppHeader';
import { useParseSession } from '@/lib/hooks/use-sessions';

const { Content, Sider } = Layout;
const { Text } = Typography;

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
      <AppHeader />
      
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
            items={[
              {
                key: 'sessions',
                label: (
                  <span>
                    <FileSearchOutlined />
                    Sessions
                  </span>
                ),
                children: (
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
                )
              },
              {
                key: 'analytics',
                label: (
                  <span>
                    <BarChartOutlined />
                    Analytics
                  </span>
                ),
                children: <AnalyticsPanel userId="default-user" />
              }
            ]}
          />
        </Content>
      </Layout>
    </Layout>
  );
}