'use client';

import React from 'react';
import { ConfigProvider, theme } from 'antd';

const { darkAlgorithm, defaultAlgorithm } = theme;

export const antdTheme = {
  token: {
    colorPrimary: '#D4A574',
    colorBgContainer: '#ffffff',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f9fafb',
      siderBg: '#ffffff',
    },
    Card: {
      paddingLG: 24,
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(212, 165, 116, 0.1)',
    },
    Tabs: {
      inkBarColor: '#D4A574',
      itemActiveColor: '#D4A574',
      itemSelectedColor: '#D4A574',
    },
  },
};

export const AntdThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ConfigProvider
      theme={{
        ...antdTheme,
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
};