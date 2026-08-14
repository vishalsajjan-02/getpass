export type ReportingDayStatus = 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday';

export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Normalize API date values (YYYY-MM-DD, Date, or ISO) to YYYY-MM-DD. */
export const normalizeDateKey = (value?: string | Date | null): string | undefined => {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return toLocalDateString(value);
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  // Prefer the calendar date portion when present (avoids UTC shift for DATE columns).
  const prefix = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return prefix;
  return toLocalDateString(parsed);
};

/**
 * Company weekly off policy:
 * - Every Sunday
 * - 1st Saturday of the month
 * - 3rd Saturday of the month
 */
export const isWeeklyOffDate = (dateKey: string): boolean => {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) return false;

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday

  if (weekday === 0) return true;
  if (weekday !== 6) return false;

  const saturdayOrdinal = Math.floor((day - 1) / 7) + 1;
  return saturdayOrdinal === 1 || saturdayOrdinal === 3;
};

export const resolveReportingDayStatus = (
  inTime?: string,
  outTime?: string,
  reportDate?: string,
  today: string = toLocalDateString(new Date()),
): ReportingDayStatus => {
  const date = normalizeDateKey(reportDate) ?? today;
  const todayKey = normalizeDateKey(today) ?? today;
  const isPastDay = date < todayKey;

  if (!inTime) {
    if (isWeeklyOffDate(date)) return 'weekly_off';
    return isPastDay ? 'absent' : 'pending';
  }
  // In without out stays pending until admin/gatekeeper resolves.
  if (!outTime) {
    return 'pending';
  }
  return 'present';
};

export type ReportingAction = 'in' | 'out' | 'present' | 'absent' | 'weekly_off' | 'holiday' | 'pending';

export interface ReportingStats {
  total: number;
  /** Marked In at gate (has in_time). */
  present: number;
  /** Marked Out (has out_time). */
  out: number;
  /** In only — entered but not left yet. */
  in: number;
}

export const computeReportingStats = (
  rows: Array<{ in_time?: string; out_time?: string }>,
): ReportingStats => {
  const total = rows.length;
  const present = rows.filter((r) => r.in_time).length;
  const out = rows.filter((r) => r.out_time).length;
  const inOnly = rows.filter((r) => r.in_time && !r.out_time).length;
  return { total, present, out, in: inOnly };
};

export const getReportingAction = (
  inTime: string | undefined,
  outTime: string | undefined,
  reportDate: string,
  today: string = toLocalDateString(new Date()),
): ReportingAction => {
  const date = normalizeDateKey(reportDate) ?? reportDate;
  const todayKey = normalizeDateKey(today) ?? today;
  const status = resolveReportingDayStatus(inTime, outTime, date, todayKey);

  if (status === 'weekly_off') return 'weekly_off';
  if (status === 'holiday') return 'holiday';
  if (status === 'absent') return 'absent';
  if (status === 'present') return 'present';
  // pending
  if (!inTime) return 'in';
  // Today: gatekeeper can still mark Out. Past in-only: show Pending for admin.
  if (date >= todayKey) return 'out';
  return 'pending';
};
