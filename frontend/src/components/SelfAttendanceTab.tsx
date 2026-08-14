import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useUserMonthAttendance, type UserDayAttendance } from '@/hooks/useUserInOutTime';

const toMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatTime = (value?: string): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value: string): string => {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeLeaveName = (value?: string) => value?.trim().toLowerCase() ?? '';
const isHalfDayLeave = (value?: string) => {
  const name = normalizeLeaveName(value);
  return name === 'half-day leave' || name === 'half day leave';
};
const isWorkFromHomeLeave = (value?: string) => normalizeLeaveName(value) === 'work from home';

const statusLabel = (day: UserDayAttendance): { text: string; className: string } => {
  const leaveName = day.leave_type_name?.trim() ?? '';
  if (isWorkFromHomeLeave(leaveName)) {
    return { text: 'Work From Home', className: 'text-emerald-600' };
  }
  if (isHalfDayLeave(leaveName)) {
    return { text: 'Half-Day Leave', className: 'text-amber-700' };
  }
  if (day.day_status === 'leave') {
    return { text: leaveName || 'Leave', className: 'text-amber-700' };
  }
  if (day.day_status === 'present') return { text: 'Present', className: 'text-emerald-600' };
  if (day.day_status === 'pending') {
    if (day.in_time) return { text: 'Pending', className: 'text-sky-600' };
    return { text: '—', className: 'text-gray-400' };
  }
  if (day.day_status === 'weekly_off') return { text: 'Weekly Off', className: 'text-gray-500' };
  if (day.day_status === 'holiday') return { text: 'Holiday', className: 'text-violet-600' };
  if (day.day_status === 'absent') return { text: 'Absent', className: 'text-rose-600' };
  return { text: '—', className: 'text-gray-400' };
};

/** Own monthly attendance for manager / employee (no team list). */
const SelfAttendanceTab: React.FC = () => {
  const { user } = useMockAuth();
  const [month, setMonth] = useState(toMonthString(new Date()));

  const { data, isLoading, isError } = useUserMonthAttendance(user?.id, month, {
    enabled: Boolean(user?.id),
  });

  const days = data?.days ?? [];

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    for (const day of days) {
      const leaveName = day.leave_type_name;
      if (isWorkFromHomeLeave(leaveName)) {
        present += 1;
        continue;
      }
      if (isHalfDayLeave(leaveName)) {
        present += 0.5;
        absent += 0.5;
        leave += 0.5;
        continue;
      }
      if (day.day_status === 'present') present += 1;
      else if (day.day_status === 'absent') absent += 1;
      else if (day.day_status === 'leave') leave += 1;
      // pending (in without out) is not counted as present until finalized
    }
    return { present, absent, leave };
  }, [days]);

  if (!user?.id) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-8 text-center text-gray-500">Sign in to view attendance.</CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-2 space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 w-44 border-gray-200 bg-white text-sm shadow-sm"
          aria-label="Select month"
        />
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          <span>
            <span className="font-semibold text-emerald-600">{summary.present}</span> present
          </span>
          <span>
            <span className="font-semibold text-rose-600">{summary.absent}</span> absent
          </span>
          <span>
            <span className="font-semibold text-amber-700">{summary.leave}</span> leave
          </span>
          {typeof data?.leave_balance === 'number' && (
            <span>
              Balance: <span className="font-semibold text-gray-800">{data.leave_balance}</span>
            </span>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading your attendance...</div>
          ) : isError ? (
            <div className="p-8 text-center text-rose-600">Could not load attendance. Try again.</div>
          ) : days.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No attendance data for this month.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>In Time</TableHead>
                  <TableHead>Out Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((day) => {
                  const status = statusLabel(day);
                  return (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium text-gray-800">{formatDate(day.date)}</TableCell>
                      <TableCell>{formatTime(day.in_time)}</TableCell>
                      <TableCell>{formatTime(day.out_time)}</TableCell>
                      <TableCell className={`font-medium ${status.className}`}>{status.text}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfAttendanceTab;
