import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.utils';
import type { AuthPayload, GatepassWithProfile, UserRole } from '../types';

type GatepassSocketEvent =
  | 'gatepass:new-request'
  | 'gatepass:approved'
  | 'gatepass:rejected'
  | 'gatepass:out'
  | 'gatepass:in'
  | 'gatepass:status-updated';

export type AttendanceSocketPayload = {
  user_id: string;
  date: string;
  state: 'absent' | 'present' | 'left';
  in_time?: string;
  out_time?: string;
};

type AuthenticatedSocket = Socket & {
  data: {
    user?: AuthPayload;
  };
};

const roleRoom = (role: UserRole): string => `role:${role}`;
const userRoom = (userId: string): string => `user:${userId}`;

let io: Server | null = null;

const getHandshakeToken = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  return null;
};

const getInterestedRooms = (gatepass: GatepassWithProfile): string[] => {
  const rooms = new Set<string>([
    roleRoom('admin'),
    roleRoom('gatekeeper'),
    userRoom(gatepass.user_id),
  ]);

  for (const approval of gatepass.approval_requests) {
    if (approval.approver_role === 'manager') {
      rooms.add(userRoom(approval.approver_user_id));
    }
  }

  return [...rooms];
};

export const initSocketServer = (server: HttpServer): Server => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = getHandshakeToken(socket);
      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      const payload = verifyToken(token);
      (socket as AuthenticatedSocket).data.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as AuthenticatedSocket).data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.join(userRoom(user.userId));
    socket.join(roleRoom(user.role));
  });

  return io;
};

export const emitGatepassSocketEvent = (
  eventName: GatepassSocketEvent,
  gatepass: GatepassWithProfile,
): void => {
  if (!io) return;

  const payload = {
    event: eventName,
    gatepass,
  };

  for (const room of getInterestedRooms(gatepass)) {
    io.to(room).emit(eventName, payload);
  }
};

/** Notify the employee (+ attendance viewers) when in/out status changes. */
export const emitAttendanceSocketEvent = (attendance: AttendanceSocketPayload): void => {
  if (!io) return;

  const payload = {
    event: 'attendance:updated' as const,
    attendance,
  };

  const rooms = [
    userRoom(attendance.user_id),
    roleRoom('admin'),
    roleRoom('manager'),
    roleRoom('gatekeeper'),
  ];

  for (const room of rooms) {
    io.to(room).emit('attendance:updated', payload);
  }
};

export type PunchPermissionSocketPayload = {
  user_id: string;
  can_self_punch: boolean;
};

/** Notify a user when admin toggles their self-punch permission. */
export const emitPunchPermissionSocketEvent = (
  payload: PunchPermissionSocketPayload,
): void => {
  if (!io) return;

  io.to(userRoom(payload.user_id)).emit('user:punch-permission', {
    event: 'user:punch-permission' as const,
    permission: payload,
  });
};
