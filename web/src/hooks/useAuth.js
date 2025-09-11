'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';

const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data.data;
};

export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login } = useAuth();

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      const { token, user } = data;
      
      // Use the context login method
      login(user, token);
      
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
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // Use the context logout method
      logout();
      
      // Clear all queries
      queryClient.clear();
    },
    onSuccess: () => {
      toast.success('Logged out successfully');
      navigate('/login');
    },
  });
};