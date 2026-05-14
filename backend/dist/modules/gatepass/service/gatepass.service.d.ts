import type { CreateGatepassInput, DailyLunchReport, GatepassReason, GatepassStats, GatepassWithProfile, LiveEmployeeStatusReport, LunchAnalyticsRangeReport, LunchEmployeeDetailReport, MonthlyLunchReport, UpdateGatepassStatusInput, UserRole, YearlyLunchReport } from '../../../types';
export declare const getGatepassReasons: () => Promise<GatepassReason[]>;
export declare const getGatepasses: (userId: string, role: UserRole) => Promise<GatepassWithProfile[]>;
export declare const getTodaysGatepasses: (userId: string, role: UserRole) => Promise<GatepassWithProfile[]>;
export declare const searchGatepasses: (query: string, userId: string, role: UserRole) => Promise<GatepassWithProfile[]>;
export declare const getGatepassById: (id: string, actorUserId: string, actorRole: UserRole) => Promise<GatepassWithProfile>;
export declare const getGatepassStats: (userId: string, role: UserRole) => Promise<GatepassStats>;
export declare const getLiveEmployeeStatuses: (employeeId?: string) => Promise<LiveEmployeeStatusReport[]>;
export declare const getLunchAnalyticsRangeReport: (startDateParam?: string, endDateParam?: string, employeeId?: string) => Promise<LunchAnalyticsRangeReport>;
export declare const getLunchEmployeeDetailReport: (userId: string, startDateParam?: string, endDateParam?: string) => Promise<LunchEmployeeDetailReport>;
export declare const getDailyLunchReport: (dateParam?: string, employeeId?: string) => Promise<DailyLunchReport>;
export declare const getMonthlyLunchReport: (monthParam?: string, employeeId?: string) => Promise<MonthlyLunchReport>;
export declare const getYearlyLunchReport: (yearParam?: string, employeeId?: string) => Promise<YearlyLunchReport>;
export declare const createGatepass: (userId: string, input: CreateGatepassInput) => Promise<GatepassWithProfile>;
export declare const updateGatepassStatus: (id: string, input: UpdateGatepassStatusInput, actorUserId: string, actorRole: UserRole) => Promise<GatepassWithProfile>;
export declare const deleteGatepass: (id: string, actorUserId: string, actorRole: UserRole) => Promise<void>;
//# sourceMappingURL=gatepass.service.d.ts.map