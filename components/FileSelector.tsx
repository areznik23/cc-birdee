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

  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file.path);
    onFileSelect(file.path);
  };

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Session Files
        </h2>
        <button
          onClick={refetch}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
          No session files found. Start using Claude Code to generate logs.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => handleFileSelect(file)}
              className={`w-full text-left p-3 rounded-md transition-colors ${
                selectedFile === file.path
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(file.lastModified)}
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}