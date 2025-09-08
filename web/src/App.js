import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import toast from 'react-hot-toast';

// Components
import DashboardRefactored from './components/DashboardRefactored';
import ProjectManagement from './components/ProjectManagement';
import DeployProject from './components/DeployProject';
import SystemInfo from './components/SystemInfo';
import WebSocketTest from './components/WebSocketTest';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  const [apiHealth, setApiHealth] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Check API health
    const checkHealth = async () => {
      try {
        const response = await axios.get('/api/health');
        setApiHealth(response.data);
      } catch (error) {
        setApiHealth({ ok: false, error: error.message });
        toast.error('API connection failed');
      }
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000); // Check every 30 seconds

    // Initialize WebSocket connection
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
    const newSocket = io(wsUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
      toast.success('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
      toast.error('WebSocket disconnected');
    });

    newSocket.on('message', (data) => {
      console.log('Received message:', data);
    });

    setSocket(newSocket);

    return () => {
      clearInterval(healthInterval);
      newSocket.close();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <nav className="container" style={{ paddingTop: '20px' }}>
            <div className="card">
              <h1 style={{ margin: '0 0 20px 0', color: '#333' }}>
                🍓 Raspberry Pi 5 Hosting Platform
              </h1>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
                  Dashboard
                </Link>
                <Link to="/projects" className="btn" style={{ textDecoration: 'none' }}>
                  Projects
                </Link>
                <Link to="/deploy" className="btn" style={{ textDecoration: 'none' }}>
                  Deploy Project
                </Link>
                <Link to="/websocket" className="btn" style={{ textDecoration: 'none' }}>
                  WebSocket Test
                </Link>
                <Link to="/system" className="btn" style={{ textDecoration: 'none' }}>
                  System Info
                </Link>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`status-indicator ${apiHealth?.ok ? 'status-online' : 'status-offline'}`}></span>
                  <span>API: {apiHealth?.ok ? 'Online' : 'Offline'}</span>
                  <span className={`status-indicator ${socketConnected ? 'status-online' : 'status-offline'}`}></span>
                  <span>WS: {socketConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
            </div>
          </nav>

          <main className="container">
            <Routes>
              <Route path="/" element={<DashboardRefactored />} />
              <Route path="/projects" element={<ProjectManagement />} />
              <Route path="/deploy" element={<DeployProject />} />
              <Route path="/websocket" element={<WebSocketTest socket={socket} connected={socketConnected} />} />
              <Route path="/system" element={<SystemInfo />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;