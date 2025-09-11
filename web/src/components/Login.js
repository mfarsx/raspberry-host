import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogIn, 
  Mail, 
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', formData);
      
      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('authToken', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Update auth context
        login(response.data.data.user);
        
        toast.success('Login successful!');
        
        // Navigate to dashboard
        navigate('/');
        
        // Reset form
        setFormData({
          email: '',
          password: ''
        });
      } else {
        toast.error(response.data.error || 'Login failed');
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Login to Deploy Projects</h2>
      <p className="text-gray-600 mb-6">
        Sign in to access the deployment platform
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-group">
          <label className="form-label">
            <Mail size={16} className="inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="form-input"
            placeholder="admin@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Lock size={16} className="inline mr-2" />
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="form-input pr-10"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <div className="spinner mr-2" style={{ width: '16px', height: '16px' }}></div>
                Signing In...
              </>
            ) : (
              <>
                <LogIn size={16} className="mr-2" />
                Sign In
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2 text-blue-800">Demo Credentials</h4>
        <p className="text-sm text-blue-700">
          <strong>Email:</strong> admin@example.com<br />
          <strong>Password:</strong> password
        </p>
      </div>
    </div>
  );
};

export default Login;