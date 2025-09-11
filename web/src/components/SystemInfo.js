import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { RefreshCw, Server, Database, Cpu, MemoryStick, HardDrive, Thermometer } from 'lucide-react';

const SystemInfo = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let intervalId = null;
    
    const fetchSystemInfo = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/system-info');
        setSystemInfo(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch system info:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchSystemInfo();
    
    // Set up interval for periodic updates
    intervalId = setInterval(fetchSystemInfo, 30000); // Update every 30 seconds

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get('/system-info');
      setSystemInfo(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch system info:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2>System Information</h2>
        <div className="loading">Loading system information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2>System Information</h2>
        <div className="error">Error: {error}</div>
        <p>Make sure the API is running and accessible.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2>🍓 Raspberry Pi System Information</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      
      {systemInfo ? (
        <div className="system-info">
          <div className="info-grid">
            <div className="info-item">
              <h3 className="flex items-center mb-2">
                <Cpu size={20} className="mr-2" />
                CPU Usage
              </h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.cpu?.usage || 'N/A'}%</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${systemInfo.cpu?.usage || 0}%` }}
                  ></div>
                </div>
                {systemInfo.cpu?.loadAverage && (
                  <span className="metric-detail">
                    Load: {systemInfo.cpu.loadAverage}
                  </span>
                )}
              </div>
            </div>

            <div className="info-item">
              <h3 className="flex items-center mb-2">
                <MemoryStick size={20} className="mr-2" />
                Memory Usage
              </h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.memory?.usage || 'N/A'}%</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${systemInfo.memory?.usage || 0}%` }}
                  ></div>
                </div>
                <span className="metric-detail">
                  {systemInfo.memory?.used || 'N/A'} / {systemInfo.memory?.total || 'N/A'}
                </span>
              </div>
            </div>

            <div className="info-item">
              <h3 className="flex items-center mb-2">
                <HardDrive size={20} className="mr-2" />
                Disk Usage
              </h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.disk?.usage || 'N/A'}%</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${systemInfo.disk?.usage || 0}%` }}
                  ></div>
                </div>
                <span className="metric-detail">
                  {systemInfo.disk?.used || 'N/A'} / {systemInfo.disk?.total || 'N/A'}
                </span>
              </div>
            </div>

            <div className="info-item">
              <h3 className="flex items-center mb-2">
                <Thermometer size={20} className="mr-2" />
                Temperature
              </h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.temperature || 'N/A'}°C</span>
                <div className="temperature-indicator">
                  <span className={`temp-status ${systemInfo.temperature > 70 ? 'hot' : systemInfo.temperature > 50 ? 'warm' : 'cool'}`}>
                    {systemInfo.temperature > 70 ? '🔥 Hot' : systemInfo.temperature > 50 ? '🌡️ Warm' : '❄️ Cool'}
                  </span>
                </div>
              </div>
            </div>

            <div className="info-item">
              <h3 className="flex items-center mb-2">
                <Server size={20} className="mr-2" />
                Uptime
              </h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.uptime || 'N/A'}</span>
              </div>
            </div>

            <div className="info-item">
              <h3 className="flex items-center mb-2">
                <Database size={20} className="mr-2" />
                Network
              </h3>
              <div className="metric">
                <span className="metric-detail">
                  IP: {systemInfo.network?.ip || 'N/A'}
                </span>
                <span className="metric-detail">
                  Interface: {systemInfo.network?.interface || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Docker Containers</h3>
            <div className="container-list">
              {systemInfo.containers?.length > 0 ? (
                systemInfo.containers.map((container, index) => (
                  <div key={index} className="container-item">
                    <div className="flex justify-between items-center">
                      <span className="container-name">{container.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`container-status ${container.status}`}>
                          {container.status}
                        </span>
                        <div className={`status-indicator ${
                          container.status === 'running' ? 'status-online' : 
                          container.status === 'stopped' ? 'status-offline' : 
                          'status-connecting'
                        }`}></div>
                      </div>
                    </div>
                    {container.ports && (
                      <div className="text-xs text-gray-500 mt-1">
                        Ports: {container.ports.join(', ')}
                      </div>
                    )}
                    {container.image && (
                      <div className="text-xs text-gray-500">
                        Image: {container.image}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>No container information available</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>No system information available</p>
        </div>
      )}
    </div>
  );
};

export default SystemInfo;