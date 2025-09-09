'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

export const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  const handleConnect = useCallback(() => {
    setSocketConnected(true);
    toast.success('WebSocket connected');
    console.log('WebSocket connected:', socketRef.current?.id);
  }, []);

  const handleDisconnect = useCallback((reason) => {
    setSocketConnected(false);
    toast.error(`WebSocket disconnected: ${reason}`);
    console.log('WebSocket disconnected:', reason);
  }, []);

  const handleConnectError = useCallback((error) => {
    setSocketConnected(false);
    console.error('WebSocket connection error:', error);
    if (!socketRef.current?.recovered) {
      toast.error(`WebSocket connection failed: ${error.message}`);
    }
  }, []);

  const handleReconnect = useCallback((attemptNumber) => {
    setSocketConnected(true);
    toast.success(`WebSocket reconnected after ${attemptNumber} attempts`);
    console.log('WebSocket reconnected:', socketRef.current?.id);
  }, []);

  const handleReconnectError = useCallback((error) => {
    console.error('WebSocket reconnection error:', error);
  }, []);

  const handleReconnectFailed = useCallback(() => {
    setSocketConnected(false);
    toast.error('WebSocket reconnection failed after all attempts');
    console.error('WebSocket reconnection failed');
  }, []);

  const handleMessage = useCallback((data) => {
    console.log('Received message:', data);
  }, []);

  const handleEcho = useCallback((data) => {
    console.log('Received echo:', data);
  }, []);

  const handleStats = useCallback((data) => {
    console.log('Received stats:', data);
  }, []);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
    console.log('Connecting to WebSocket:', wsUrl);
    
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    socketRef.current = newSocket;

    // Register event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('reconnect', handleReconnect);
    newSocket.on('reconnect_error', handleReconnectError);
    newSocket.on('reconnect_failed', handleReconnectFailed);
    newSocket.on('message', handleMessage);
    newSocket.on('echo', handleEcho);
    newSocket.on('stats', handleStats);

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [handleConnect, handleDisconnect, handleConnectError, handleReconnect, handleReconnectError, handleReconnectFailed, handleMessage, handleEcho, handleStats]);

  return { socket, socketConnected };
};