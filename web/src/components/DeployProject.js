import React, { useState, useCallback, useMemo } from 'react';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  GitBranch, 
  Globe, 
  Settings, 
  Code,
  Play,
  Plus,
  Minus,
  Info
} from 'lucide-react';

// Constants
const DEFAULT_FORM_DATA = {
  name: '',
  domain: '',
  repository: '',
  branch: 'main',
  buildCommand: '',
  startCommand: '',
  port: 3000,
  autoPort: false,
  environment: {}
};

const PORT_RANGE = { min: 3000, max: 9999 };

const DeployProject = () => {
  const { user, isAuthenticated, hasRole } = useAuth();
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [envVars, setEnvVars] = useState([]);
  const [loading, setLoading] = useState(false);

  // Memoized validation
  const validation = useMemo(() => ({
    isValid: formData.name && formData.domain && formData.repository,
    errors: {
      name: !formData.name ? 'Project name is required' : '',
      domain: !formData.domain ? 'Domain is required' : '',
      repository: !formData.repository ? 'Repository URL is required' : ''
    }
  }), [formData.name, formData.domain, formData.repository]);

  // Event handlers
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const addEnvVar = useCallback(() => {
    setEnvVars(prev => [...prev, { key: '', value: '' }]);
  }, []);

  const removeEnvVar = useCallback((index) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateEnvVar = useCallback((index, field, value) => {
    setEnvVars(prev => prev.map((env, i) => 
      i === index ? { ...env, [field]: value } : env
    ));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setEnvVars([]);
  }, []);

  // Environment variables processing
  const environment = useMemo(() => {
    return envVars.reduce((acc, env) => {
      if (env.key && env.value) {
        acc[env.key] = env.value;
      }
      return acc;
    }, {});
  }, [envVars]);

  // Form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to deploy projects');
      return;
    }
    
    if (!hasRole('admin')) {
      toast.error('Admin privileges required to deploy projects');
      return;
    }

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors).find(error => error);
      if (firstError) toast.error(firstError);
      return;
    }
    
    setLoading(true);

    try {
      const payload = {
        ...formData,
        environment
      };

      console.log('Sending deployment request:', payload);
      
      const response = await apiClient.post('/projects/deploy', payload);
      
      if (response.data.success) {
        toast.success('Project deployed successfully!');
        resetForm();
      } else {
        toast.error(response.data.error || 'Failed to deploy project');
      }
      
    } catch (error) {
      console.error('Deployment error:', error);
      handleDeploymentError(error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, hasRole, validation, formData, environment, resetForm]);

  // Error handling
  const handleDeploymentError = useCallback((error) => {
    if (error.response?.status === 401) {
      toast.error('Authentication failed. Please log in again.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Admin privileges required.');
    } else if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (errorData.details && Array.isArray(errorData.details)) {
        const errorMessages = errorData.details.map(detail => detail.message).join(', ');
        toast.error(`Validation failed: ${errorMessages}`);
      } else {
        toast.error(errorData.error || 'Invalid request data');
      }
    } else {
      toast.error(error.response?.data?.error || 'Failed to deploy project');
    }
  }, []);

  // Port configuration component
  const PortConfiguration = () => (
    <div className="form-group">
      <label className="form-label">
        <Settings size={16} className="inline mr-2" />
        Port Configuration
      </label>
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            name="autoPort"
            checked={formData.autoPort}
            onChange={handleInputChange}
            className="form-checkbox"
            id="autoPort"
          />
          <label htmlFor="autoPort" className="text-sm text-gray-700">
            Auto-assign available port
          </label>
        </div>
        
        {!formData.autoPort && (
          <input
            type="number"
            name="port"
            value={formData.port}
            onChange={handleInputChange}
            className="form-input"
            min={PORT_RANGE.min}
            max={PORT_RANGE.max}
            placeholder="Enter port number"
          />
        )}
        
        {formData.autoPort && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <div className="flex items-start space-x-2">
              <Info size={16} className="mt-0.5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-800">Auto Port Assignment</p>
                <p>The system will automatically find an available port starting from {formData.port}.</p>
                <p className="mt-1">Preferred port: <span className="font-mono bg-blue-100 px-1 rounded">{formData.port}</span></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Environment variables component
  const EnvironmentVariables = () => (
    <div className="form-group">
      <div className="flex justify-between items-center mb-4">
        <label className="form-label">Environment Variables</label>
        <button
          type="button"
          onClick={addEnvVar}
          className="btn btn-secondary"
        >
          <Plus size={16} className="mr-2" />
          Add Variable
        </button>
      </div>

      {envVars.map((env, index) => (
        <div key={index} className="grid grid-2 gap-2 mb-2">
          <input
            type="text"
            placeholder="Variable name"
            value={env.key}
            onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
            className="form-input"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Variable value"
              value={env.value}
              onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
              className="form-input"
            />
            <button
              type="button"
              onClick={() => removeEnvVar(index)}
              className="btn btn-danger"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="card">
        <h2>Deploy New Project</h2>
        <p className="text-gray-600 mb-6">
          Deploy your existing project to the Raspberry Pi 5 hosting platform
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                <Code size={16} className="inline mr-2" />
                Project Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="my-awesome-project"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Globe size={16} className="inline mr-2" />
                Domain
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className="form-input"
                placeholder="myproject.example.com"
                required
              />
            </div>
          </div>

          {/* Repository Information */}
          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">
                <Upload size={16} className="inline mr-2" />
                Git Repository URL
              </label>
              <input
                type="url"
                name="repository"
                value={formData.repository}
                onChange={handleInputChange}
                className="form-input"
                placeholder="https://github.com/username/repository.git"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <GitBranch size={16} className="inline mr-2" />
                Branch
              </label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                className="form-input"
                placeholder="main"
              />
            </div>
          </div>

          {/* Build and Start Commands */}
          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Build Command (Optional)</label>
              <input
                type="text"
                name="buildCommand"
                value={formData.buildCommand}
                onChange={handleInputChange}
                className="form-input"
                placeholder="npm run build"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Start Command (Optional)</label>
              <input
                type="text"
                name="startCommand"
                value={formData.startCommand}
                onChange={handleInputChange}
                className="form-input"
                placeholder="npm start"
              />
            </div>
          </div>

          {/* Port Configuration */}
          <PortConfiguration />

          {/* Environment Variables */}
          <EnvironmentVariables />

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !validation.isValid}
              className="btn btn-success"
            >
              {loading ? (
                <>
                  <div className="spinner mr-2" style={{ width: '16px', height: '16px' }}></div>
                  Deploying...
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Deploy Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Deployment Guide */}
      <div className="card">
        <h3>Deployment Guide</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Prepare Your Project</h4>
            <p className="text-gray-600">
              Make sure your project has a <code>Dockerfile</code> in the root directory.
              The platform will automatically build and run your project using Docker.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. Configure Domain</h4>
            <p className="text-gray-600">
              Set up DNS A/AAAA records pointing to your Raspberry Pi's IP address.
              The platform will automatically configure SSL certificates.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. Environment Variables</h4>
            <p className="text-gray-600">
              Add any environment variables your application needs (database URLs, API keys, etc.).
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">4. Build Commands</h4>
            <p className="text-gray-600">
              Specify build commands if your project needs compilation (e.g., <code>npm run build</code>).
              Leave empty for projects that don't need building.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeployProject;