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

const getMonday = (date: Date): Date => {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday;
};

const formatWeekLabel = (weekStart: Date): string => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startFmt = weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const endFmt = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${startFmt} – ${endFmt}`;
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

export type WeeklyExtraDatum = {
  weekStart: string;
  label: string;
  minutes: number;
};

export const buildWeeklyExtraTimeData = (
  gatepasses: Gatepass[],
  rangeStart: string | null,
): WeeklyExtraDatum[] => {
  const end = new Date();
  end.setHours(12, 0, 0, 0);

  let start: Date = parseGatepassDate(rangeStart ?? '') ?? new Date(end);
  if (!rangeStart) {
    const sortedDates = [...gatepasses]
      .map((g) => toDateOnlyKey(g.date))
      .filter((d): d is string => d !== null)
      .sort();
    if (sortedDates.length > 0) {
      start = parseGatepassDate(sortedDates[0]) ?? start;
    } else {
      start = new Date(end);
      start.setDate(end.getDate() - 56);
    }
  }

  const cursor = getMonday(start);
  const endMonday = getMonday(end);
  const weeks: WeeklyExtraDatum[] = [];

  while (cursor.getTime() <= endMonday.getTime()) {
    const weekKey = toDateOnlyKey(cursor);
    if (weekKey) {
      weeks.push({
        weekStart: weekKey,
        label: formatWeekLabel(cursor),
        minutes: 0,
      });
    }
    cursor.setDate(cursor.getDate() + 7);
  }

  gatepasses.forEach((gatepass) => {
    const extra = calculateExtraLunchMinutes(gatepass);
    if (extra <= 0) return;

    const gatepassDate = parseGatepassDate(gatepass.date);
    if (!gatepassDate) return;

    const weekStart = toDateOnlyKey(getMonday(gatepassDate));
    if (!weekStart) return;

    const bucket = weeks.find((week) => week.weekStart === weekStart);
    if (bucket) bucket.minutes += extra;
  });

  return weeks;
};
