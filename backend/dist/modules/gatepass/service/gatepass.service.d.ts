import type { GatepassReason, GatepassWithProfile, GatepassStats, CreateGatepassInput, UpdateGatepassStatusInput, UserRole } from '../../../types';
export declare const getGatepassReasons: () => Promise<GatepassReason[]>;
export declare const getGatepasses: (userId: string, role: UserRole) => Promise<GatepassWithProfile[]>;
export declare const getTodaysGatepasses: (userId: string, role: UserRole) => Promise<GatepassWithProfile[]>;
export declare const searchGatepasses: (query: string, userId: string, role: UserRole) => Promise<GatepassWithProfile[]>;
export declare const getGatepassById: (id: string) => Promise<GatepassWithProfile>;
export declare const getGatepassStats: (userId?: string) => Promise<GatepassStats>;
export declare const createGatepass: (userId: string, input: CreateGatepassInput) => Promise<GatepassWithProfile>;
export declare const updateGatepassStatus: (id: string, input: UpdateGatepassStatusInput) => Promise<GatepassWithProfile>;
export declare const deleteGatepass: (id: string) => Promise<void>;
//# sourceMappingURL=gatepass.service.d.ts.map