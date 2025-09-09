'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '../config/axios';

const fetchApiHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const useApiHealth = () => {
  return useQuery({
    queryKey: ['apiHealth'],
    queryFn: fetchApiHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
  });
};