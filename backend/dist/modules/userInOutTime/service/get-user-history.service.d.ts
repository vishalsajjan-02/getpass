import type { UserInOutTime } from '../../../types';
export type UserDayGatepassSummary = {
    id: string;
    reason_name: string;
    display_reason: string;
    status: string;
    gatepass_type: string;
    checked_out_at?: string;
    checked_in_at?: string;
    total_minutes_outside: number;
};
export type UserDayAttendance = {
    date: string;
    in_time?: string;
    out_time?: string;
    in_location?: string;
    out_location?: string;
    in_latitude?: number;
    in_longitude?: number;
    out_latitude?: number;
    out_longitude?: number;
    in_via?: 'self' | 'gatekeeper';
    out_via?: 'self' | 'gatekeeper';
    in_photo_path?: string;
    out_photo_path?: string;
    in_photo_url?: string;
    out_photo_url?: string;
    day_status: 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday' | 'leave';
    leave_type_id?: string;
    leave_type_name?: string;
    /** Gatepasses for this date (useful when out_time is missing). */
    gatepasses?: UserDayGatepassSummary[];
};
export type UsedLeaveEntry = {
    date: string;
    leave_type_id: string;
    leave_type_name: string;
    days: number;
};
export type UserMonthAttendanceResult = {
    days: UserDayAttendance[];
    leave_balance: number;
    leave_used: number;
    used_leaves: UsedLeaveEntry[];
};
export declare const getUserHistory: (userId: string, fromDate?: string, toDate?: string) => Promise<UserInOutTime[]>;
/** Full calendar for a month: every date with in/out times and day status. */
export declare const getUserMonthAttendance: (userId: string, month: string) => Promise<UserMonthAttendanceResult>;
//# sourceMappingURL=get-user-history.service.d.ts.map