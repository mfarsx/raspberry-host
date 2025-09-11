import React, { createContext, useContext, useEffect, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

// Create WebSocket context
const WebSocketContext = createContext(null);

// WebSocket provider component
export const WebSocketProvider = ({ children }) => {
  const webSocket = useWebSocket();
  const [lastMessage, setLastMessage] = useState(null);
  const [lastStats, setLastStats] = useState(null);
  const [lastEcho, setLastEcho] = useState(null);
  const [lastPong, setLastPong] = useState(null);

  // Listen for messages and update state
  useEffect(() => {
    if (!webSocket.socket) return;

    const handleMessage = (data) => {
      setLastMessage(data);
    };

    const handleStats = (data) => {
      setLastStats(data);
    };

    const handleEcho = (data) => {
      setLastEcho(data);
    };

    const handlePong = (data) => {
      setLastPong(data);
    };

    // Register listeners
    webSocket.socket.on("message", handleMessage);
    webSocket.socket.on("stats", handleStats);
    webSocket.socket.on("echo", handleEcho);
    webSocket.socket.on("pong", handlePong);

    // Cleanup
    return () => {
      if (webSocket.socket) {
        webSocket.socket.off("message", handleMessage);
        webSocket.socket.off("stats", handleStats);
        webSocket.socket.off("echo", handleEcho);
        webSocket.socket.off("pong", handlePong);
      }
    };
  }, [webSocket.socket]);

  const contextValue = {
    ...webSocket,
    lastMessage,
    lastStats,
    lastEcho,
    lastPong,
    clearLastMessage: () => setLastMessage(null),
    clearLastStats: () => setLastStats(null),
    clearLastEcho: () => setLastEcho(null),
    clearLastPong: () => setLastPong(null),
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }
  return context;
};

export default WebSocketContext;
