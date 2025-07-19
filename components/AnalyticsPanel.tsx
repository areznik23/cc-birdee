'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Checkbox, Space, Spin, Alert, Empty, Typography, Modal, List } from 'antd';
import { ReloadOutlined, BarChartOutlined, SyncOutlined } from '@ant-design/icons';
import SimpleAnalyticsView from './SimpleAnalyticsView';

const { Text, Title } = Typography;

interface AnalyticsPanelProps {
  userId?: string;
}

interface SimpleAnalytics {
  strengths: Array<{ title: string; description: string; icon?: string }>;
  weaknesses: Array<{ title: string; description: string; icon?: string }>;
  tips: Array<{ title: string; description: string; icon?: string }>;
}

export function AnalyticsPanel({ userId = 'default-user' }: AnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<SimpleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useCached, setUseCached] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    console.log('AnalyticsPanel: Loading analytics for user:', userId);
    // Try to load cached data first
    const cached = loadFromLocalStorage();
    if (cached && useCached) {
      setAnalytics(cached.data);
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
    } else {
      fetchAnalytics();
    }
  }, [userId, useCached]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/analytics/simple?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
      // Save to local storage
      saveToLocalStorage(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = (): { data: SimpleAnalytics; timestamp: string } | null => {
    try {
      const stored = localStorage.getItem(`analytics_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  };

  const saveToLocalStorage = (data: SimpleAnalytics) => {
    try {
      localStorage.setItem(`analytics_${userId}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  if (loading) {
    return (
      <Card style={{ minHeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Space>
          <Spin size="large" />
          <Text>Generating analytics report...</Text>
        </Space>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Analytics"
        description={error}
        type="error"
        showIcon
        action={
          <Button type="primary" size="small" danger onClick={fetchAnalytics}>
            Retry
          </Button>
        }
      />
    );
  }

  // Check if we have analytics data or need to prompt for processing
  const hasAnalytics = analytics && (
    analytics.strengths[0]?.title !== 'Getting Started' ||
    analytics.strengths.length > 1
  );

  if (!hasAnalytics) {
    return (
      <Card style={{ minHeight: 500 }}>
        <Empty
          image={<BarChartOutlined style={{ fontSize: 64, color: '#D4A574' }} />}
          imageStyle={{ height: 64 }}
          description={
            <Space direction="vertical" size="large" style={{ marginTop: 24 }}>
              <Title level={3}>Welcome to Analytics</Title>
              <Text>Get insights into your coding patterns, strengths, and growth opportunities by analyzing your Claude Code sessions.</Text>
              <ProcessSessionsButton userId={userId} onProcessComplete={fetchAnalytics} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Your session data will be processed locally to generate personalized insights
              </Text>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Header Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              <BarChartOutlined style={{ marginRight: 8 }} />
              Coding Analytics
            </Title>
            <Text type="secondary">
              Personalized insights from your Claude Code sessions
            </Text>
            {lastUpdated && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Last updated: {lastUpdated.toLocaleString()}
                </Text>
              </div>
            )}
          </div>
          <Space direction="vertical" align="end">
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  setUseCached(false);
                  fetchAnalytics();
                }}
              >
                Refresh
              </Button>
              <ProcessSessionsButton userId={userId} onProcessComplete={fetchAnalytics} />
            </Space>
            <Checkbox
              checked={useCached}
              onChange={(e) => setUseCached(e.target.checked)}
            >
              Use cached data
            </Checkbox>
          </Space>
        </div>
      </Card>

      {/* Session Analysis Card */}
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>Session Analysis</span>
          </Space>
        }
      >
        <SimpleAnalyticsView
          strengths={analytics?.strengths || []}
          weaknesses={analytics?.weaknesses || []}
          tips={analytics?.tips || []}
          isLoading={loading}
        />
      </Card>
    </Space>
  );
}

// Process Sessions Button Component
function ProcessSessionsButton({ userId, onProcessComplete }: { userId: string; onProcessComplete: () => void }) {
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);

  const fetchAvailableFiles = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setAvailableFiles(data.files || []);
      setShowModal(true);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const processSessions = async () => {
    if (selectedFiles.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionPaths: selectedFiles,
          userId,
          analysisDepth: 'standard'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Processing complete:', result.summary);
        setShowModal(false);
        setSelectedFiles([]);
        // Small delay to show completion before refreshing
        setTimeout(() => {
          onProcessComplete();
        }, 500);
      } else {
        const error = await response.json();
        console.error('Processing failed:', error);
        alert(`Failed to process sessions: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to process sessions:', error);
      alert('Failed to process sessions. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<SyncOutlined />}
        onClick={fetchAvailableFiles}
        style={{ backgroundColor: '#D4A574', borderColor: '#D4A574' }}
      >
        Process Sessions
      </Button>

      <Modal
        title="Select Sessions to Process"
        open={showModal}
        onCancel={() => setShowModal(false)}
        width={700}
        footer={[
          <Button key="selectAll" type="link" onClick={() => setSelectedFiles(availableFiles.map(f => f.path))}>
            Select All
          </Button>,
          <Button key="cancel" onClick={() => setShowModal(false)}>
            Cancel
          </Button>,
          <Button
            key="process"
            type="primary"
            loading={processing}
            disabled={selectedFiles.length === 0}
            onClick={processSessions}
          >
            {processing ? 'Processing...' : `Process ${selectedFiles.length} Sessions`}
          </Button>
        ]}
      >
        {availableFiles.length === 0 ? (
          <Empty description="No session files found" />
        ) : (
          <List
            dataSource={availableFiles}
            renderItem={(file) => (
              <List.Item>
                <Checkbox
                  checked={selectedFiles.includes(file.path)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFiles([...selectedFiles, file.path]);
                    } else {
                      setSelectedFiles(selectedFiles.filter(f => f !== file.path));
                    }
                  }}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>{file.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {(file.size / 1024).toFixed(1)} KB • {new Date(file.lastModified).toLocaleDateString()}
                    </Text>
                  </Space>
                </Checkbox>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  );
}