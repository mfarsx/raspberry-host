'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '../config/axios';

export const useApiHealth = () => {
  return useQuery({
    queryKey: ['apiHealth'],
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });
};