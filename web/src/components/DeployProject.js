import React, { useState } from 'react';
import axios from 'axios';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';
import { 
  Upload, 
  GitBranch, 
  Globe, 
  Settings, 
  Code,
  Play,
  Plus,
  Minus
} from 'lucide-react';

const DeployProject = () => {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    repository: '',
    branch: 'main',
    buildCommand: '',
    startCommand: '',
    port: 3000,
    environment: {}
  });
  const [envVars, setEnvVars] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addEnvVar = () => {
    setEnvVars(prev => [...prev, { key: '', value: '' }]);
  };

  const removeEnvVar = (index) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index, field, value) => {
    setEnvVars(prev => prev.map((env, i) => 
      i === index ? { ...env, [field]: value } : env
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert env vars array to object
      const environment = envVars.reduce((acc, env) => {
        if (env.key && env.value) {
          acc[env.key] = env.value;
        }
        return acc;
      }, {});

      const payload = {
        ...formData,
        environment
      };

      const response = await axios.post('/api/projects/deploy', payload);
      
      toast.success('Project deployed successfully!');
      
      // Reset form
      setFormData({
        name: '',
        domain: '',
        repository: '',
        branch: 'main',
        buildCommand: '',
        startCommand: '',
        port: 3000,
        environment: {}
      });
      setEnvVars([]);
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deploy project');
      console.error('Deployment error:', error);
    } finally {
      setLoading(false);
    }
  };

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
              <label className="form-label">
                Build Command (Optional)
              </label>
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
              <label className="form-label">
                Start Command (Optional)
              </label>
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
          <div className="form-group">
            <label className="form-label">
              <Settings size={16} className="inline mr-2" />
              Port
            </label>
            <input
              type="number"
              name="port"
              value={formData.port}
              onChange={handleInputChange}
              className="form-input"
              min="1"
              max="65535"
            />
          </div>

          {/* Environment Variables */}
          <div className="form-group">
            <div className="flex justify-between items-center mb-4">
              <label className="form-label">
                Environment Variables
              </label>
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
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