"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitPunchPermissionSocketEvent = exports.emitAttendanceSocketEvent = exports.emitGatepassSocketEvent = exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jwt_utils_1 = require("../utils/jwt.utils");
const roleRoom = (role) => `role:${role}`;
const userRoom = (userId) => `user:${userId}`;
let io = null;
const getHandshakeToken = (socket) => {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim())
        return authToken.trim();
    const header = socket.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
        return header.slice(7).trim();
    }
    return null;
};
const getInterestedRooms = (gatepass) => {
    const rooms = new Set([
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
const initSocketServer = (server) => {
    if (io)
        return io;
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            credentials: true,
        },
    });
    io.use((socket, next) => {
        try {
            const token = getHandshakeToken(socket);
            if (!token) {
                next(new Error('Unauthorized'));
                return;
            }
            const payload = (0, jwt_utils_1.verifyToken)(token);
            socket.data.user = payload;
            next();
        }
        catch {
            next(new Error('Unauthorized'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        socket.join(userRoom(user.userId));
        socket.join(roleRoom(user.role));
    });
    return io;
};
exports.initSocketServer = initSocketServer;
const emitGatepassSocketEvent = (eventName, gatepass) => {
    if (!io)
        return;
    const payload = {
        event: eventName,
        gatepass,
    };
    for (const room of getInterestedRooms(gatepass)) {
        io.to(room).emit(eventName, payload);
    }
};
exports.emitGatepassSocketEvent = emitGatepassSocketEvent;
/** Notify the employee (+ attendance viewers) when in/out status changes. */
const emitAttendanceSocketEvent = (attendance) => {
    if (!io)
        return;
    const payload = {
        event: 'attendance:updated',
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
exports.emitAttendanceSocketEvent = emitAttendanceSocketEvent;
/** Notify a user when admin toggles their self-punch permission. */
const emitPunchPermissionSocketEvent = (payload) => {
    if (!io)
        return;
    io.to(userRoom(payload.user_id)).emit('user:punch-permission', {
        event: 'user:punch-permission',
        permission: payload,
    });
};
exports.emitPunchPermissionSocketEvent = emitPunchPermissionSocketEvent;
//# sourceMappingURL=socket.js.map