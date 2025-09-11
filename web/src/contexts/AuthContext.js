import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../config/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Verify token is still valid
        apiClient.get('/auth/me')
          .then(response => {
            if (response.data.success) {
              setUser(response.data.data);
              // Update stored user data
              localStorage.setItem('user', JSON.stringify(response.data.data));
            } else {
              // Token is invalid, clear storage
              logout();
            }
          })
          .catch((error) => {
            console.error('Token validation failed:', error);
            // Token is invalid, clear storage
            logout();
          });
      } catch (error) {
        console.error('Invalid user data:', error);
        // Invalid user data, clear storage
        logout();
      }
    }
    
    setLoading(false);
  }, []); // Remove logout dependency to prevent infinite loops

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAuthenticated = user !== null;

  const hasRole = (role) => {
    return user && user.roles && user.roles.includes(role);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    hasRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};