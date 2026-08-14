import { getDb } from '../../../../config/database';
import type { AttendanceState, UserAttendance } from '../../../../types';
import type { PoolClient } from 'pg';
type Queryable = ReturnType<typeof getDb> | PoolClient;
export type { AttendanceState, UserAttendance };
export declare const isValidDate: (value: string) => boolean;
export declare const todayDate: () => string;
/** Normalize YYYY-MM-DD, Date, or ISO-like values to YYYY-MM-DD. */
export declare const normalizeDateKey: (value?: string | Date | null) => string | undefined;
export declare const resolveDate: (date?: string | Date) => string;
export declare const ensureUserExists: (userId: string) => Promise<void>;
/** First day the user exists in the system (account create date as YYYY-MM-DD). */
export declare const getUserEmploymentStartDate: (userId: string) => Promise<string>;
/** Later of two YYYY-MM-DD keys. */
export declare const maxDateKey: (a: string, b: string) => string;
export type ReportingDayStatus = 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday';
/**
 * Company weekly off policy:
 * - Every Sunday
 * - 1st Saturday of the month
 * - 3rd Saturday of the month
 */
export declare const isWeeklyOffDate: (dateKey: string) => boolean;
export declare const loadCompanyHolidayDates: (db: Queryable, fromDate: string, toDate: string) => Promise<Set<string>>;
/** Final day status: holiday / weekly off / absent / present / pending.
 * Present requires both in and out. In-only stays pending for admin review.
 */
export declare const resolveReportingDayStatus: (inTime?: string | null, outTime?: string | null, reportDate?: string, today?: string, holidayDates?: Set<string>) => ReportingDayStatus;
export declare const getUserAttendance: (db: Queryable, userId: string, date?: string | Date) => Promise<UserAttendance>;
export declare const assertUserPresentForGatepass: (db: Queryable, userId: string, date?: string | Date) => Promise<void>;
//# sourceMappingURL=user-in-out-time.shared.d.ts.map