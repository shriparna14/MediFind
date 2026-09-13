import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to backend Socket.IO
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    console.log('🔌 Attempting Socket connection...');

    return () => {
      newSocket.close();
      console.log('🔌 Closed Socket connection');
    };
  }, []);

  // When user logs in, join their private socket room to receive direct targeted alerts
  useEffect(() => {
    if (socket && user) {
      const roomId = user.id || user._id;
      if (roomId) {
        socket.emit('join_room', roomId);
        console.log(`🔌 Registered Socket for user room: ${roomId}`);
      }
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
