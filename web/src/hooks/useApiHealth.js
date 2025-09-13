'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '../config/axios';
import { useSystemConfig } from '../contexts/ConfigContext';

export const useApiHealth = () => {
  const systemConfig = useSystemConfig();
  
  return useQuery({
    queryKey: ['apiHealth'],
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
    refetchInterval: systemConfig?.refreshInterval || 30000,
    retry: 2,
  });
};