// contexts/SocketContext.js
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    socketInstance.on('gameUpdate', (newState) => {
      setGameState(newState);
    });

    socketInstance.on('chatMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('joinRoom', { roomId });
    }
  };

  const sendGameAction = (action, data) => {
    if (socket && isConnected) {
      socket.emit(action, data);
    }
  };

  const sendChatMessage = (message) => {
    if (socket && isConnected) {
      socket.emit('chatMessage', { message });
    }
  };

  const value = {
    isConnected,
    gameState,
    messages,
    sendGameAction,
    sendChatMessage,
    joinRoom,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}