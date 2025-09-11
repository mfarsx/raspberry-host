import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import config from '../config/environment';

const WebSocketTest = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('WebSocketTest: Initializing connection to:', config.WS_URL);
    
    const newSocket = io(config.WS_URL, {
      transports: ["polling", "websocket"],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      randomizationFactor: 0.5,
      forceNew: true,
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('WebSocketTest: Connected successfully!', newSocket.id);
      setConnected(true);
      setError(null);
      setMessages(prev => [...prev, `Connected: ${newSocket.id}`]);
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocketTest: Connection error:', err);
      setError(err.message);
      setMessages(prev => [...prev, `Error: ${err.message}`]);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocketTest: Disconnected:', reason);
      setConnected(false);
      setMessages(prev => [...prev, `Disconnected: ${reason}`]);
    });

    newSocket.on('echo', (data) => {
      console.log('WebSocketTest: Echo received:', data);
      setMessages(prev => [...prev, `Echo: ${data.message}`]);
    });

    setSocket(newSocket);

    return () => {
      console.log('WebSocketTest: Cleaning up connection');
      newSocket.close();
    };
  }, []);

  const sendMessage = () => {
    if (socket && connected) {
      const message = `Test message ${Date.now()}`;
      console.log('WebSocketTest: Sending message:', message);
      socket.emit('echo', { message });
      setMessages(prev => [...prev, `Sent: ${message}`]);
    }
  };

  const sendPing = () => {
    if (socket && connected) {
      console.log('WebSocketTest: Sending ping');
      socket.emit('ping');
      setMessages(prev => [...prev, 'Sent: ping']);
    }
  };

  return (
    <div className="card">
      <h2>WebSocket Connection Test</h2>
      
      <div className="mb-4">
        <p><strong>Status:</strong> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </p>
        <p><strong>Server:</strong> {config.WS_URL}</p>
        {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
      </div>

      <div className="mb-4">
        <button 
          onClick={sendMessage}
          disabled={!connected}
          className="btn btn-primary mr-2"
        >
          Send Test Message
        </button>
        <button 
          onClick={sendPing}
          disabled={!connected}
          className="btn btn-secondary"
        >
          Send Ping
        </button>
      </div>

      <div className="mb-4">
        <h3>Messages:</h3>
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className="text-sm mb-1">
              <span className="text-gray-500">{new Date().toLocaleTimeString()}</span> - {msg}
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>This component tests the WebSocket connection to the API server.</p>
        <p>Check the browser console for detailed connection logs.</p>
      </div>
    </div>
  );
};

export default WebSocketTest;