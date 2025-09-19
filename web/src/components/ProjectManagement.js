import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../config/axios';
import { useWebSocket } from '../hooks/useWebSocket';
import LogViewer from './LogViewer';
import ProjectConsole from './ProjectConsole';
import { 
  RotateCcw, 
  Trash2, 
  Eye, 
  Settings,
  Globe,
  Clock,
  HardDrive,
  Square,
  Play,
  Wifi,
  WifiOff,
  Edit3,
  Terminal
} from 'lucide-react';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [liveLogs, setLiveLogs] = useState(false);
  const [showPortModal, setShowPortModal] = useState(false);
  const [portChangeProject, setPortChangeProject] = useState(null);
  const [newPort, setNewPort] = useState('');
  const [portChangeLoading, setPortChangeLoading] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [logViewerProject, setLogViewerProject] = useState(null);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleProject, setConsoleProject] = useState(null);
  const { isConnected, socket } = useWebSocket();

  useEffect(() => {
    fetchProjects();
  }, []);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for project status updates
      socket.on('project_status_update', (data) => {
        console.log('Project status update received:', data);
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.id === data.projectId 
              ? { ...project, status: data.status }
              : project
          )
        );
        toast.success(`Project ${data.projectId} status updated to ${data.status}`);
      });

      // Listen for project logs
      socket.on('project_logs', (data) => {
        if (liveLogs && selectedProject && data.projectId === selectedProject) {
          setLogs(prevLogs => [...prevLogs, data.message]);
        }
      });

      // Listen for deployment progress
      socket.on('deployment_progress', (data) => {
        console.log('Deployment progress:', data);
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.id === data.projectId 
              ? { ...project, status: 'deploying', progress: data.progress }
              : project
          )
        );
      });

      return () => {
        socket.off('project_status_update');
        socket.off('project_logs');
        socket.off('deployment_progress');
      };
    }
  }, [socket, isConnected, liveLogs, selectedProject]);

  const fetchProjects = async () => {
    console.log('fetchProjects called');
    setLoading(true);
    try {
      console.log('Making API request to /projects');
      const response = await apiClient.get('/projects');
      console.log('API response:', response.data);
      setProjects(response.data.data || []);
      toast.success('Projects refreshed successfully');
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleStartProject = async (projectId) => {
    try {
      await apiClient.post(`/projects/${projectId}/start`);
      toast.success('Project started successfully');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to start project');
    }
  };

  const handleStopProject = async (projectId) => {
    try {
      await apiClient.post(`/projects/${projectId}/stop`);
      toast.success('Project stopped successfully');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to stop project');
      console.error('Stop project error:', error);
    }
  };

  const handleRestartProject = async (projectId) => {
    try {
      await apiClient.post(`/projects/${projectId}/restart`);
      toast.success('Project restarted successfully');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to restart project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await apiClient.delete(`/projects/${projectId}`);
        toast.success('Project deleted successfully');
        fetchProjects();
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  const handlePortChange = (project) => {
    setPortChangeProject(project);
    setNewPort(project.port.toString());
    setShowPortModal(true);
  };

  const handlePortUpdate = async () => {
    if (!portChangeProject || !newPort) {
      toast.error('Please enter a valid port number');
      return;
    }

    const portNumber = parseInt(newPort);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      toast.error('Port must be a number between 1 and 65535');
      return;
    }

    if (portNumber === portChangeProject.port) {
      toast.error('New port must be different from current port');
      return;
    }

    setPortChangeLoading(true);

    try {
      const response = await apiClient.put(`/projects/${portChangeProject.id}/port`, {
        port: portNumber
      });

      toast.success('Port updated successfully');
      setShowPortModal(false);
      setPortChangeProject(null);
      setNewPort('');
      fetchProjects();
    } catch (error) {
      console.error('Port change error:', error);
      
      if (error.response?.status === 409) {
        toast.error(error.response.data.error || 'Port is already in use');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.error || 'Invalid port number');
      } else {
        toast.error('Failed to update port');
      }
    } finally {
      setPortChangeLoading(false);
    }
  };

  const closePortModal = () => {
    setShowPortModal(false);
    setPortChangeProject(null);
    setNewPort('');
    setPortChangeLoading(false);
  };

  const handleViewLogs = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        setLogViewerProject(project);
        setShowLogViewer(true);
      }
    } catch (error) {
      console.error('Log viewer error:', error);
      toast.error('Failed to open log viewer');
    }
  };

  const closeLogViewer = () => {
    setShowLogViewer(false);
    setLogViewerProject(null);
  };

  const handleOpenConsole = (project) => {
    if (project.status !== 'running') {
      toast.error('Project must be running to access console');
      return;
    }
    setConsoleProject(project);
    setShowConsole(true);
  };

  const closeConsole = () => {
    setShowConsole(false);
    setConsoleProject(null);
  };

  const toggleLiveLogs = () => {
    if (socket && isConnected && selectedProject) {
      if (liveLogs) {
        socket.emit('unsubscribe_logs', { projectId: selectedProject });
        setLiveLogs(false);
      } else {
        socket.emit('subscribe_logs', { projectId: selectedProject });
        setLiveLogs(true);
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'status-online';
      case 'stopped': return 'status-offline';
      case 'deploying': return 'status-connecting';
      case 'error': return 'status-offline';
      default: return 'status-offline';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatUptime = (dateString) => {
    if (!dateString) return 'N/A';
    const now = new Date();
    const deployed = new Date(dateString);
    const diff = now - deployed;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Filter projects based on search term and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="card">
        <div className="text-center">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2>Hosted Projects</h2>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <Wifi size={16} />
                  Real-time Updates
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <WifiOff size={16} />
                  Offline Mode
                </span>
              )}
            </div>
          </div>
          <button 
            className="btn btn-success"
            onClick={fetchProjects}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-2 gap-4 mb-6">
          <div className="form-group">
            <label className="form-label">Search Projects</label>
            <input
              type="text"
              placeholder="Search by name or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="deploying">Deploying</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center p-8">
            <HardDrive size={48} className="mx-auto mb-4 text-gray-400" />
            <h3>No projects deployed yet</h3>
            <p className="text-gray-600 mb-4">
              Deploy your first project to get started with hosting
            </p>
            <a href="/deploy" className="btn">
              Deploy Project
            </a>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center p-8">
            <HardDrive size={48} className="mx-auto mb-4 text-gray-400" />
            <h3>No projects match your search criteria</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search term or status filter
            </p>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-2">
            {filteredProjects.map((project) => (
              <div key={project.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`status-indicator ${getStatusColor(project.status)}`}></span>
                      <span className="text-sm capitalize">{project.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {project.status === 'running' && (
                      <a
                        href={`http://${project.domain}:${project.port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success btn-small"
                        title="Visit Project - Opens in new tab"
                      >
                        <Wifi size={14} />
                      </a>
                    )}
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleViewLogs(project.id)}
                      title="View Logs"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      className="btn btn-info btn-small"
                      onClick={() => handleOpenConsole(project)}
                      title="Open Console"
                      disabled={project.status !== 'running'}
                    >
                      <Terminal size={14} />
                    </button>
                    {project.status === 'running' ? (
                      <button
                        className="btn btn-warning btn-small"
                        onClick={() => handleStopProject(project.id)}
                        title="Stop Project"
                      >
                        <Square size={14} />
                      </button>
                    ) : (
                      <button
                        className="btn btn-success btn-small"
                        onClick={() => handleStartProject(project.id)}
                        title="Start Project"
                      >
                        <Play size={14} />
                      </button>
                    )}
                    <button
                      className="btn btn-info btn-small"
                      onClick={() => handleRestartProject(project.id)}
                      title="Restart Project"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteProject(project.id)}
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-gray-500" />
                    <span className="text-sm">{project.domain}</span>
                    {project.status === 'running' && (
                      <a
                        href={`http://${project.domain}:${project.port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-small ml-2"
                        title="Open Project in New Tab"
                      >
                        <Wifi size={12} />
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-gray-500" />
                    <span className="text-sm">Port: {project.port}</span>
                    <button
                      className="btn btn-secondary btn-small ml-2"
                      onClick={() => handlePortChange(project)}
                      title="Change Port"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-sm">
                      Uptime: {formatUptime(project.lastDeployed)}
                    </span>
                  </div>
                  
                  {project.status === 'running' && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <Wifi size={16} className="text-green-600" />
                      <span className="text-sm text-green-700 font-medium">
                        Project is live at: 
                        <a
                          href={`http://${project.domain}:${project.port}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-green-600 hover:text-green-800 underline"
                        >
                          {project.domain}:{project.port}
                        </a>
                        <span className="text-xs text-gray-600 ml-2">
                          (Try /health for API status)
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    <div>Repository: {project.repository}</div>
                    <div>Branch: {project.branch}</div>
                    <div>Created: {formatDate(project.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3>Project Logs - {selectedProject}</h3>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Wifi size={16} />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <WifiOff size={16} />
                      Disconnected
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isConnected && (
                  <button
                    className={`btn ${liveLogs ? 'btn-success' : 'btn-secondary'}`}
                    onClick={toggleLiveLogs}
                    title={liveLogs ? 'Stop Live Logs' : 'Start Live Logs'}
                  >
                    {liveLogs ? 'Live' : 'Static'}
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={clearLogs}
                  title="Clear Logs"
                >
                  Clear
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowLogs(false);
                    setLiveLogs(false);
                    if (socket && isConnected && selectedProject) {
                      socket.emit('unsubscribe_logs', { projectId: selectedProject });
                    }
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] bg-gray-900 text-green-400 font-mono text-sm">
              {logs.length === 0 ? (
                <p>No logs available</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
              {liveLogs && (
                <div className="text-yellow-400 animate-pulse">
                  ● Live logs streaming...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Port Change Modal */}
      {showPortModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Port</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project: {portChangeProject?.name}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Port: {portChangeProject?.port}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Port:
              </label>
              <input
                type="number"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                className="form-input w-full"
                placeholder="Enter new port (1-65535)"
                min="1"
                max="65535"
                disabled={portChangeLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Port must be between 1 and 65535
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary"
                onClick={closePortModal}
                disabled={portChangeLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePortUpdate}
                disabled={portChangeLoading}
              >
                {portChangeLoading ? 'Updating...' : 'Update Port'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Log Viewer */}
      {showLogViewer && logViewerProject && (
        <LogViewer
          projectId={logViewerProject.id}
          projectName={logViewerProject.name}
          onClose={closeLogViewer}
        />
      )}

      {/* Project Console */}
      {showConsole && consoleProject && (
        <ProjectConsole
          projectId={consoleProject.id}
          projectName={consoleProject.name}
          onClose={closeConsole}
        />
      )}
    </div>
  );
};

export default ProjectManagement;