'use client';

import { Layout, Button, Space, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { Logo } from './Logo';
import { useRouter, usePathname } from 'next/navigation';

const { Header } = Layout;
const { Title, Text } = Typography;

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleWorkbenchClick = () => {
    if (pathname === '/prompt-workbench') {
      router.push('/');
    } else {
      router.push('/prompt-workbench');
    }
  };

  return (
    <Header style={{ 
      background: '#fff', 
      padding: '0 24px', 
      borderBottom: '1px solid #f0f0f0', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      position: 'fixed',
      top: 0,
      width: '100%',
      zIndex: 1000
    }}>
      <Space 
        align="center" 
        style={{ height: '100%', cursor: 'pointer' }}
        onClick={() => router.push('/')}
      >
        <Logo width={40} height={40} />
        <Title level={3} style={{ margin: 0 }}>CC-Birdee</Title>
        <Text type="secondary">Fly between branches with Claude Code</Text>
      </Space>
      <Button 
        type={pathname === '/prompt-workbench' ? 'default' : 'primary'}
        icon={<ThunderboltOutlined />}
        onClick={handleWorkbenchClick}
      >
        {pathname === '/prompt-workbench' ? 'Back to Dashboard' : 'Prompt Workbench'}
      </Button>
    </Header>
  );
}