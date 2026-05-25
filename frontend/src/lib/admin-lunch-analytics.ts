import type { LunchEmployeeSummary, LunchEntryReport } from '@/hooks/useLunchAnalytics';
import { parseGatepassDate, toDateOnlyKey } from '@/lib/gatepass';

export type LunchChartView = 'daily' | 'monthly' | 'yearly';

export interface LunchChartBarDatum {
  key: string;
  label: string;
  extraMinutes: number;
  lunchMinutes: number;
  allowedMinutes: number;
  violationCount: number;
}

export interface LunchViolatorRow {
  user_id: string;
  employee_name: string;
  department?: string;
  total_extra_lunch_minutes: number;
  violation_count: number;
}

type LunchEntryWithEmployee = LunchEntryReport & {
  employee_name: string;
  department?: string;
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatAnalyticsMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

export const formatChartDateLabel = (dateKey: string): string => {
  const date = parseGatepassDate(dateKey);
  if (!date) return dateKey;
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTH_SHORT[date.getMonth()]}`;
};

export const formatChartMonthLabel = (monthKey: string): string => {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const monthIndex = Number(match[2]) - 1;
  return MONTH_SHORT[monthIndex] ?? monthKey;
};

export const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDefaultChartRange = (): { startDate: string; endDate: string } => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  return { startDate: formatDateOnly(start), endDate: formatDateOnly(end) };
};

export const filterEmployeesByDepartment = (
  employees: LunchEmployeeSummary[],
  departmentName: string | null,
): LunchEmployeeSummary[] => {
  if (!departmentName) return employees;
  return employees.filter((employee) => (employee.department || '').trim() === departmentName);
};

const isLunchEntry = (entry: LunchEntryReport): boolean =>
  entry.reason_name.trim().toLowerCase() === 'lunch';

const getEntryDateKey = (entry: LunchEntryReport): string | null => {
  const fromField = toDateOnlyKey(entry.date);
  if (fromField) return fromField;
  if (entry.checked_out_at) return toDateOnlyKey(entry.checked_out_at);
  return null;
};

const collectLunchEntries = (employees: LunchEmployeeSummary[]): LunchEntryWithEmployee[] =>
  employees.flatMap((employee) =>
    employee.entries
      .filter(isLunchEntry)
      .map((entry) => ({
        ...entry,
        employee_name: employee.employee_name,
        department: employee.department,
      })),
  );

const eachDayInRange = (startDate: string, endDate: string): string[] => {
  const start = parseGatepassDate(startDate);
  const end = parseGatepassDate(endDate);
  if (!start || !end) return [];

  const days: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0);
  const endTime = new Date(end);
  endTime.setHours(12, 0, 0, 0);

  while (cursor.getTime() <= endTime.getTime()) {
    const key = toDateOnlyKey(cursor);
    if (key) days.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

const upsertBucket = (
  map: Map<string, LunchChartBarDatum>,
  key: string,
  label: string,
  lunchMinutes: number,
  extraMinutes: number,
  violationDelta: number,
) => {
  const existing = map.get(key) ?? {
    key,
    label,
    extraMinutes: 0,
    lunchMinutes: 0,
    allowedMinutes: 0,
    violationCount: 0,
  };

  existing.lunchMinutes += lunchMinutes;
  existing.extraMinutes += extraMinutes;
  existing.allowedMinutes += Math.max(0, lunchMinutes - extraMinutes);
  existing.violationCount += violationDelta;
  map.set(key, existing);
};

export const buildDailyLunchChartData = (
  employees: LunchEmployeeSummary[],
  startDate: string,
  endDate: string,
): LunchChartBarDatum[] => {
  const entries = collectLunchEntries(employees);
  const bucketMap = new Map<string, LunchChartBarDatum>();

  for (const dayKey of eachDayInRange(startDate, endDate)) {
    bucketMap.set(dayKey, {
      key: dayKey,
      label: formatChartDateLabel(dayKey),
      extraMinutes: 0,
      lunchMinutes: 0,
      allowedMinutes: 0,
      violationCount: 0,
    });
  }

  for (const entry of entries) {
    const dateKey = getEntryDateKey(entry);
    if (!dateKey || dateKey < startDate || dateKey > endDate) continue;

    const extra = Math.max(0, entry.extra_lunch_minutes);
    const lunch = Math.max(0, entry.lunch_duration_minutes);
    upsertBucket(
      bucketMap,
      dateKey,
      formatChartDateLabel(dateKey),
      lunch,
      extra,
      extra > 0 ? 1 : 0,
    );
  }

  return [...bucketMap.values()].sort((left, right) => left.key.localeCompare(right.key));
};

export const buildMonthlyLunchChartData = (
  employees: LunchEmployeeSummary[],
  startDate: string,
  endDate: string,
): LunchChartBarDatum[] => {
  const entries = collectLunchEntries(employees);
  const bucketMap = new Map<string, LunchChartBarDatum>();

  for (const entry of entries) {
    const dateKey = getEntryDateKey(entry);
    if (!dateKey || dateKey < startDate || dateKey > endDate) continue;

    const monthKey = dateKey.slice(0, 7);
    const extra = Math.max(0, entry.extra_lunch_minutes);
    const lunch = Math.max(0, entry.lunch_duration_minutes);
    upsertBucket(
      bucketMap,
      monthKey,
      formatChartMonthLabel(monthKey),
      lunch,
      extra,
      extra > 0 ? 1 : 0,
    );
  }

  return [...bucketMap.values()].sort((left, right) => left.key.localeCompare(right.key));
};

export const buildYearlyLunchChartData = (
  employees: LunchEmployeeSummary[],
  startDate: string,
  endDate: string,
): LunchChartBarDatum[] => {
  const entries = collectLunchEntries(employees);
  const bucketMap = new Map<string, LunchChartBarDatum>();

  for (const entry of entries) {
    const dateKey = getEntryDateKey(entry);
    if (!dateKey || dateKey < startDate || dateKey > endDate) continue;

    const yearKey = dateKey.slice(0, 4);
    const extra = Math.max(0, entry.extra_lunch_minutes);
    const lunch = Math.max(0, entry.lunch_duration_minutes);
    upsertBucket(bucketMap, yearKey, yearKey, lunch, extra, extra > 0 ? 1 : 0);
  }

  return [...bucketMap.values()].sort((left, right) => left.key.localeCompare(right.key));
};

export const buildLunchChartData = (
  view: LunchChartView,
  employees: LunchEmployeeSummary[],
  startDate: string,
  endDate: string,
): LunchChartBarDatum[] => {
  switch (view) {
    case 'monthly':
      return buildMonthlyLunchChartData(employees, startDate, endDate);
    case 'yearly':
      return buildYearlyLunchChartData(employees, startDate, endDate);
    default:
      return buildDailyLunchChartData(employees, startDate, endDate);
  }
};

export const getTopLunchViolators = (
  employees: LunchEmployeeSummary[],
  limit = 10,
): LunchViolatorRow[] =>
  [...employees]
    .filter((employee) => employee.total_extra_lunch_minutes > 0)
    .sort((left, right) => {
      if (right.total_extra_lunch_minutes !== left.total_extra_lunch_minutes) {
        return right.total_extra_lunch_minutes - left.total_extra_lunch_minutes;
      }
      return right.violation_count - left.violation_count;
    })
    .slice(0, limit)
    .map((employee) => ({
      user_id: employee.user_id,
      employee_name: employee.employee_name,
      department: employee.department,
      total_extra_lunch_minutes: employee.total_extra_lunch_minutes,
      violation_count: employee.violation_count,
    }));

export const hasLunchChartData = (data: LunchChartBarDatum[]): boolean =>
  data.some((item) => item.lunchMinutes > 0 || item.extraMinutes > 0);
