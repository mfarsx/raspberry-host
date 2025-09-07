import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, 
  Database, 
  Zap, 
  Globe, 
  Activity,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';

const Dashboard = ({ apiHealth, socketConnected }) => {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, projectsResponse] = await Promise.all([
          axios.get('/api/stats'),
          axios.get('/api/projects')
        ]);
        setStats(statsResponse.data);
        setProjects(projectsResponse.data.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'status-online';
      case 'stopped': return 'status-offline';
      case 'deploying': return 'status-connecting';
      case 'error': return 'status-offline';
      default: return 'status-offline';
    }
  };

  const runningProjects = projects.filter(p => p.status === 'running').length;
  const totalProjects = projects.length;

  return (
    <div>
      {/* Hosting Platform Overview */}
      <div className="card">
        <h2>🍓 Raspberry Pi 5 Hosting Platform</h2>
        <p className="text-gray-600 mb-6">
          Welcome to your personal hosting platform! Deploy and manage multiple websites and applications.
        </p>
        
        <div className="grid grid-4">
          <div className="text-center">
            <Globe size={32} className="mx-auto mb-2 text-blue-500" />
            <h3 className="text-2xl font-bold">{totalProjects}</h3>
            <p className="text-gray-600">Total Projects</p>
          </div>
          
          <div className="text-center">
            <Activity size={32} className="mx-auto mb-2 text-green-500" />
            <h3 className="text-2xl font-bold">{runningProjects}</h3>
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
            <div className={`status-indicator ${apiHealth?.ok ? 'status-online' : 'status-offline'}`} style={{ width: '24px', height: '24px', margin: '0 auto 10px' }}></div>
            <p>{apiHealth?.ok ? 'Healthy' : 'Unhealthy'}</p>
            {apiHealth?.timestamp && (
              <small className="text-gray-500">
                Last check: {new Date(apiHealth.timestamp).toLocaleTimeString()}
              </small>
            )}
          </div>
          
          <div className="text-center">
            <h3>WebSocket</h3>
            <div className={`status-indicator ${socketConnected ? 'status-online' : 'status-offline'}`} style={{ width: '24px', height: '24px', margin: '0 auto 10px' }}></div>
            <p>{socketConnected ? 'Connected' : 'Disconnected'}</p>
          </div>
          
          <div className="text-center">
            <h3>Database</h3>
            <div className={`status-indicator ${stats?.database?.connected ? 'status-online' : 'status-offline'}`} style={{ width: '24px', height: '24px', margin: '0 auto 10px' }}></div>
            <p>{stats?.database?.connected ? 'Connected' : 'Disconnected'}</p>
          </div>
          
          <div className="text-center">
            <h3>Redis</h3>
            <div className={`status-indicator ${stats?.redis?.connected ? 'status-online' : 'status-offline'}`} style={{ width: '24px', height: '24px', margin: '0 auto 10px' }}></div>
            <p>{stats?.redis?.connected ? 'Connected' : 'Disconnected'}</p>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <h2>Recent Projects</h2>
        {projects.length === 0 ? (
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
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{project.name}</h3>
                  <span className={`status-indicator ${getStatusColor(project.status)}`}></span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{project.domain}</p>
                <div className="text-xs text-gray-500">
                  <div>Port: {project.port}</div>
                  <div>Status: {project.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Statistics */}
      {loading ? (
        <div className="card">
          <div className="text-center">
            <div className="spinner"></div>
            <p>Loading system statistics...</p>
          </div>
        </div>
      ) : stats ? (
        <div className="card">
          <h2>System Statistics</h2>
          <div className="grid grid-3">
            <div>
              <h3 className="flex items-center mb-2">
                <MemoryStick size={20} className="mr-2" />
                Memory Usage
              </h3>
              <p>Used: {stats.memory?.used || 'N/A'}</p>
              <p>Free: {stats.memory?.free || 'N/A'}</p>
              <p>Total: {stats.memory?.total || 'N/A'}</p>
            </div>
            
            <div>
              <h3 className="flex items-center mb-2">
                <Cpu size={20} className="mr-2" />
                CPU Load
              </h3>
              <p>Load Average: {stats.cpu?.loadAverage || 'N/A'}</p>
              <p>Uptime: {stats.system?.uptime || 'N/A'}</p>
            </div>
            
            <div>
              <h3 className="flex items-center mb-2">
                <Database size={20} className="mr-2" />
                Database Stats
              </h3>
              <p>Collections: {stats.database?.collections || 'N/A'}</p>
              <p>Documents: {stats.database?.documents || 'N/A'}</p>
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
};

export default Dashboard;