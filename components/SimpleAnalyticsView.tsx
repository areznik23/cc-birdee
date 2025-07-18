'use client';

import React from 'react';

interface AnalyticsItem {
  title: string;
  description: string;
}

interface SimpleAnalyticsProps {
  strengths: AnalyticsItem[];
  weaknesses: AnalyticsItem[];
  tips: AnalyticsItem[];
  isLoading?: boolean;
}

export default function SimpleAnalyticsView({ strengths, weaknesses, tips, isLoading }: SimpleAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#D4A574' }}></div>
      </div>
    );
  }

  const sections = [
    { 
      title: 'Strengths', 
      items: strengths,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    { 
      title: 'Areas to Improve', 
      items: weaknesses,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      title: 'Recommendations', 
      items: tips,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div
          key={section.title}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <span style={{ color: '#D4A574' }}>{section.icon}</span>
            {section.title}
          </h3>
          <div className="space-y-3">
            {section.items.map((item, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 group"
              >
                <div className="flex-shrink-0 mt-1.5">
                  <div 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: '#D4A574' }}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}