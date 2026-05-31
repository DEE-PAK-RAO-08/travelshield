import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  // Socket.IO expects the base domain without /api (or depends on backend config)
  // Let's parse the base URL out of VITE_API_URL
  const baseUrl = apiUrl.replace(/\/api$/, '');

  socket = io(baseUrl, {
    auth: { token },
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Connected to real-time safety network');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from real-time network');
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
