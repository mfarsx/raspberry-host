import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from './logger';
import { getRedisClient } from './redis';

export const setupSocketIO = (io: SocketIOServer): void => {
  // Connection handling
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join client to a room for broadcasting
    socket.join('general');
    
    // Handle client messages
    socket.on('message', (data: any) => {
      logger.info(`Message from ${socket.id}:`, data);
      
      // Echo the message back to the client
      socket.emit('echo', {
        message: `Echo: ${data.message}`,
        timestamp: new Date().toISOString(),
        clientId: socket.id
      });
      
      // Broadcast to all clients in the room
      socket.to('general').emit('message', {
        ...data,
        from: socket.id,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle stats requests
    socket.on('stats', () => {
      const stats = {
        connectedClients: io.engine.clientsCount,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      
      socket.emit('stats', stats);
      logger.info(`Stats requested by ${socket.id}`);
    });
    
    // Handle echo requests
    socket.on('echo', (data: any) => {
      socket.emit('echo', {
        message: data.message,
        timestamp: new Date().toISOString(),
        clientId: socket.id
      });
    });
    
    // Handle ping/pong
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    
    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error(`Socket error from ${socket.id}:`, error);
    });
  });
  
  // Server-wide events
  io.engine.on('connection_error', (error: Error) => {
    logger.error('Socket.IO connection error:', error);
  });
  
  logger.info('Socket.IO server configured');
};