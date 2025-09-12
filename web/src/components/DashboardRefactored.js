import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../config/axios";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  Server,
  Database,
  Zap,
  Globe,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw,
} from "lucide-react";

const DashboardRefactored = React.memo(() => {
  const { isConnected: socketConnected } = useWebSocket();
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await apiClient.get("/projects");
      return response.data.data || [];
    },
    refetchInterval: 30000,
    retry: 2,
  });

  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      const response = await apiClient.get("/stats");
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });

  const stats = useMemo(() => {
    return {
      total: projects.length,
      running: projects.filter((p) => p.status === "running").length,
      stopped: projects.filter((p) => p.status === "stopped").length,
      deploying: projects.filter((p) => p.status === "deploying").length,
      error: projects.filter((p) => p.status === "error").length,
    };
  }, [projects]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "running":
        return "status-online";
      case "stopped":
        return "status-offline";
      case "deploying":
        return "status-connecting";
      case "error":
        return "status-offline";
      default:
        return "status-offline";
    }
  }, []);

  const formatBytes = useCallback((bytes) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }, []);

  const formatUptime = useCallback((uptime) => {
    if (!uptime) return "N/A";
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  // Handle loading states
  if (projectsLoading && statusLoading) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  // Handle errors
  if (projectsError || statusError) {
    return (
      <ErrorMessage
        error={projectsError || statusError}
        onRetry={() => {
          if (projectsError) refetchProjects();
          if (statusError) refetchStatus();
        }}
        title="Failed to load dashboard data"
      />
    );
  }

  return (
    <div>
      {/* Hosting Platform Overview */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2>🍓 Raspberry Pi 5 Hosting Platform</h2>
          <button
            onClick={() => refetchStatus()}
            className="btn btn-sm"
            disabled={statusLoading}
          >
            <RefreshCw
              size={16}
              className={statusLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Welcome to your personal hosting platform! Deploy and manage multiple
          websites and applications.
        </p>

        <div className="grid grid-4">
          <div className="text-center">
            <Globe size={32} className="mx-auto mb-2 text-blue-500" />
            <h3 className="text-2xl font-bold">{stats.total}</h3>
            <p className="text-gray-600">Total Projects</p>
          </div>

          <div className="text-center">
            <Activity size={32} className="mx-auto mb-2 text-green-500" />
            <h3 className="text-2xl font-bold">{stats.running}</h3>
            <p className="text-gray-600">Running</p>
          </div>

          <div className="text-center">
            <Server size={32} className="mx-auto mb-2 text-purple-500" />
            <h3 className="text-2xl font-bold">ARM64</h3>
            <p className="text-gray-600">Platform</p>
          </div>

          <div className="text-center">
            <Zap size={32} className="mx-auto mb-2 text-yellow-500" />
            <h3 className="text-2xl font-bold">Auto SSL</h3>
            <p className="text-gray-600">HTTPS</p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2>System Status</h2>
        <div className="grid grid-4">
          <div className="text-center">
            <h3>API Health</h3>
            <div
              className={`status-indicator ${
                status?.ok ? "status-online" : "status-offline"
              }`}
              style={{ width: "24px", height: "24px", margin: "0 auto 10px" }}
            ></div>
            <p>{status?.ok ? "Healthy" : "Unhealthy"}</p>
            {status?.timestamp && (
              <small className="text-gray-500">
                Last check: {new Date(status.timestamp).toLocaleTimeString()}
              </small>
            )}
          </div>

          <div className="text-center">
            <h3>WebSocket</h3>
            <div
              className={`status-indicator ${
                socketConnected ? "status-online" : "status-offline"
              }`}
              style={{ width: "24px", height: "24px", margin: "0 auto 10px" }}
            ></div>
            <p>{socketConnected ? "Connected" : "Disconnected"}</p>
          </div>

          <div className="text-center">
            <h3>Database</h3>
            <div
              className={`status-indicator ${
                status?.database?.connected ? "status-online" : "status-offline"
              }`}
              style={{ width: "24px", height: "24px", margin: "0 auto 10px" }}
            ></div>
            <p>{status?.database?.connected ? "Connected" : "Disconnected"}</p>
          </div>

          <div className="text-center">
            <h3>Redis</h3>
            <div
              className={`status-indicator ${
                status?.redis?.connected ? "status-online" : "status-offline"
              }`}
              style={{ width: "24px", height: "24px", margin: "0 auto 10px" }}
            ></div>
            <p>{status?.redis?.connected ? "Connected" : "Disconnected"}</p>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <h2>Recent Projects</h2>
        {projectsLoading ? (
          <div className="text-center p-8">
            <div className="spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center p-8">
            <HardDrive size={48} className="mx-auto mb-4 text-gray-400" />
            <h3>No projects deployed yet</h3>
            <p className="text-gray-600 mb-4">
              Deploy your first project to get started
            </p>
            <a href="/deploy" className="btn">
              Deploy Project
            </a>
          </div>
        ) : (
          <div className="grid grid-2">
            {projects.slice(0, 4).map((project, index) => (
              <div key={project.id || `project-${index}`} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`status-indicator ${getStatusColor(project.status)}`}></span>
                      <span className="text-sm capitalize">{project.status}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{project.domain}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Port: {project.port}</div>
                    {project.lastDeployed && (
                      <div>
                        Deployed:{" "}
                        {new Date(project.lastDeployed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Statistics */}
      {statusLoading ? (
        <div className="card">
          <div className="text-center">
            <div className="spinner"></div>
            <p>Loading system statistics...</p>
          </div>
        </div>
      ) : status ? (
        <div className="card">
          <h2>System Statistics</h2>
          <div className="grid grid-3">
            <div>
              <h3 className="flex items-center mb-2">
                <MemoryStick size={20} className="mr-2" />
                Memory Usage
              </h3>
              <p>Used: {formatBytes(status.memory?.used)}</p>
              <p>Free: {formatBytes(status.memory?.free)}</p>
              <p>Total: {formatBytes(status.memory?.total)}</p>
              {status.memory?.used && status.memory?.total && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${
                          (status.memory.used / status.memory.total) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      (status.memory.used / status.memory.total) * 100
                    )}
                    % used
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="flex items-center mb-2">
                <Cpu size={20} className="mr-2" />
                CPU Load
              </h3>
              <p>Load Average: {status.cpu?.loadAverage || "N/A"}</p>
              <p>Uptime: {formatUptime(status.system?.uptime)}</p>
            </div>

            <div>
              <h3 className="flex items-center mb-2">
                <Database size={20} className="mr-2" />
                Database Stats
              </h3>
              <p>Collections: {status.database?.collections || "N/A"}</p>
              <p>Documents: {status.database?.documents || "N/A"}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p>Failed to load system statistics</p>
        </div>
      )}
    </div>
  );
});

// No PropTypes needed since we're using the hook directly

DashboardRefactored.displayName = "DashboardRefactored";

export default DashboardRefactored;
