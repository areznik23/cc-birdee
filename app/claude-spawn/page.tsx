'use client'

import { useState, useEffect } from 'react'

interface LogFile {
  filename: string
  path: string
  timestamp: string
  size: number
  created: string
  modified: string
}

interface JobStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  prompt: string
  output: string
  error?: string
  startTime: string
  endTime?: string
  processInfo?: {
    pid?: number
    exitCode?: number
  }
  logFile?: string
  executionTime?: string
}

export default function ClaudeSpawnPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [logs, setLogs] = useState<LogFile[]>([])
  const [isSpawning, setIsSpawning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any>(null)

  const spawnJob = async (customPrompt?: string) => {
    setIsSpawning(true)
    setError(null)
    setJobStatus(null)
    try {
      const prompt = customPrompt || 'What is 2 + 2?'
      const response = await fetch('/api/claude/job/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to spawn: ${response.statusText}`)
      }
      
      const data = await response.json()
      setJobId(data.jobId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to spawn job')
      console.error('Failed to spawn job:', error)
    } finally {
      setIsSpawning(false)
    }
  }

  const pollJobStatus = async () => {
    if (!jobId) return
    
    try {
      const response = await fetch(`/api/claude/job/status/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setJobStatus(data)
      }
    } catch (error) {
      console.error('Failed to poll job status:', error)
    }
  }

  const pollLogs = async () => {
    try {
      const response = await fetch('/api/claude/job/logs')
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Failed to poll logs:', error)
    }
  }

  const runClaudeTest = async () => {
    try {
      const response = await fetch('/api/claude/test')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Failed to run test:', error)
    }
  }

  const parseHelp = async () => {
    try {
      const response = await fetch('/api/claude/help-parse')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Failed to parse help:', error)
    }
  }

  // Poll logs continuously
  useEffect(() => {
    pollLogs()
    const interval = setInterval(pollLogs, 1000)
    return () => clearInterval(interval)
  }, [])

  // Poll job status when we have a jobId
  useEffect(() => {
    if (jobId) {
      pollJobStatus()
      const interval = setInterval(pollJobStatus, 500)
      return () => clearInterval(interval)
    }
  }, [jobId])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-50'
      case 'completed': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Claude Code Job Spawner</h1>
      
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => spawnJob()}
            disabled={isSpawning}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
          >
            {isSpawning ? 'Spawning...' : 'Test 2+2'}
          </button>
          
          <button
            onClick={async () => {
              setIsSpawning(true)
              try {
                const response = await fetch('/api/claude/job/execute-simple', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: 'What is the capital of France?' })
                })
                const data = await response.json()
                setJobId(data.jobId)
              } catch (error) {
                setError('Failed to test simple')
              } finally {
                setIsSpawning(false)
              }
            }}
            disabled={isSpawning}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400 text-sm"
          >
            Test All Syntaxes
          </button>
          
          <button
            onClick={async () => {
              setIsSpawning(true)
              try {
                const response = await fetch('/api/claude/job/execute-stdin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: 'echo "Testing Claude stdin"' })
                })
                const data = await response.json()
                setJobId(data.jobId)
              } catch (error) {
                setError('Failed to test stdin')
              } finally {
                setIsSpawning(false)
              }
            }}
            disabled={isSpawning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 text-sm"
          >
            Test Stdin
          </button>
          
          <button
            onClick={() => spawnJob('--help')}
            disabled={isSpawning}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 text-sm"
          >
            Test Help
          </button>
          
          <button
            onClick={runClaudeTest}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
          >
            Debug Claude CLI
          </button>
          
          <button
            onClick={parseHelp}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Parse Help
          </button>
        </div>
        
        {error && (
          <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg">
            Error: {error}
          </div>
        )}
        
        {testResults && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Claude CLI Debug Info:</h3>
            <pre className="text-xs font-mono overflow-x-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Job Status Panel */}
      {jobStatus && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Job Status</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-gray-600">Job ID:</span>
              <code className="ml-2 font-mono text-sm">{jobStatus.id}</code>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${getStatusColor(jobStatus.status)}`}>
                {jobStatus.status}
              </span>
            </div>
            {jobStatus.processInfo?.pid && (
              <div>
                <span className="text-gray-600">PID:</span>
                <span className="ml-2">{jobStatus.processInfo.pid}</span>
              </div>
            )}
            {jobStatus.executionTime && (
              <div>
                <span className="text-gray-600">Execution Time:</span>
                <span className="ml-2">{jobStatus.executionTime}</span>
              </div>
            )}
            {jobStatus.logFile && (
              <div className="col-span-2">
                <span className="text-gray-600">Log File:</span>
                <code className="ml-2 text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {jobStatus.logFile}
                </code>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1">Prompt:</h3>
            <div className="bg-gray-50 p-3 rounded font-mono text-sm">
              {jobStatus.prompt}
            </div>
          </div>

          {/* Output */}
          {jobStatus.output && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1">Output:</h3>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                {jobStatus.output || '(no output yet)'}
              </pre>
            </div>
          )}

          {/* Error */}
          {jobStatus.error && (
            <div>
              <h3 className="font-medium text-red-700 mb-1">Error:</h3>
              <pre className="bg-red-50 text-red-800 p-3 rounded font-mono text-sm overflow-x-auto">
                {jobStatus.error}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Log Files Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Log Files ({logs.length})</h2>
          <div className="text-sm text-gray-500">
            Auto-refreshing every second
          </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No log files found in ~/.claude/projects/-Users-alexanderreznik-Desktop-cc-birdee
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log, idx) => (
                    <tr key={log.filename} className={idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {formatTimestamp(log.timestamp)}
                        {idx === 0 && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Latest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {log.filename}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(log.size)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}