"use client";

import React, { useMemo, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Import loading component
import LoadingSpinner from "./components/LoadingSpinner";

// Import the modern hooks
import { useApiHealth } from "./hooks/useApiHealth";
import { useWebSocket } from "./hooks/useWebSocket";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Lazy load components for better performance
const DashboardRefactored = lazy(() =>
  import("./components/DashboardRefactored")
);
const ProjectManagement = lazy(() => import("./components/ProjectManagement"));
const DeployProject = lazy(() => import("./components/DeployProject"));
const SystemInfo = lazy(() => import("./components/SystemInfo"));
const WebSocketTest = lazy(() => import("./components/WebSocketTest"));
const Login = lazy(() => import("./components/Login"));
const Register = lazy(() => import("./components/Register"));
const DatabaseMonitoring = lazy(() => import("./components/DatabaseMonitoring"));

// Create a client with modern TanStack Query v5 configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", marginTop: "50px" }}
      >
        <div
          className="spinner"
          style={{ width: "40px", height: "40px", margin: "0 auto" }}
        ></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Inner component that uses the hooks
const AppContent = () => {
  const { data: apiHealth } = useApiHealth();
  const { isConnected: socketConnected } = useWebSocket();
  const { isAuthenticated, user, logout } = useAuth();

  // Memoize navigation items for better performance
  const navigationItems = useMemo(
    () => [
      { path: "/", label: "Dashboard" },
      { path: "/projects", label: "Projects" },
      { path: "/deploy", label: "Deploy Project" },
      { path: "/database", label: "Database" },
      { path: "/websocket", label: "WebSocket Test" },
      { path: "/system", label: "System Info" },
    ],
    []
  );

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        {isAuthenticated && (
          <nav className="container" style={{ paddingTop: "20px" }}>
            <div className="card">
              <h1 style={{ margin: "0 0 20px 0", color: "#333" }}>
                🍓 Raspberry Pi 5 Hosting Platform
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {navigationItems.map(({ path, label }) => (
                  <Link
                    key={path}
                    to={path}
                    className="btn"
                    style={{ textDecoration: "none" }}
                  >
                    {label}
                  </Link>
                ))}
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    className={`status-indicator ${
                      apiHealth?.ok ? "status-online" : "status-offline"
                    }`}
                  ></span>
                  <span>API: {apiHealth?.ok ? "Online" : "Offline"}</span>
                  <span
                    className={`status-indicator ${
                      socketConnected ? "status-online" : "status-offline"
                    }`}
                  ></span>
                  <span>
                    WS: {socketConnected ? "Connected" : "Disconnected"}
                  </span>
                  <span style={{ marginLeft: "20px", color: "#666" }}>
                    Welcome, {user?.username}
                  </span>
                  <button
                    onClick={logout}
                    className="btn btn-secondary"
                    style={{ marginLeft: "10px" }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main className="container">
          <Suspense
            fallback={<LoadingSpinner fullScreen text="Loading page..." />}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardRefactored />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deploy"
                element={
                  <ProtectedRoute>
                    <DeployProject />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/websocket"
                element={
                  <ProtectedRoute>
                    <WebSocketTest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/database"
                element={
                  <ProtectedRoute>
                    <DatabaseMonitoring />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system"
                element={
                  <ProtectedRoute>
                    <SystemInfo />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
