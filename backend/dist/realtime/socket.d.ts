import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { GatepassWithProfile } from '../types';
type GatepassSocketEvent = 'gatepass:new-request' | 'gatepass:approved' | 'gatepass:rejected' | 'gatepass:out' | 'gatepass:in' | 'gatepass:status-updated';
export declare const initSocketServer: (server: HttpServer) => Server;
export declare const emitGatepassSocketEvent: (eventName: GatepassSocketEvent, gatepass: GatepassWithProfile) => void;
export {};
//# sourceMappingURL=socket.d.ts.map