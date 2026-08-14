import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { GatepassWithProfile } from '../types';
type GatepassSocketEvent = 'gatepass:new-request' | 'gatepass:approved' | 'gatepass:rejected' | 'gatepass:out' | 'gatepass:in' | 'gatepass:status-updated';
export type AttendanceSocketPayload = {
    user_id: string;
    date: string;
    state: 'absent' | 'present' | 'left';
    in_time?: string;
    out_time?: string;
};
export declare const initSocketServer: (server: HttpServer) => Server;
export declare const emitGatepassSocketEvent: (eventName: GatepassSocketEvent, gatepass: GatepassWithProfile) => void;
/** Notify the employee (+ attendance viewers) when in/out status changes. */
export declare const emitAttendanceSocketEvent: (attendance: AttendanceSocketPayload) => void;
export type PunchPermissionSocketPayload = {
    user_id: string;
    can_self_punch: boolean;
};
/** Notify a user when admin toggles their self-punch permission. */
export declare const emitPunchPermissionSocketEvent: (payload: PunchPermissionSocketPayload) => void;
export {};
//# sourceMappingURL=socket.d.ts.map