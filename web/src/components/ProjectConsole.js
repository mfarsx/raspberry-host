import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Terminal, 
  Square, 
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';

const ProjectConsole = ({ projectId, projectName, onClose }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to console server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from console server');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Console connected:', data.message);
      setTerminalOutput(prev => prev + `\n${data.message}\nConnected to ${data.containerName}\n$ `);
    });

    newSocket.on('output', (data) => {
      setTerminalOutput(prev => prev + data.data);
    });

    newSocket.on('error', (data) => {
      setTerminalOutput(prev => prev + `\n[ERROR] ${data.message}\n$ `);
    });

    newSocket.on('console_error', (data) => {
      setTerminalOutput(prev => prev + `\n[CONSOLE ERROR] ${data.message}\n$ `);
    });

    newSocket.on('session_end', (data) => {
      setTerminalOutput(prev => prev + `\n[SESSION ENDED] ${data.message}\n$ `);
      setIsConnected(false);
    });

    newSocket.on('pong', () => {
      // Handle pong response for connection health check
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    // Start console when socket is ready
    if (socket && isConnected && projectId) {
      socket.emit('start_console', {
        projectId,
        options: {
          shell: ['/bin/sh']
        }
      });
    }
  }, [socket, isConnected, projectId]);

  const sendCommand = (command) => {
    if (socket && isConnected && command.trim()) {
      // Add command to history
      setCommandHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      
      // Send command to console
      socket.emit('console_message', {
        projectId,
        type: 'input',
        data: command + '\n'
      });
      
      // Add command to output
      setTerminalOutput(prev => prev + command + '\n');
      setCurrentCommand('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Could implement tab completion here
    }
  };

  const clearTerminal = () => {
    setTerminalOutput('');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const stopConsole = () => {
    if (socket && projectId) {
      socket.emit('stop_console', { projectId });
    }
    onClose();
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalOutput]);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-black text-green-400 font-mono flex flex-col ${isFullscreen ? 'w-full h-full' : 'w-4/5 h-4/5 max-w-6xl'}`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-4">
            <Terminal size={20} />
            <div>
              <h3 className="text-lg font-semibold text-white">Console - {projectName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`status-indicator ${isConnected ? 'status-online' : 'status-offline'}`}></span>
                <span className="text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary btn-small"
              onClick={clearTerminal}
              title="Clear Terminal"
            >
              <RotateCcw size={14} />
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              className="btn btn-danger btn-small"
              onClick={stopConsole}
              title="Close Console"
            >
              <Square size={14} />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed"
          style={{ 
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.4'
          }}
        >
          <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
        </div>

        {/* Command Input */}
        <div className="border-t border-gray-700 bg-gray-900 p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-400">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-transparent text-green-400 outline-none font-mono"
              placeholder="Enter command..."
              disabled={!isConnected}
              autoFocus
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Use ↑/↓ arrows for command history • Tab for completion • Enter to execute
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectConsole;