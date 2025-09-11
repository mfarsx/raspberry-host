import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserPlus, 
  Mail, 
  Lock,
  Eye,
  EyeOff,
  User
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.username || formData.username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return false;
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      if (response.data.success) {
        toast.success('Registration successful! Please log in.');
        
        // Reset form
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        // Navigate to login
        navigate('/login');
      } else {
        toast.error(response.data.error || 'Registration failed');
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast.error(errorMessage);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create Account</h2>
      <p className="text-gray-600 mb-6">
        Sign up to start deploying projects on your Raspberry Pi
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-group">
          <label className="form-label">
            <User size={16} className="inline mr-2" />
            Username
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Choose a username"
            required
          />
        </div>

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
            placeholder="your@email.com"
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
              placeholder="Create a password"
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

        <div className="form-group">
          <label className="form-label">
            <Lock size={16} className="inline mr-2" />
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="form-input pr-10"
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus size={16} className="mr-2" />
                Create Account
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-800">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;