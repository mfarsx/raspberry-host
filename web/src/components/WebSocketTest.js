import React, { useState, useEffect } from 'react';

const WebSocketTest = ({ socket, connected }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    if (socket) {
      // Listen for various socket events
      socket.on('message', (data) => {
        setMessages(prev => [...prev, { 
          type: 'received', 
          content: JSON.stringify(data), 
          timestamp: new Date().toLocaleTimeString() 
        }]);
      });

      socket.on('echo', (data) => {
        setMessages(prev => [...prev, { 
          type: 'echo', 
          content: JSON.stringify(data), 
          timestamp: new Date().toLocaleTimeString() 
        }]);
      });

      socket.on('stats', (data) => {
        setTestResults(prev => [...prev, { 
          type: 'stats',
          status: 'success',
          message: `Connected clients: ${data.connectedClients}`,
          latency: null,
          timestamp: new Date().toLocaleTimeString() 
        }]);
      });

      socket.on('pong', (data) => {
        setTestResults(prev => [...prev, { 
          type: 'ping',
          status: 'success',
          message: 'Pong received',
          latency: Date.now() - data.timestamp,
          timestamp: new Date().toLocaleTimeString() 
        }]);
      });

      socket.on('error', (error) => {
        setMessages(prev => [...prev, { 
          type: 'error', 
          content: `Error: ${error.message}`, 
          timestamp: new Date().toLocaleTimeString() 
        }]);
      });

      return () => {
        socket.off('message');
        socket.off('echo');
        socket.off('stats');
        socket.off('pong');
        socket.off('error');
      };
    }
  }, [socket]);

  const sendMessage = () => {
    if (socket && connected && messageInput.trim()) {
      socket.emit('message', { message: messageInput });
      setMessages(prev => [...prev, { 
        type: 'sent', 
        content: messageInput, 
        timestamp: new Date().toLocaleTimeString() 
      }]);
      setMessageInput('');
    }
  };

  const runTest = (testType) => {
    if (socket && connected) {
      if (testType === 'ping') {
        socket.emit('ping');
      } else if (testType === 'echo') {
        socket.emit('echo', { message: 'Echo test message' });
      } else if (testType === 'latency') {
        socket.emit('stats');
      }
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setTestResults([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="card">
      <h2>🔌 WebSocket Test</h2>
      
      <div className="websocket-status">
        <div className="status-section">
          <h3>Connection Status</h3>
          <div className="status-indicator">
            <span className={`status-indicator ${connected ? 'status-online' : 'status-offline'}`}></span>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {socket && (
            <div className="connection-info">
              <p><strong>Socket ID:</strong> {socket.id || 'N/A'}</p>
              <p><strong>Transport:</strong> {socket.io?.engine?.transport?.name || 'N/A'}</p>
              <p><strong>URL:</strong> {socket.io?.uri || 'N/A'}</p>
              <p><strong>Ready State:</strong> {socket.io?.engine?.readyState || 'N/A'}</p>
            </div>
          )}
        </div>

        <div className="test-section">
          <h3>Quick Tests</h3>
          <div className="test-buttons">
            <button 
              className="btn btn-secondary" 
              onClick={() => runTest('ping')}
              disabled={!connected}
            >
              Ping Test
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => runTest('echo')}
              disabled={!connected}
            >
              Echo Test
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => runTest('latency')}
              disabled={!connected}
            >
              Stats Test
            </button>
          </div>
        </div>
      </div>

      <div className="message-section">
        <h3>Send Message</h3>
        <div className="message-input">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!connected}
            className="input-field"
          />
          <button 
            className="btn btn-primary" 
            onClick={sendMessage}
            disabled={!connected || !messageInput.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <div className="messages-section">
        <div className="messages-header">
          <h3>Messages</h3>
          <button className="btn btn-small" onClick={clearMessages}>
            Clear
          </button>
        </div>
        
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages yet. Send a message or run a test to see activity.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                <div className="message-header">
                  <span className="message-type">{msg.type.toUpperCase()}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="test-results-section">
          <h3>Test Results</h3>
          <div className="test-results">
            {testResults.map((result, index) => (
              <div key={index} className="test-result">
                <div className="test-result-header">
                  <span className="test-type">{result.type}</span>
                  <span className="test-time">{result.timestamp}</span>
                </div>
                <div className="test-result-content">
                  <p><strong>Status:</strong> {result.status}</p>
                  {result.latency && <p><strong>Latency:</strong> {result.latency}ms</p>}
                  {result.message && <p><strong>Message:</strong> {result.message}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketTest;