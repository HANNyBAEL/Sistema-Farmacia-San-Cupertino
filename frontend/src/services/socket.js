import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

let socket = null;
let listeners = {};

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('🔌 Conectado al servidor WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Desconectado del servidor WebSocket');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};

export const onSocketEvent = (event, callback) => {
  const s = getSocket();
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
  s.on(event, callback);
};

export const offSocketEvent = (event, callback) => {
  const s = getSocket();
  if (listeners[event]) {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }
  s.off(event, callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners = {};
  }
};

export default { connectSocket, getSocket, onSocketEvent, offSocketEvent, disconnectSocket };
