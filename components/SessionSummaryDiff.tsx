'use client';

import { ProcessedMessage } from '@/lib/types';
import { ACTIVITY_COLORS } from '@/lib/constants';
import { useState, useEffect } from 'react';

interface SessionSummaryDiffProps {
  messages: ProcessedMessage[];
  initialPrompt: ProcessedMessage | undefined;
}

export function SessionSummaryDiff({ messages, initialPrompt }: SessionSummaryDiffProps) {
  const [accomplishedSummary, setAccomplishedSummary] = useState<string>('');
  const [alignmentScore, setAlignmentScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [useOpenAI, setUseOpenAI] = useState(true);

  useEffect(() => {
    generateAccomplishmentSummary();
  }, [messages]);

  const generateAccomplishmentSummary = async () => {
    // Try OpenAI first, fall back to pattern matching if it fails
    if (useOpenAI && initialPrompt) {
      try {
        const response = await fetch('/api/sessions/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            initialPrompt: initialPrompt.content,
          }),
        });

        if (response.ok) {
          const { summary, alignmentScore } = await response.json();
          setAccomplishedSummary(summary);
          if (typeof alignmentScore === 'number') {
            setAlignmentScore(alignmentScore);
          }
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('OpenAI API failed, falling back to pattern matching:', error);
        setUseOpenAI(false);
      }
    }

    // Fallback to pattern-based analysis
    // Analyze the session to understand what was accomplished
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    
    // Track specific accomplishments
    const accomplishments = {
      filesCreated: new Set<string>(),
      filesModified: new Set<string>(),
      featuresImplemented: [],
      errorsFixed: [],
      toolsUsed: new Set<string>()
    };
    
    // Analyze messages for accomplishments
    messages.forEach((msg, index) => {
      // Track tools used
      msg.toolsUsed.forEach(tool => accomplishments.toolsUsed.add(tool));
      
      // Look for file operations
      if (msg.role === 'assistant') {
        // File creation patterns
        const createPatterns = [
          /created (?:new )?(?:file|component) (?:at )?([\/\w\-./]+\.\w+)/gi,
          /File created successfully at: ([\/\w\-./]+\.\w+)/gi,
          /Writing (?:new )?file to ([\/\w\-./]+\.\w+)/gi
        ];
        
        createPatterns.forEach(pattern => {
          const matches = [...msg.content.matchAll(pattern)];
          matches.forEach(match => {
            if (match[1]) accomplishments.filesCreated.add(match[1]);
          });
        });
        
        // File modification patterns
        const modifyPatterns = [
          /(?:updated|modified|edited) (?:file )?([\/\w\-./]+\.\w+)/gi,
          /The file ([\/\w\-./]+\.\w+) has been updated/gi,
          /Applied \d+ edits? to ([\/\w\-./]+\.\w+)/gi
        ];
        
        modifyPatterns.forEach(pattern => {
          const matches = [...msg.content.matchAll(pattern)];
          matches.forEach(match => {
            if (match[1] && !accomplishments.filesCreated.has(match[1])) {
              accomplishments.filesModified.add(match[1]);
            }
          });
        });
        
        // Feature implementation patterns
        const featurePatterns = [
          /(?:implemented|added|created) (?:a |the )?(.+?)(?:\.|$)/gi,
          /(?:I've |I )(?:updated|modified) (.+?) to (.+?)(?:\.|$)/gi
        ];
        
        featurePatterns.forEach(pattern => {
          const matches = [...msg.content.matchAll(pattern)];
          matches.forEach(match => {
            const feature = match[1]?.trim();
            if (feature && feature.length > 10 && feature.length < 100 && 
                !feature.includes('```') && !feature.includes('file')) {
              accomplishments.featuresImplemented.push(feature);
            }
          });
        });
      }
      
      // Track error fixes
      if (msg.activity === 'error_handling' && msg.role === 'user') {
        const nextMsg = messages[index + 1];
        if (nextMsg?.role === 'assistant' && nextMsg.content.toLowerCase().includes('fix')) {
          accomplishments.errorsFixed.push('Fixed ' + msg.content.slice(0, 50) + '...');
        }
      }
    });

    // Build a natural language summary
    let summary = '';
    
    if (accomplishments.filesCreated.size > 0) {
      const fileList = Array.from(accomplishments.filesCreated).map(f => f.split('/').pop()).join(', ');
      summary = `Created ${accomplishments.filesCreated.size} new file${accomplishments.filesCreated.size > 1 ? 's' : ''}: ${fileList}`;
    }
    
    if (accomplishments.filesModified.size > 0) {
      const modifiedCount = accomplishments.filesModified.size;
      const prefix = summary ? ' and modified' : 'Modified';
      summary += `${prefix} ${modifiedCount} existing file${modifiedCount > 1 ? 's' : ''}`;
    }
    
    if (accomplishments.featuresImplemented.length > 0) {
      const mainFeature = accomplishments.featuresImplemented[0];
      summary = summary ? `${summary} to ${mainFeature}` : `Implemented ${mainFeature}`;
    }
    
    if (accomplishments.errorsFixed.length > 0) {
      const errorCount = accomplishments.errorsFixed.length;
      const suffix = errorCount > 1 ? ` and fixed ${errorCount} errors` : ' and resolved an error';
      summary += suffix;
    }
    
    // Fallback if no specific accomplishments found
    if (!summary) {
      const activities = messages.filter(m => m.activity).map(m => m.activity);
      const uniqueActivities = new Set(activities);
      
      if (uniqueActivities.has('implementation')) {
        summary = 'Completed implementation work on the codebase';
      } else if (uniqueActivities.has('code_exploration')) {
        summary = 'Explored and analyzed the codebase structure';
      } else {
        summary = 'Analyzed and processed the request';
      }
    }

    setAccomplishedSummary(summary + '.');
    setLoading(false);
  };

  if (!initialPrompt) return null;

  // Helper function to get color based on alignment score
  const getAlignmentColor = (score: number) => {
    if (score >= 80) return '#A69B87'; // sage brown - excellent
    if (score >= 60) return '#B8956F'; // camel - good
    if (score >= 40) return '#D4A574'; // warm sand - partial
    if (score >= 20) return '#C08B7C'; // dusty rose - minimal
    return '#9B9186'; // warm gray - low
  };

  const getAlignmentLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Partial';
    if (score >= 20) return 'Minimal';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Alignment Score First */}
      {alignmentScore !== null && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Alignment
              </span>
            </div>
            
            {/* Compact progress bar */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-1000 ease-out rounded-full"
                  style={{ 
                    width: `${alignmentScore}%`,
                    backgroundColor: getAlignmentColor(alignmentScore)
                  }}
                />
              </div>
              <span 
                className="text-sm font-semibold min-w-[3rem] text-right"
                style={{ color: getAlignmentColor(alignmentScore) }}
              >
                {alignmentScore}%
              </span>
            </div>
          </div>
          
          <span 
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: `${getAlignmentColor(alignmentScore)}20`,
              color: getAlignmentColor(alignmentScore)
            }}
          >
            {getAlignmentLabel(alignmentScore)}
          </span>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Initial Request */}
        <div className="rounded-lg border relative" style={{
          height: '30rem',
          backgroundColor: `${ACTIVITY_COLORS.initial_question}20`,
          borderColor: `${ACTIVITY_COLORS.initial_question}40`
        }}>
          <h4 className="text-sm font-semibold flex items-center gap-2 sticky top-0 z-10 p-4 rounded-t-lg" style={{
            color: ACTIVITY_COLORS.initial_question,
            backgroundColor: `${ACTIVITY_COLORS.initial_question}30`
          }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Initial Request
          </h4>
          <div className="px-4 pb-4 pt-3 overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
            <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {initialPrompt.content}
            </p>
          </div>
        </div>

        {/* What Was Accomplished */}
        <div className="rounded-lg border relative" style={{
          height: '30rem',
          backgroundColor: `${ACTIVITY_COLORS.completion}20`,
          borderColor: `${ACTIVITY_COLORS.completion}40`
        }}>
          <h4 className="text-sm font-semibold flex items-center gap-2 sticky top-0 z-10 p-4 rounded-t-lg" style={{
            color: ACTIVITY_COLORS.completion,
            backgroundColor: `${ACTIVITY_COLORS.completion}30`
          }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What Was Accomplished
          </h4>
          <div className="px-4 pb-4 pt-3 overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
            {loading ? (
              <div className="flex items-center gap-3 text-lg text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Analyzing session...</span>
              </div>
            ) : (
              <>
                <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {accomplishedSummary}
                </p>
                {useOpenAI && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI-generated summary
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}