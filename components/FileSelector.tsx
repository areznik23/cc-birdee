'use client';

import { useState, useEffect } from 'react';
import { FileInfo } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import { useSessions } from '@/lib/hooks/use-sessions';

interface FileSelectorProps {
  onFileSelect: (filePath: string) => void;
}

export function FileSelector({ onFileSelect }: FileSelectorProps) {
  const { files, loading, error, refetch } = useSessions();
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recency' | 'size'>('recency');

  // Filter files to only show those >= 300KB
  const MIN_FILE_SIZE = 300 * 1024; // 300KB in bytes
  const filteredFiles = files.filter(file => file.size >= MIN_FILE_SIZE);

  // Sort files based on selected option
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'size') {
      return b.size - a.size; // Largest first
    } else {
      // Sort by recency (most recent first)
      const dateA = new Date(a.lastModified).getTime();
      const dateB = new Date(b.lastModified).getTime();
      return dateB - dateA;
    }
  });

  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file.path);
    onFileSelect(file.path);
  };

  // Find common prefix among all file names
  const findCommonPrefix = (files: FileInfo[]): string => {
    if (files.length === 0) return '';
    if (files.length === 1) return '';
    
    const fileNames = files.map(f => f.name);
    let prefix = fileNames[0];
    
    // Find the longest common prefix
    for (let i = 1; i < fileNames.length; i++) {
      while (!fileNames[i].startsWith(prefix)) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix === '') return '';
      }
    }
    
    // Look for the next word boundary after the common prefix to include complete words
    // This handles cases like "Desktop-2024-11-29-" where we want to remove "Desktop-" too
    for (let i = prefix.length; i < fileNames[0].length; i++) {
      const char = fileNames[0][i];
      if (['-', '_', ' ', '.'].includes(char)) {
        // Check if all files have the same character at this position
        const extendedPrefix = fileNames[0].substring(0, i + 1);
        if (fileNames.every(name => name.startsWith(extendedPrefix))) {
          prefix = extendedPrefix;
        } else {
          break;
        }
      }
    }
    
    return prefix;
  };

  const commonPrefix = findCommonPrefix(sortedFiles);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${Math.floor(hours)} hours ago`;
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sessions
            </h2>
            {filteredFiles.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {filteredFiles.length} session{filteredFiles.length === 1 ? '' : 's'} available
              </p>
            )}
          </div>
          <button
            onClick={refetch}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
            title="Refresh sessions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Sort Controls */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortBy('recency')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                sortBy === 'recency'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent
              </div>
            </button>
            <button
              onClick={() => setSortBy('size')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                sortBy === 'size'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Size
              </div>
            </button>
          </div>
          
          {/* Filter indicator */}
          {files.length > filteredFiles.length && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              ≥300KB
            </span>
          )}
        </div>
      </div>

      {/* File List */}
      <div className="px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="text-center py-8 px-4">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {files.length === 0 
                ? "No sessions found"
                : "No large sessions"
              }
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {files.length === 0 
                ? "Start using Claude Code to generate logs"
                : `${files.length} file${files.length === 1 ? '' : 's'} under 300KB hidden`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
            {sortedFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => handleFileSelect(file)}
              className={`w-full group relative rounded-lg transition-all ${
                selectedFile === file.path
                  ? 'bg-amber-50/50 dark:bg-amber-900/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
              }`}
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Session name with better formatting */}
                    <p className={`text-sm font-medium truncate ${
                      selectedFile === file.path
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {(() => {
                        let displayName = file.name;
                        // Remove common prefix
                        if (commonPrefix && displayName.startsWith(commonPrefix)) {
                          displayName = displayName.substring(commonPrefix.length);
                        }
                        // Clean up the name
                        return displayName
                          .replace('.jsonl', '')
                          .replace(/-/g, ' ')
                          .trim() || file.name;
                      })()}
                    </p>
                    
                    {/* Meta information */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDate(file.lastModified)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedFile === file.path && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D4A574' }}></div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hover accent */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all ${
                selectedFile === file.path
                  ? ''
                  : 'bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
              }`} style={selectedFile === file.path ? { backgroundColor: '#D4A574' } : {}} />
            </button>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}