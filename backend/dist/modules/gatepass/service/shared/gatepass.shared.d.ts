import type { CreateGatepassInput, Gatepass, GatepassApprovalRequest, GatepassReason, GatepassStatus, GatepassWithProfile, LiveEmployeeStatusReport, LunchActivityLog, LunchAnalyticsRangeReport, LunchEmployeeSummary, UserRole } from '../../../../types';
export declare const LUNCH_REASON_NAME = "lunch";
export declare const LUNCH_LIMIT_MINUTES: number;
type Queryable = {
    query: (text: string, params?: unknown[]) => Promise<{
        rows: Record<string, unknown>[];
    }>;
};
type RequesterContext = {
    id: string;
    role: UserRole;
    manager_id?: string;
};
type LunchEntryRow = {
    user_id: string;
    employee_name: string;
    department?: string;
    id: string;
    date: string;
    reason_name: string;
    status: GatepassStatus;
    checked_out_at?: string;
    checked_in_at?: string;
    total_minutes_outside: number;
};
export declare const optionalString: (value: unknown) => string | undefined;
export declare const isPermanentOutGatepass: (gatepass: Pick<Gatepass, "gatepass_type" | "reason_name">) => boolean;
export declare const buildVisibilityClause: (role: UserRole, userId: string, startingParamIndex: number) => {
    clause?: string;
    params: unknown[];
};
export declare const runGatepassQuery: (db: Queryable, conditions: string[], params: unknown[]) => Promise<GatepassWithProfile[]>;
export declare const getGatepassByIdInternal: (db: Queryable, id: string) => Promise<GatepassWithProfile>;
export declare const getRequesterContext: (db: Queryable, userId: string) => Promise<RequesterContext>;
export declare const getPrimaryAdminId: (db: Queryable) => Promise<string>;
export declare const resolveReason: (db: Queryable, input: CreateGatepassInput) => Promise<GatepassReason>;
export declare const getPendingApprovalForActor: (db: Queryable, gatepassId: string, actorUserId: string, approverRole: "admin" | "manager") => Promise<GatepassApprovalRequest>;
export declare const getApprovalRequestByStep: (db: Queryable, gatepassId: string, step: 1 | 2) => Promise<GatepassApprovalRequest>;
export declare const cancelPendingApprovalRequests: (db: Queryable, gatepassId: string, remarks: string) => Promise<void>;
export declare const calculateWorkingMinutesOutside: (checkedOutAt: Date, checkedInAt: Date) => number;
export declare const emitRealtimeUpdate: (gatepass: GatepassWithProfile, eventName?: "gatepass:new-request" | "gatepass:approved" | "gatepass:rejected" | "gatepass:out" | "gatepass:in") => void;
export declare const parseTimestamp: (value?: string) => Date | null;
export declare const calculateMinutesBetween: (startValue?: string, endValue?: string, fallbackEnd?: Date) => number;
export declare const calculateExtraLunchMinutes: (durationMinutes: number) => number;
export declare const parseDateParam: (value: string | undefined, fallback: Date) => string;
export declare const parseMonthParam: (value?: string) => {
    monthLabel: string;
    startDate: string;
    endDate: string;
};
export declare const parseYearParam: (value?: string) => {
    year: number;
    startDate: string;
    endDate: string;
};
export declare const normalizeDateRange: (startDateParam?: string, endDateParam?: string) => {
    startDate: string;
    endDate: string;
};
export declare const getLiveEmployeeStatusesInternal: (db: Queryable, employeeId?: string) => Promise<LiveEmployeeStatusReport[]>;
export declare const getLunchEntriesInRange: (db: Queryable, startDate: string, endDate: string, employeeId?: string) => Promise<LunchEntryRow[]>;
export declare const getEmployeeActivityLogsInRange: (db: Queryable, userId: string, startDate: string, endDate: string) => Promise<LunchActivityLog[]>;
export declare const buildLunchEmployeeSummaries: (liveStatuses: LiveEmployeeStatusReport[], entries: LunchEntryRow[]) => LunchEmployeeSummary[];
export declare const getTopLunchViolators: (employees: LunchEmployeeSummary[]) => LunchEmployeeSummary[];
export declare const filterEmployeesWithHistory: (employees: LunchEmployeeSummary[]) => LunchEmployeeSummary[];
export declare const buildLunchAnalyticsRangeReport: (startDate: string, endDate: string, employeeId?: string) => Promise<LunchAnalyticsRangeReport>;
export {};
//# sourceMappingURL=gatepass.shared.d.ts.map