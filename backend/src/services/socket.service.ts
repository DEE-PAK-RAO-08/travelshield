import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';

let io: Server;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
  });

  // Middleware for Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected to socket: ${userId} (Socket ID: ${socket.id})`);

    // Join a personal room for targeted notifications
    socket.join(`user_${userId}`);

    // Join tracking room if needed
    socket.on('join_tracking', (trackingSessionId: string) => {
      socket.join(`tracking_${trackingSessionId}`);
      logger.info(`User ${userId} joined tracking session ${trackingSessionId}`);
    });

    socket.on('leave_tracking', (trackingSessionId: string) => {
      socket.leave(`tracking_${trackingSessionId}`);
    });

    // Real-time location update broadcast
    socket.on('location_update', (data: { trackingSessionId: string; lat: number; lng: number; timestamp: string }) => {
      // Broadcast to everyone else in this tracking session
      socket.to(`tracking_${data.trackingSessionId}`).emit('live_location', data);
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });

  logger.info('Socket.IO initialized (in-memory mode)');
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
