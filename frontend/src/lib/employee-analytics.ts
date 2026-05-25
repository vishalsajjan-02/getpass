import type { Gatepass } from '@/hooks/useGatepasses';
import { parseGatepassDate, toDateOnlyKey } from '@/lib/gatepass';

/** Matches backend default lunch allowance (30 min). */
export const LUNCH_LIMIT_MINUTES = 30;

export type ReasonCategory = 'Out' | 'Lunch' | 'Other';

export const REASON_CATEGORY_COLORS: Record<ReasonCategory, string> = {
  Out: '#3b82f6',
  Lunch: '#f59e0b',
  Other: '#8b5cf6',
};

export const normalizeReasonCategory = (reasonName: string): ReasonCategory => {
  const name = reasonName.trim().toLowerCase();
  if (name === 'out') return 'Out';
  if (name === 'lunch') return 'Lunch';
  return 'Other';
};

const parseTimestamp = (value?: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const calculateLunchDurationMinutes = (gatepass: Gatepass): number => {
  const start = parseTimestamp(gatepass.checked_out_at);
  if (start === null) return 0;
  const end = parseTimestamp(gatepass.checked_in_at) ?? Date.now();
  return Math.max(0, Math.floor((end - start) / 60000));
};

export const calculateExtraLunchMinutes = (gatepass: Gatepass): number => {
  if (gatepass.reason_name.trim().toLowerCase() !== 'lunch') return 0;
  return Math.max(0, calculateLunchDurationMinutes(gatepass) - LUNCH_LIMIT_MINUTES);
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  return MONTH_SHORT[Number(match[2]) - 1] ?? monthKey;
};

const isLunchGatepass = (gatepass: Gatepass): boolean =>
  gatepass.reason_name.trim().toLowerCase() === 'lunch';

const getGatepassDateKey = (gatepass: Gatepass): string | null => {
  const fromDate = toDateOnlyKey(gatepass.date);
  if (fromDate) return fromDate;
  if (gatepass.checked_out_at) return toDateOnlyKey(gatepass.checked_out_at);
  return null;
};

export const getEmployeeChartRange = (
  gatepasses: Gatepass[],
  rangeStart: string | null,
): { startDate: string; endDate: string } => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const endDate = formatDateOnly(end);

  if (rangeStart) {
    return { startDate: rangeStart, endDate };
  }

  const lunchDates = gatepasses
    .filter(isLunchGatepass)
    .map(getGatepassDateKey)
    .filter((value): value is string => value !== null)
    .sort();

  if (lunchDates.length > 0) {
    return { startDate: lunchDates[0], endDate };
  }

  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  return { startDate: formatDateOnly(start), endDate };
};

export type ReasonPieDatum = {
  category: ReasonCategory;
  count: number;
  fill: string;
};

export const buildReasonPieData = (gatepasses: Gatepass[]): ReasonPieDatum[] => {
  const counts: Record<ReasonCategory, number> = { Out: 0, Lunch: 0, Other: 0 };
  gatepasses.forEach((gatepass) => {
    counts[normalizeReasonCategory(gatepass.reason_name)] += 1;
  });

  return (['Out', 'Lunch', 'Other'] as ReasonCategory[])
    .map((category) => ({
      category,
      count: counts[category],
      fill: REASON_CATEGORY_COLORS[category],
    }))
    .filter((item) => item.count > 0);
};

export type LunchBarView = 'daily' | 'monthly' | 'yearly';

