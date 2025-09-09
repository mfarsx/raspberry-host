import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Modern React 19 root creation
const container = document.getElementById('root');
const root = createRoot(container);

// Modern toast configuration
const toastConfig = {
  position: 'top-right',
  duration: 4000,
  style: {
    background: '#363636',
    color: '#fff',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: '#4ade80',
      secondary: '#fff',
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },
};

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster toastOptions={toastConfig} />
    </ErrorBoundary>
  </React.StrictMode>
);