'use client';

import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Components
import DashboardRefactored from './components/DashboardRefactored';
import ProjectManagement from './components/ProjectManagement';
import DeployProject from './components/DeployProject';
import SystemInfo from './components/SystemInfo';
import WebSocketTest from './components/WebSocketTest';
import Login from './components/Login';

// Import the modern hooks
import { useApiHealth } from './hooks/useApiHealth';
import { useWebSocket } from './hooks/useWebSocket';

// Create a client with modern TanStack Query v5 configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Inner component that uses the hooks
const AppContent = () => {
  const { data: apiHealth } = useApiHealth();
  const { socket, socketConnected } = useWebSocket();

  // Memoize navigation items for better performance
  const navigationItems = useMemo(() => [
    { path: '/', label: 'Dashboard' },
    { path: '/projects', label: 'Projects' },
    { path: '/deploy', label: 'Deploy Project' },
    { path: '/websocket', label: 'WebSocket Test' },
    { path: '/system', label: 'System Info' },
  ], []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <nav className="container" style={{ paddingTop: '20px' }}>
          <div className="card">
            <h1 style={{ margin: '0 0 20px 0', color: '#333' }}>
              🍓 Raspberry Pi 5 Hosting Platform
            </h1>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              {navigationItems.map(({ path, label }) => (
                <Link 
                  key={path}
                  to={path} 
                  className="btn" 
                  style={{ textDecoration: 'none' }}
                >
                  {label}
                </Link>
              ))}
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
            <Route path="/" element={<DashboardRefactored socketConnected={socketConnected} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/projects" element={<ProjectManagement />} />
            <Route path="/deploy" element={<DeployProject />} />
            <Route path="/websocket" element={<WebSocketTest socket={socket} connected={socketConnected} />} />
            <Route path="/system" element={<SystemInfo />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;