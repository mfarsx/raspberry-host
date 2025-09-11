"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import io from "socket.io-client";
import toast from "react-hot-toast";
import { sanitizeInput } from "../utils/validation";
import config from "../config/environment";

// Custom hook for WebSocket management with proper React patterns
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Use refs to maintain socket instance and avoid stale closures
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const mountedRef = useRef(true);

  // Memoized socket configuration
  const socketConfig = useMemo(
    () => ({
      transports: ["polling", "websocket"], // Start with polling, then upgrade to websocket
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      autoConnect: false, // Manual connection control
      reconnection: true,
      reconnectionDelay: config.WS_RECONNECT_DELAY,
      reconnectionAttempts: config.WS_RECONNECT_ATTEMPTS,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: config.WS_RECONNECT_ATTEMPTS,
      randomizationFactor: 0.5,
      forceNew: true, // Force new connection
      withCredentials: true, // Include credentials for CORS
    }),
    []
  );

  // Main effect for socket lifecycle - only run once
  useEffect(() => {
    mountedRef.current = true;

    // Prevent multiple initializations
    if (socketRef.current || isConnectingRef.current) {
      return;
    }

    console.log("Initializing WebSocket connection...");
    isConnectingRef.current = true;

    try {
      console.log("Creating Socket.IO connection to:", config.WS_URL);
      console.log("Socket config:", socketConfig);
      
      const socket = io(config.WS_URL, socketConfig);
      socketRef.current = socket;

      // Register event listeners directly here to avoid dependency issues
      socket.on("connect", () => {
        if (!mountedRef.current) return;
        console.log("Socket.IO connected successfully:", socket.id);

        console.log("WebSocket connected");
        setIsConnected(true);
        setError(null);
        setReconnectAttempt(0);
        isConnectingRef.current = false;
      });

      socket.on("disconnect", (reason) => {
        if (!mountedRef.current) return;

        console.log("WebSocket disconnected:", reason);
        setIsConnected(false);
        isConnectingRef.current = false;

        // Only show error for unexpected disconnections
        if (reason !== "io client disconnect") {
          const errorMessage = `Connection lost: ${reason}`;
          setError(errorMessage);
          toast.error(errorMessage);
        }
      });

      socket.on("connect_error", (err) => {
        if (!mountedRef.current) return;

        console.error("WebSocket connection error:", err);
        console.error("Error details:", {
          message: err.message,
          description: err.description,
          context: err.context,
          type: err.type
        });
        setIsConnected(false);
        isConnectingRef.current = false;

        const errorMessage = err.message || "Connection failed";
        setError(errorMessage);
        toast.error(`WebSocket error: ${errorMessage}`);
      });

      socket.on("reconnect", (attemptNumber) => {
        if (!mountedRef.current) return;

        console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
        setReconnectAttempt(attemptNumber);
        toast.success(`Reconnected after ${attemptNumber} attempts`);
      });

      socket.on("reconnect_attempt", (attemptNumber) => {
        if (!mountedRef.current) return;

        console.log(`WebSocket reconnection attempt ${attemptNumber}`);
        setReconnectAttempt(attemptNumber);
      });

      socket.on("reconnect_error", (err) => {
        if (!mountedRef.current) return;

        console.error("WebSocket reconnection error:", err);
        setError(`Reconnection failed: ${err.message}`);
      });

      socket.on("reconnect_failed", () => {
        if (!mountedRef.current) return;

        console.error("WebSocket reconnection failed after all attempts");
        setIsConnected(false);
        setError("Connection failed after all retry attempts");
        toast.error("Unable to reconnect. Please refresh the page.");
      });

      // Application-specific events
      socket.on("message", (data) => {
        console.log("Received message:", data);
      });

      socket.on("echo", (data) => {
        console.log("Received echo:", data);
      });

      socket.on("stats", (data) => {
        console.log("Received stats:", data);
      });

      socket.on("pong", (data) => {
        console.log("Received pong:", data);
      });

      // Connect the socket
      socket.connect();
    } catch (err) {
      console.error("Failed to initialize socket:", err);
      isConnectingRef.current = false;
      setError(`Initialization failed: ${err.message}`);
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;

      if (document.hidden) {
        console.log("Page hidden, WebSocket will continue running");
      } else {
        console.log("Page visible, checking WebSocket connection");
        if (
          socketRef.current &&
          !socketRef.current.connected &&
          !isConnectingRef.current
        ) {
          console.log("WebSocket disconnected, attempting to reconnect...");
          socketRef.current.connect();
        }
      }
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        console.log("Cleaning up WebSocket connection");
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }

      setIsConnected(false);
      setError(null);
      setReconnectAttempt(0);
      isConnectingRef.current = false;
    };
  }, [socketConfig]); // Only depend on socketConfig which is memoized

  // Utility functions
  const sendMessage = useCallback((message) => {
    if (!socketRef.current?.connected) {
      console.warn("Cannot send message: WebSocket not connected");
      return false;
    }

    if (!message || typeof message !== "string") {
      console.warn("Cannot send message: Invalid message format");
      return false;
    }

    try {
      const sanitizedMessage = sanitizeInput(message);
      if (!sanitizedMessage || sanitizedMessage.length === 0) {
        console.warn("Cannot send message: Message failed validation");
        return false;
      }

      socketRef.current.emit("message", { message: sanitizedMessage });
      return true;
    } catch (err) {
      console.error("Failed to send message:", err);
      return false;
    }
  }, []);

  const sendPing = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("Cannot send ping: WebSocket not connected");
      return false;
    }

    try {
      socketRef.current.emit("ping");
      return true;
    } catch (err) {
      console.error("Failed to send ping:", err);
      return false;
    }
  }, []);

  const requestStats = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("Cannot request stats: WebSocket not connected");
      return false;
    }

    try {
      socketRef.current.emit("stats");
      return true;
    } catch (err) {
      console.error("Failed to request stats:", err);
      return false;
    }
  }, []);

  const reconnect = useCallback(() => {
    if (isConnectingRef.current) {
      console.warn("Reconnection already in progress");
      return false;
    }

    console.log("Manual reconnection requested");
    setError(null);

    if (socketRef.current) {
      if (socketRef.current.connected) {
        console.log("Already connected");
        return true;
      }
      socketRef.current.connect();
    }

    return true;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("Manual disconnection requested");
      socketRef.current.disconnect();
    }
  }, []);

  // Return hook interface
  return {
    // Connection state
    isConnected,
    error,
    reconnectAttempt,
    isConnecting: isConnectingRef.current,

    // Utility functions
    sendMessage,
    sendPing,
    requestStats,
    reconnect,
    disconnect,

    // Socket instance (for advanced usage)
    socket: socketRef.current,
  };
};
