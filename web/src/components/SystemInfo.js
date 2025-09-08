import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemInfo = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/system-info');
        setSystemInfo(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch system info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

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
      <h2>🍓 Raspberry Pi System Information</h2>
      
      {systemInfo ? (
        <div className="system-info">
          <div className="info-grid">
            <div className="info-item">
              <h3>CPU Usage</h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.cpu?.usage || 'N/A'}%</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${systemInfo.cpu?.usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="info-item">
              <h3>Memory Usage</h3>
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
              <h3>Disk Usage</h3>
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
              <h3>Temperature</h3>
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
              <h3>Uptime</h3>
              <div className="metric">
                <span className="metric-value">{systemInfo.uptime || 'N/A'}</span>
              </div>
            </div>

            <div className="info-item">
              <h3>Network</h3>
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
              {systemInfo.containers?.map((container, index) => (
                <div key={index} className="container-item">
                  <span className="container-name">{container.name}</span>
                  <span className={`container-status ${container.status}`}>
                    {container.status}
                  </span>
                </div>
              )) || <p>No container information available</p>}
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