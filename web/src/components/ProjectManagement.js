import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import apiClient from '../config/axios';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Settings,
  Globe,
  Clock,
  HardDrive
} from 'lucide-react';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get('/projects');
      setProjects(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch projects');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProject = async (projectId) => {
    try {
      await axios.post(`/api/projects/${projectId}/restart`);
      toast.success('Project restarted successfully');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to restart project');
    }
  };

  const handleStopProject = async (projectId) => {
    try {
      // This would need a stop endpoint in the API
      toast.info('Stop functionality not implemented yet');
    } catch (error) {
      toast.error('Failed to stop project');
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

  const handleViewLogs = async (projectId) => {
    try {
      const response = await apiClient.get(`/projects/${projectId}/logs`);
      setLogs(response.data.data || []);
      setSelectedProject(projectId);
      setShowLogs(true);
    } catch (error) {
      toast.error('Failed to fetch logs');
    }
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
          <h2>Hosted Projects</h2>
          <button 
            className="btn btn-success"
            onClick={fetchProjects}
          >
            Refresh
          </button>
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
        ) : (
          <div className="grid grid-2">
            {projects.map((project) => (
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
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleViewLogs(project.id)}
                      title="View Logs"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleStartProject(project.id)}
                      title="Restart"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteProject(project.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-gray-500" />
                    <span className="text-sm">{project.domain}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-gray-500" />
                    <span className="text-sm">Port: {project.port}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-sm">
                      Uptime: {formatUptime(project.lastDeployed)}
                    </span>
                  </div>
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
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3>Project Logs - {selectedProject}</h3>
              <button
                className="btn btn-secondary"
                onClick={() => setShowLogs(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-80 bg-gray-900 text-green-400 font-mono text-sm">
              {logs.length === 0 ? (
                <p>No logs available</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;