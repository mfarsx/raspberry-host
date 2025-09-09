'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';

const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data.data;
};

export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      const { token, user } = data;
      
      // Store token in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set default authorization header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Invalidate and refetch user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      toast.success(`Welcome back, ${user.username}!`);
      navigate('/');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Remove authorization header
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Clear all queries
      queryClient.clear();
    },
    onSuccess: () => {
      toast.success('Logged out successfully');
      navigate('/login');
    },
  });
};