import type { AttendanceReportRow } from '@/hooks/useUserInOutTime';
import { normalizeDateKey, toLocalDateString } from '@/lib/reporting-timing';

export type AttendanceGridUserRow = {
  user_id: string;
  user_name: string;
  email: string;
  department?: string;
  byDate: Map<string, AttendanceReportRow>;
};

export const listMonthDatesUpToToday = (month: string): string[] => {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const today = toLocalDateString(new Date());
  const dates: string[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const key = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
    if (key > today) break;
    dates.push(key);
  }

  return dates;
};

export const buildAttendanceGrid = (
  rows: AttendanceReportRow[],
): AttendanceGridUserRow[] => {
  const map = new Map<string, AttendanceGridUserRow>();

  for (const row of rows) {
    const dateKey = normalizeDateKey(row.date);
    if (!dateKey) continue;

    let user = map.get(row.user_id);
    if (!user) {
      user = {
        user_id: row.user_id,
        user_name: row.user_name,
        email: row.email,
        department: row.department,
        byDate: new Map(),
      };
      map.set(row.user_id, user);
    }
    user.byDate.set(dateKey, row);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.user_name.localeCompare(b.user_name),
  );
};

export const formatAttendanceStatus = (row?: AttendanceReportRow): string => {
  if (!row) return '—';
  if (row.day_status === 'leave') return row.leave_type_name || 'Leave';
  if (row.day_status === 'weekly_off') return 'Weekly Off';
  if (row.day_status === 'holiday') return 'Holiday';
  if (row.day_status === 'present') return 'Present';
  if (row.day_status === 'pending') return 'Pending';
  if (row.day_status === 'absent') return 'Absent';
  return '—';
};

export const attendanceStatusClass = (row?: AttendanceReportRow): string => {
  if (!row) return 'text-gray-400';
  switch (row.day_status) {
    case 'present':
      return 'text-emerald-600';
    case 'pending':
      return 'text-sky-600';
    case 'absent':
      return 'text-rose-600';
    case 'weekly_off':
      return 'text-violet-600';
    case 'holiday':
      return 'text-indigo-600';
    case 'leave':
      return 'text-amber-600';
    default:
      return 'text-gray-500';
  }
};

export const formatShortDateHeading = (dateKey: string): string => {
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export const formatGridTime = (value?: string): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  // Prefer ISO; also accept "YYYY-MM-DD HH:mm:ss" from Postgres text
  const candidates = [
    raw,
    raw.includes('T') ? raw : raw.replace(' ', 'T'),
    raw.includes('T') || raw.includes(' ') ? raw : undefined,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  // Already a clock string like "23:00"
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return '—';
};

export const formatHours = (value?: number | null): string => {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(2);
};

/** Alternating soft colors — one palette per day column (cycles every 4 days). */
export const DAY_COLUMN_PALETTE = [
  {
    header: 'bg-sky-100',
    sub: 'bg-sky-50',
    cell: 'bg-sky-50/70',
    headerText: 'text-sky-900',
    subText: 'text-sky-800',
    border: 'border-sky-200',
  },
  {
    header: 'bg-emerald-100',
    sub: 'bg-emerald-50',
    cell: 'bg-emerald-50/70',
    headerText: 'text-emerald-900',
    subText: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  {
    header: 'bg-violet-100',
    sub: 'bg-violet-50',
    cell: 'bg-violet-50/70',
    headerText: 'text-violet-900',
    subText: 'text-violet-800',
    border: 'border-violet-200',
  },
  {
    header: 'bg-amber-100',
    sub: 'bg-amber-50',
    cell: 'bg-amber-50/70',
    headerText: 'text-amber-900',
    subText: 'text-amber-800',
    border: 'border-amber-200',
  },
] as const;

export const getDayColumnPalette = (dayIndex: number) =>
  DAY_COLUMN_PALETTE[dayIndex % DAY_COLUMN_PALETTE.length];
