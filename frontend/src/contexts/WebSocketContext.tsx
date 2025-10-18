import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

interface WebSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log('🔌 Creating single WebSocket connection...');
    
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ WebSocket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ WebSocket disconnected');
    });

    socket.on('newEvent', (data: any) => {
      const message: WebSocketMessage = {
        type: 'newEvent',
        data,
        timestamp: Date.now(),
      };
      console.log('📨 newEvent received');
      setLastMessage(message);
    });

    socket.on('statsUpdate', (data: any) => {
      const message: WebSocketMessage = {
        type: 'statsUpdate',
        data,
        timestamp: Date.now(),
      };
      console.log('📊 statsUpdate received:', data);
      setLastMessage(message);
    });

    socket.on('blockUpdate', (data: any) => {
      const message: WebSocketMessage = {
        type: 'blockUpdate',
        data,
        timestamp: Date.now(),
      };
      console.log('🔗 blockUpdate received');
      setLastMessage(message);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    return () => {
      console.log('🔌 Closing WebSocket connection...');
      socket.close();
      socketRef.current = null;
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current, isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}