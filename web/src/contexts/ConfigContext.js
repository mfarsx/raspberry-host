import React, { createContext, useContext, useState, useEffect } from 'react';
import configService from '../services/configService';

const ConfigContext = createContext();

/**
 * Configuration Provider Component
 * Provides configuration data to the entire app
 */
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      const configuration = await configService.getAllConfig();
      setConfig(configuration);
    } catch (err) {
      console.error('Failed to load configuration:', err);
      setError(err.message);
      // Set fallback configuration
      setConfig(configService.getFallbackConfig());
    } finally {
      setLoading(false);
    }
  };

  const refreshConfiguration = async () => {
    configService.clearCache();
    await loadConfiguration();
  };

  const value = {
    config,
    loading,
    error,
    refreshConfiguration,
    // Convenience getters
    appConfig: config?.app || null,
    systemConfig: config?.system || null,
    uiConfig: config?.ui || null,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

/**
 * Hook to use configuration context
 * @returns {Object} Configuration context value
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

/**
 * Hook to get app configuration
 * @returns {Object} App configuration
 */
export const useAppConfig = () => {
  const { appConfig } = useConfig();
  return appConfig;
};

/**
 * Hook to get system configuration
 * @returns {Object} System configuration
 */
export const useSystemConfig = () => {
  const { systemConfig } = useConfig();
  return systemConfig;
};

/**
 * Hook to get UI configuration
 * @returns {Object} UI configuration
 */
export const useUIConfig = () => {
  const { uiConfig } = useConfig();
  return uiConfig;
};

export default ConfigContext;