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

const ATTENDANCE_EVENT = 'attendance:updated';
const PUNCH_PERMISSION_EVENT = 'user:punch-permission';

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

const invalidateAttendanceQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
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
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const handleGatepassEvent = () => {
      invalidateGatepassQueries(queryClient);
    };

    const handleAttendanceEvent = (payload?: {
      attendance?: {
        user_id: string;
        date: string;
        state: 'absent' | 'present' | 'left';
        in_time?: string;
        out_time?: string;
      };
    }) => {
      const next = payload?.attendance;
      if (next && next.user_id === user.id) {
        // Instantly unlock/lock the New Gatepass button before refetch completes.
        queryClient.setQueryData(['user-in-out-time', 'me', 'today'], {
          date: next.date,
          state: next.state,
          in_time: next.in_time,
          out_time: next.out_time,
        });
      }
      invalidateAttendanceQueries(queryClient);
    };

    const handleConnectError = (error: Error) => {
      if (import.meta.env.DEV) {
        console.warn('Socket reconnecting:', error.message);
      }
    };

    GATEPASS_EVENTS.forEach((eventName) => {
      nextSocket.on(eventName, handleGatepassEvent);
    });
    nextSocket.on(ATTENDANCE_EVENT, handleAttendanceEvent);
    nextSocket.on(PUNCH_PERMISSION_EVENT, () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
    });
    nextSocket.on('connect_error', handleConnectError);

    setSocket(nextSocket);

    return () => {
      GATEPASS_EVENTS.forEach((eventName) => {
        nextSocket.off(eventName, handleGatepassEvent);
      });
      nextSocket.off(ATTENDANCE_EVENT, handleAttendanceEvent);
      nextSocket.off(PUNCH_PERMISSION_EVENT);
      nextSocket.off('connect_error', handleConnectError);
      if (nextSocket.connected) {
        nextSocket.disconnect();
      } else {
        nextSocket.close();
      }
      setSocket(null);
    };
  }, [queryClient, user]);

  const value = useMemo(() => socket, [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (): Socket | null => useContext(SocketContext);
