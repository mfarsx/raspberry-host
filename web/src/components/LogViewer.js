import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, 
  Square, 
  Filter, 
  Download, 
  Trash2, 
  Search,
  Pause,
  RotateCcw
} from 'lucide-react';

const LogViewer = ({ projectId, projectName, onClose }) => {
  const [socket, setSocket] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    keyword: '',
    stream: '',
    container: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [maxLines, setMaxLines] = useState(1000);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to log streaming server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from log streaming server');
      setIsStreaming(false);
    });

    newSocket.on('log', (data) => {
      if (!isPaused) {
        setLogs(prevLogs => {
          const newLogs = [...prevLogs, data];
          // Keep only the last maxLines logs
          return newLogs.slice(-maxLines);
        });
      }
    });

    newSocket.on('log_stream_error', (data) => {
      console.error('Log stream error:', data.message);
      setIsStreaming(false);
    });

    newSocket.on('log_stream_stopped', () => {
      setIsStreaming(false);
    });

    newSocket.on('warning', (data) => {
      console.warn('Log stream warning:', data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const startStreaming = () => {
    if (socket && projectId) {
      socket.emit('start_log_stream', {
        projectId,
        options: {
          tail: 100,
          follow: true,
          timestamps: true
        }
      });
      setIsStreaming(true);
      setIsPaused(false);
    }
  };

  const stopStreaming = () => {
    if (socket && projectId) {
      socket.emit('stop_log_stream', { projectId });
      setIsStreaming(false);
      setIsPaused(false);
    }
  };

  const pauseStreaming = () => {
    if (socket && projectId) {
      socket.emit('log_stream_message', {
        projectId,
        type: 'pause'
      });
      setIsPaused(true);
    }
  };

  const resumeStreaming = () => {
    if (socket && projectId) {
      socket.emit('log_stream_message', {
        projectId,
        type: 'resume'
      });
      setIsPaused(false);
    }
  };

  const applyFilters = () => {
    if (socket && projectId) {
      socket.emit('log_stream_message', {
        projectId,
        type: 'filter',
        ...filters
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.container}] [${log.stream}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    return log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
           log.container.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getLogLevel = (message) => {
    const msg = message.toLowerCase();
    if (msg.includes('error') || msg.includes('fatal')) return 'error';
    if (msg.includes('warn')) return 'warning';
    if (msg.includes('info')) return 'info';
    if (msg.includes('debug')) return 'debug';
    return 'default';
  };

  const getLogColor = (stream, level) => {
    if (stream === 'stderr') return 'text-red-400';
    if (level === 'error') return 'text-red-400';
    if (level === 'warning') return 'text-yellow-400';
    if (level === 'info') return 'text-blue-400';
    if (level === 'debug') return 'text-gray-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Live Logs - {projectName}</h3>
            <div className="flex items-center gap-4 mt-2">
              <span className={`status-indicator ${isStreaming ? 'status-online' : 'status-offline'}`}></span>
              <span className="text-sm">
                {isStreaming ? (isPaused ? 'Paused' : 'Streaming') : 'Stopped'}
              </span>
              <span className="text-sm text-gray-500">
                {logs.length} logs
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Stream Controls */}
            <div className="flex gap-2">
              {!isStreaming ? (
                <button
                  className="btn btn-success btn-small"
                  onClick={startStreaming}
                  title="Start Streaming"
                >
                  <Play size={14} />
                </button>
              ) : (
                <button
                  className="btn btn-warning btn-small"
                  onClick={stopStreaming}
                  title="Stop Streaming"
                >
                  <Square size={14} />
                </button>
              )}
              
              {isStreaming && (
                <>
                  {!isPaused ? (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={pauseStreaming}
                      title="Pause"
                    >
                      <Pause size={14} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-info btn-small"
                      onClick={resumeStreaming}
                      title="Resume"
                    >
                      <Play size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Log Actions */}
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-small"
                onClick={clearLogs}
                title="Clear Logs"
              >
                <Trash2 size={14} />
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={downloadLogs}
                title="Download Logs"
              >
                <Download size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ width: '200px' }}
              />
            </div>

            {/* Auto-scroll toggle */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span className="text-sm">Auto-scroll</span>
            </label>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium">Filters:</span>
            
            <input
              type="text"
              placeholder="Level (error, warn, info, debug)"
              value={filters.level}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
              className="form-input"
              style={{ width: '150px' }}
            />
            
            <input
              type="text"
              placeholder="Keyword"
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="form-input"
              style={{ width: '150px' }}
            />
            
            <select
              value={filters.stream}
              onChange={(e) => setFilters(prev => ({ ...prev, stream: e.target.value }))}
              className="form-input"
              style={{ width: '120px' }}
            >
              <option value="">All Streams</option>
              <option value="stdout">stdout</option>
              <option value="stderr">stderr</option>
            </select>
            
            <button
              className="btn btn-primary btn-small"
              onClick={applyFilters}
            >
              <Filter size={14} />
            </button>
          </div>
        </div>

        {/* Logs Display */}
        <div 
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto bg-black text-green-400 font-mono text-sm p-4"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {isStreaming ? 'Waiting for logs...' : 'No logs available. Start streaming to see logs.'}
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const level = getLogLevel(log.message);
              const colorClass = getLogColor(log.stream, level);
              
              return (
                <div key={index} className="mb-1 flex">
                  <span className="text-gray-500 mr-2 flex-shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span className="text-blue-400 mr-2 flex-shrink-0">
                    [{log.container}]
                  </span>
                  <span className={`mr-2 flex-shrink-0 ${log.stream === 'stderr' ? 'text-red-400' : 'text-green-400'}`}>
                    [{log.stream}]
                  </span>
                  <span className={colorClass}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default LogViewer;