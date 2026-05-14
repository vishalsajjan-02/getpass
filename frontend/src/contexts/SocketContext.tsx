import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

type GatepassSocketEvent =
  | 'gatepass:new-request'
  | 'gatepass:approved'
  | 'gatepass:rejected'
  | 'gatepass:out'
  | 'gatepass:in'
  | 'gatepass:status-updated';

const GATEPASS_EVENTS: GatepassSocketEvent[] = [
  'gatepass:new-request',
  'gatepass:approved',
  'gatepass:rejected',
  'gatepass:out',
  'gatepass:in',
  'gatepass:status-updated',
];

const SocketContext = createContext<Socket | null>(null);

const invalidateGatepassQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const rootKey = Array.isArray(query.queryKey) ? String(query.queryKey[0]) : '';
      return [
        'gatepasses',
        'todays-gatepasses',
        'gatepasses-search',
        'gatepass-stats',
        'lunch-daily-report',
        'lunch-range-report',
        'lunch-monthly-report',
        'lunch-yearly-report',
        'lunch-employee-detail',
        'live-employee-status',
      ].includes(rootKey);
    },
  });
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || !token) {
      setSocket((currentSocket) => {
        currentSocket?.disconnect();
        return null;
      });
      return;
    }

    const nextSocket = io('/', {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    const handleGatepassEvent = () => {
      invalidateGatepassQueries(queryClient);
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error.message);
    };

    GATEPASS_EVENTS.forEach((eventName) => {
      nextSocket.on(eventName, handleGatepassEvent);
    });
    nextSocket.on('connect_error', handleConnectError);

    setSocket(nextSocket);

    return () => {
      GATEPASS_EVENTS.forEach((eventName) => {
        nextSocket.off(eventName, handleGatepassEvent);
      });
      nextSocket.off('connect_error', handleConnectError);
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [queryClient, user]);

  const value = useMemo(() => socket, [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): Socket | null => useContext(SocketContext);