export type LunchChartFilter = {
  view: LunchBarView;
  year: number;
  /** 1–12; used when view is daily. */
  month: number;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const getMonthSelectOptions = (): { value: number; label: string }[] =>
  MONTH_NAMES.map((label, index) => ({ value: index + 1, label }));

export const getLunchChartPeriodLabel = (filter: LunchChartFilter): string => {
  if (filter.view === 'daily') {
    return `${MONTH_NAMES[filter.month - 1]} ${filter.year}`;
  }
  if (filter.view === 'monthly') {
    return String(filter.year);
  }
  return 'All years';
};

export const getLunchChartDateRange = (
  filter: LunchChartFilter,
  gatepasses: Gatepass[],
): { startDate: string; endDate: string } => {
  if (filter.view === 'daily') {
    const start = new Date(filter.year, filter.month - 1, 1);
    const end = new Date(filter.year, filter.month, 0);
    return { startDate: formatDateOnly(start), endDate: formatDateOnly(end) };
  }

  if (filter.view === 'monthly') {
    return {
      startDate: `${filter.year}-01-01`,
      endDate: `${filter.year}-12-31`,
    };
  }

  return getEmployeeChartRange(gatepasses, null);
};

/** Years present in gatepass data plus current year (for dropdowns). */
export const getAvailableChartYears = (gatepasses: Gatepass[]): number[] => {
  const years = new Set<number>([new Date().getFullYear()]);
  gatepasses.forEach((gatepass) => {
    const key = getGatepassDateKey(gatepass);
    if (key) years.add(Number(key.slice(0, 4)));
  });
  return [...years].sort((a, b) => b - a);
};

export type EmployeeLunchBarDatum = {
  key: string;
  label: string;
  extraMinutes: number;
  lunchMinutes: number;
  allowedMinutes: number;
};

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

const upsertBarBucket = (
  map: Map<string, EmployeeLunchBarDatum>,
  key: string,
  label: string,
  lunchMinutes: number,
  extraMinutes: number,
) => {
  const existing = map.get(key) ?? {
    key,
    label,
    extraMinutes: 0,
    lunchMinutes: 0,
    allowedMinutes: 0,
  };

  existing.lunchMinutes += lunchMinutes;
  existing.extraMinutes += extraMinutes;
  existing.allowedMinutes += Math.max(0, lunchMinutes - extraMinutes);
  map.set(key, existing);
};

const aggregateLunchGatepasses = (
  gatepasses: Gatepass[],
  startDate: string,
  endDate: string,
  bucketKey: (dateKey: string) => string,
  bucketLabel: (bucket: string) => string,
  fillDays?: string[],
): EmployeeLunchBarDatum[] => {
  const map = new Map<string, EmployeeLunchBarDatum>();

  if (fillDays) {
    for (const dayKey of fillDays) {
      map.set(dayKey, {
        key: dayKey,
        label: bucketLabel(dayKey),
        extraMinutes: 0,
        lunchMinutes: 0,
        allowedMinutes: 0,
      });
    }
  }

  for (const gatepass of gatepasses) {
    if (!isLunchGatepass(gatepass)) continue;

    const dateKey = getGatepassDateKey(gatepass);
    if (!dateKey || dateKey < startDate || dateKey > endDate) continue;

    const lunch = calculateLunchDurationMinutes(gatepass);
    const extra = calculateExtraLunchMinutes(gatepass);
    const key = bucketKey(dateKey);
    upsertBarBucket(map, key, bucketLabel(key), lunch, extra);
  }

  return [...map.values()].sort((left, right) => left.key.localeCompare(right.key));
};

export const buildEmployeeLunchBarData = (
  gatepasses: Gatepass[],
  filter: LunchChartFilter,
): EmployeeLunchBarDatum[] => {
  const { startDate, endDate } = getLunchChartDateRange(filter, gatepasses);
  const { view } = filter;

  if (view === 'monthly') {
    return aggregateLunchGatepasses(
      gatepasses,
      startDate,
      endDate,
      (dateKey) => dateKey.slice(0, 7),
      formatChartMonthLabel,
    );
  }

  if (view === 'yearly') {
    return aggregateLunchGatepasses(
      gatepasses,
      startDate,
      endDate,
      (dateKey) => dateKey.slice(0, 4),
      (yearKey) => yearKey,
    );
  }

  return aggregateLunchGatepasses(
    gatepasses,
    startDate,
    endDate,
    (dateKey) => dateKey,
    formatChartDateLabel,
    eachDayInRange(startDate, endDate),
  );
};

export const hasEmployeeLunchBarData = (data: EmployeeLunchBarDatum[]): boolean =>
  data.some((item) => item.lunchMinutes > 0 || item.extraMinutes > 0);
