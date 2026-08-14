import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, LogOut, Minus, Pencil, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useSetDayAttendanceStatus,
  useUserMonthAttendance,
  type UserDayAttendance,
  type UserDayGatepassSummary,
} from '@/hooks/useUserInOutTime';
import { useLeaveTypes, useUpdateLeaveBalance, useUpsertUserDayLeave } from '@/hooks/useLeaves';
import GatepassDetailsModal from '@/components/GatepassDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { Gatepass } from '@/hooks/useGatepasses';
import { getGatepassStatusLabel } from '@/lib/gatepass';

export type AttendanceUserSummary = {
  user_id: string;
  user_name: string;
  email?: string;
  department?: string;
};

type UserMonthAttendanceDialogProps = {
  user: AttendanceUserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial month YYYY-MM (defaults to current month). */
  initialMonth?: string;
};

const toMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatTime = (value?: string): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  const candidates = [raw, raw.includes('T') ? raw : raw.replace(' ', 'T')];
  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return '—';
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

const formatDateOnly = (value: string): string => {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDayOnly = (value: string): string => {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString([], { weekday: 'long' });
};

const normalizeLeaveName = (value?: string) => value?.trim().toLowerCase() ?? '';

const isWorkFromHomeLeave = (value?: string) => normalizeLeaveName(value) === 'work from home';

const isHalfDayLeave = (value?: string) => {
  const name = normalizeLeaveName(value);
  return name === 'half-day leave' || name === 'half day leave';
};

const formatCount = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const statusLabel = (day: UserDayAttendance) => {
  const leaveName = day.leave_type_name?.trim() ?? '';

  if (isWorkFromHomeLeave(leaveName)) {
    return { text: 'Work From Home', className: 'text-emerald-600' };
  }
  if (isHalfDayLeave(leaveName)) {
    return { text: 'Half-Day Leave', className: 'text-amber-700' };
  }
  if (day.day_status === 'leave' && leaveName) {
    return {
      text: leaveName,
      className: 'text-amber-700',
    };
  }
  if (day.day_status === 'present') return { text: 'Present', className: 'text-emerald-600' };
  // Pending = in without out (admin should mark present / absent / leave).
  if (day.day_status === 'pending') {
    if (day.in_time) return { text: 'Pending', className: 'text-sky-600' };
    return { text: '—', className: 'text-gray-400' };
  }
  if (day.day_status === 'weekly_off') return { text: 'Weekly Off', className: 'text-violet-600' };
  if (day.day_status === 'holiday') return { text: 'Holiday', className: 'text-indigo-600' };
  return { text: 'Absent', className: 'text-rose-600' };
};

const slugifyFilePart = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'user';

const dayHasMissingOutWithGatepass = (day: UserDayAttendance): boolean =>
  !day.out_time && Boolean(day.gatepasses && day.gatepasses.length > 0);

const formatVia = (via?: 'self' | 'gatekeeper'): string => {
  if (via === 'self') return 'Self punch';
  if (via === 'gatekeeper') return 'Gatekeeper';
  return '—';
};

const formatCoords = (lat?: number, lng?: number): string | null => {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const mapsUrl = (lat?: number, lng?: number): string | null => {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

const UserMonthAttendanceDialog: React.FC<UserMonthAttendanceDialogProps> = ({
  user,
  open,
  onOpenChange,
  initialMonth,
}) => {
  const { user: authUser } = useAuth();
  const currentMonth = toMonthString(new Date());
  const [month, setMonth] = useState(initialMonth || currentMonth);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [usedLeaveOpen, setUsedLeaveOpen] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState<Gatepass | null>(null);
  const [gatepassPicker, setGatepassPicker] = useState<UserDayGatepassSummary[] | null>(null);
  const [loadingGatepassId, setLoadingGatepassId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<UserDayAttendance | null>(null);

  const activeMonth = open ? month : initialMonth || currentMonth;

  const { data: monthAttendance, isLoading } = useUserMonthAttendance(user?.user_id, activeMonth, {
    enabled: open && Boolean(user?.user_id),
  });
  const days = monthAttendance?.days ?? [];
  const leaveBalance = monthAttendance?.leave_balance;
  const leaveUsed = monthAttendance?.leave_used ?? 0;
  const usedLeaves = monthAttendance?.used_leaves ?? [];
  const { data: leaveTypes = [] } = useLeaveTypes({ enabled: open });
  const upsertLeaveMutation = useUpsertUserDayLeave();
  const setDayStatusMutation = useSetDayAttendanceStatus();
  const updateBalanceMutation = useUpdateLeaveBalance();

  const formatBalance = (value: number) => String(Math.round(value * 100) / 100);

  const BALANCE_STEP = 0.25;

  const roundToQuarter = (value: number) => Math.round(value / BALANCE_STEP) * BALANCE_STEP;

  const nudgeBalanceDraft = (direction: 1 | -1) => {
    const current = Number(balanceDraft);
    const base = Number.isFinite(current)
      ? current
      : typeof leaveBalance === 'number'
        ? leaveBalance
        : 0;
    const next = roundToQuarter(base + direction * BALANCE_STEP);
    setBalanceDraft(formatBalance(Number(next.toFixed(2))));
  };

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let weeklyOff = 0;
    let holiday = 0;
    let leave = 0;
    let pending = 0;

    for (const day of days) {
      // Half-day leave = 0.5 present + 0.5 absent + 0.5 leave.
      if (isHalfDayLeave(day.leave_type_name)) {
        present += 0.5;
        absent += 0.5;
        leave += 0.5;
        continue;
      }

      if (isWorkFromHomeLeave(day.leave_type_name) || day.day_status === 'present') {
        present += 1;
        continue;
      }
      if (day.day_status === 'pending') {
        pending += 1;
        continue;
      }
      if (day.day_status === 'absent') {
        absent += 1;
        continue;
      }
      if (day.day_status === 'weekly_off') {
        weeklyOff += 1;
        continue;
      }
      if (day.day_status === 'holiday') {
        holiday += 1;
        continue;
      }
      if (day.day_status === 'leave') {
        leave += 1;
      }
    }

    return { present, absent, weeklyOff, holiday, leave, pending, total: days.length };
  }, [days]);

  useEffect(() => {
    if (open) {
      setMonth(initialMonth || currentMonth);
      setEditingDate(null);
      setEditingBalance(false);
      setBalanceDraft('');
      setUsedLeaveOpen(false);
      setSelectedGatepass(null);
      setGatepassPicker(null);
      setLoadingGatepassId(null);
      setSelectedDay(null);
    }
  }, [open, initialMonth, currentMonth, user?.user_id]);

  const openGatepassDetails = async (gatepassId: string) => {
    try {
      setLoadingGatepassId(gatepassId);
      const full = await api.get<Gatepass>(`/gatepasses/${gatepassId}`);
      setGatepassPicker(null);
      setSelectedGatepass(full);
    } catch (error) {
      toast({
        title: 'Failed',
        description: (error as Error).message || 'Could not load gatepass details',
        variant: 'destructive',
      });
    } finally {
      setLoadingGatepassId(null);
    }
  };

  const handleDayGatepassClick = (day: UserDayAttendance) => {
    if (!dayHasMissingOutWithGatepass(day) || !day.gatepasses?.length) return;
    if (day.gatepasses.length === 1) {
      void openGatepassDetails(day.gatepasses[0].id);
      return;
    }
    setGatepassPicker(day.gatepasses);
  };

  const startEditBalance = () => {
    if (typeof leaveBalance !== 'number') return;
    setBalanceDraft(formatBalance(Number(roundToQuarter(leaveBalance).toFixed(2))));
    setEditingBalance(true);
  };

  const cancelEditBalance = () => {
    setEditingBalance(false);
    setBalanceDraft('');
  };

  const saveLeaveBalance = async () => {
    if (!user) return;
    const parsed = Number(balanceDraft);
    if (!Number.isFinite(parsed)) {
      toast({
        title: 'Invalid balance',
        description: 'Enter a valid number in steps of 0.25.',
        variant: 'destructive',
      });
      return;
    }

    const rounded = Number(roundToQuarter(parsed).toFixed(2));

    try {
      await updateBalanceMutation.mutateAsync({
        user_id: user.user_id,
        leave_balance: rounded,
      });
      setEditingBalance(false);
      toast({
        title: 'Leave balance updated',
        description: `Saved as ${formatBalance(rounded)}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed',
        description: (error as Error).message || 'Could not update leave balance',
        variant: 'destructive',
      });
    }
  };
  const handleExportExcel = () => {
    if (!user || days.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'No attendance rows available for this month.',
        variant: 'destructive',
      });
      return;
    }

    const rows = [...days].reverse().map((day) => ({
      Date: formatDateOnly(day.date),
      Day: formatDayOnly(day.date),
      'In Time': formatTime(day.in_time),
      'Out Time': formatTime(day.out_time),
      Status: statusLabel(day).text,
      'In Via': formatVia(day.in_via),
      'Out Via': formatVia(day.out_via),
      'In Location': day.in_location || '',
      'In Latitude': day.in_latitude ?? '',
      'In Longitude': day.in_longitude ?? '',
      'Out Location': day.out_location || '',
      'Out Latitude': day.out_latitude ?? '',
      'Out Longitude': day.out_longitude ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const fileName = `attendance-${slugifyFilePart(user.user_name)}-${month}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: 'Exported',
      description: `${rows.length} day(s) downloaded as Excel.`,
    });
  };

  const handleSelectLeave = async (date: string, leaveTypeId: string | null) => {
    if (!user) return;
    try {
      await upsertLeaveMutation.mutateAsync({
        user_id: user.user_id,
        date,
        leave_type_id: leaveTypeId,
      });
      toast({
        title: leaveTypeId ? 'Leave updated' : 'Leave cleared',
        description: leaveTypeId
          ? `Leave type saved for ${formatDateOnly(date)}.`
          : `Leave removed for ${formatDateOnly(date)}.`,
      });
      setEditingDate(null);
    } catch (error) {
      toast({
        title: 'Failed',
        description: (error as Error).message || 'Could not update leave',
        variant: 'destructive',
      });
    }
  };

  const handleSelectDayStatus = async (date: string, status: 'present' | 'absent') => {
    if (!user) return;
    try {
      await setDayStatusMutation.mutateAsync({
        user_id: user.user_id,
        date,
        status,
      });
      toast({
        title: status === 'present' ? 'Marked present' : 'Marked absent',
        description: `${formatDateOnly(date)} set to ${status}.`,
      });
      setEditingDate(null);
    } catch (error) {
      toast({
        title: 'Failed',
        description: (error as Error).message || 'Could not update attendance status',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-5xl flex-col overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="relative shrink-0 border-b bg-orange-50 px-6 py-4 pr-52 sm:pr-56">
          <DialogTitle className="text-orange-900">
            {user?.user_name ?? 'User'} — Monthly Attendance
          </DialogTitle>
          <DialogDescription className="text-sm text-orange-800/80">
            {[user?.email, user?.department].filter(Boolean).join(' · ') || 'Date-wise in / out times'}
          </DialogDescription>
          {typeof leaveBalance === 'number' ? (
            <div className="absolute right-14 top-3 flex items-start gap-4 text-right sm:right-16">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-orange-800/70">
                  Used leave
                </p>
                <button
                  type="button"
                  onClick={() => setUsedLeaveOpen(true)}
                  className="mt-0.5 rounded-md px-1.5 py-0.5 hover:bg-orange-100/80"
                  title="View date-wise used leave"
                >
                  <span className="text-lg font-bold tabular-nums text-amber-700 underline decoration-amber-400/70 underline-offset-2">
                    {formatBalance(leaveUsed)}
                  </span>
                </button>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-orange-800/70">
                  Leave balance
                </p>
                {editingBalance ? (
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-orange-200"
                      onClick={() => nudgeBalanceDraft(-1)}
                      disabled={updateBalanceMutation.isPending}
                      aria-label="Decrease leave balance by 0.25"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      step={BALANCE_STEP}
                      autoFocus
                      value={balanceDraft}
                      onChange={(e) => setBalanceDraft(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(balanceDraft);
                        if (Number.isFinite(parsed)) {
                          setBalanceDraft(formatBalance(Number(roundToQuarter(parsed).toFixed(2))));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          nudgeBalanceDraft(1);
                        }
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          nudgeBalanceDraft(-1);
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void saveLeaveBalance();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEditBalance();
                        }
                      }}
                      className="h-8 w-20 text-center text-base font-bold tabular-nums"
                      disabled={updateBalanceMutation.isPending}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-orange-200"
                      onClick={() => nudgeBalanceDraft(1)}
                      disabled={updateBalanceMutation.isPending}
                      aria-label="Increase leave balance by 0.25"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => void saveLeaveBalance()}
                      disabled={updateBalanceMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditBalance}
                    className="group mt-0.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-orange-100/80"
                    title="Edit leave balance"
                  >
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        leaveBalance < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatBalance(leaveBalance)}
                    </span>
                    <Pencil className="h-3.5 w-3.5 text-orange-700/70 opacity-70 group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-center gap-3 px-6 pt-4">
          <Input
            type="month"
            value={month}
            max={currentMonth}
            onChange={(e) => setMonth(e.target.value || currentMonth)}
            className="h-9 w-44 text-sm"
          />
          <p className="flex min-w-0 flex-1 flex-wrap gap-x-4 text-sm text-gray-600">
            <span>
              <span className="font-semibold text-gray-800">{summary.total}</span> days
            </span>
            <span>
              <span className="font-semibold text-emerald-600">{formatCount(summary.present)}</span> present
            </span>
            <span>
              <span className="font-semibold text-rose-600">{formatCount(summary.absent)}</span> absent
            </span>
            <span>
              <span className="font-semibold text-violet-600">{formatCount(summary.weeklyOff)}</span> weekly off
            </span>
            <span>
              <span className="font-semibold text-indigo-600">{formatCount(summary.holiday)}</span> holiday
            </span>
            <span>
              <span className="font-semibold text-amber-700">{formatCount(summary.leave)}</span> leave
            </span>
            <span>
              <span className="font-semibold text-sky-600">{formatCount(summary.pending)}</span> pending
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={isLoading || days.length === 0}
            className="h-9 shrink-0 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-5">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading attendance...</div>
          ) : days.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No attendance data for this month.</div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-orange-50">
                <TableRow className="border-orange-100 bg-orange-50 hover:bg-orange-50">
                  <TableHead className="bg-orange-50 text-orange-800">Date</TableHead>
                  <TableHead className="bg-orange-50 text-orange-800">In Time</TableHead>
                  <TableHead className="bg-orange-50 text-orange-800">Out Time</TableHead>
                  <TableHead className="bg-orange-50 text-orange-800">Status</TableHead>
                  <TableHead className="bg-orange-50 w-[72px] text-right text-orange-800">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...days].reverse().map((day) => {
                  const status = statusLabel(day);
                  const showGatepassOut = dayHasMissingOutWithGatepass(day);
                  return (
                    <TableRow
                      key={day.date}
                      className="cursor-pointer hover:bg-orange-50/80"
                      onClick={() => setSelectedDay(day)}
                    >
                      <TableCell className="text-sm font-medium text-gray-800">
                        {formatDate(day.date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-700">
                        {formatTime(day.in_time)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-orange-700">
                        {day.out_time ? (
                          formatTime(day.out_time)
                        ) : showGatepassOut ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
                            title="Gatepass on this day — click for details"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDayGatepassClick(day);
                            }}
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            GP
                            {(day.gatepasses?.length ?? 0) > 1
                              ? ` (${day.gatepasses!.length})`
                              : ''}
                          </button>
                        ) : (
                          formatTime(day.out_time)
                        )}
                      </TableCell>
                      <TableCell className={`text-xs font-semibold ${status.className}`}>
                        {status.text}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          modal={false}
                          open={editingDate === day.date}
                          onOpenChange={(isOpen) => setEditingDate(isOpen ? day.date : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                              aria-label={`Edit leave for ${formatDateOnly(day.date)}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={4}
                            className="z-[100] w-64 overflow-hidden p-0"
                            onCloseAutoFocus={(e) => e.preventDefault()}
                          >
                            <DropdownMenuLabel className="px-3 py-2">Set day status</DropdownMenuLabel>
                            <DropdownMenuSeparator className="m-0" />
                            <div
                              className="max-h-60 overflow-y-auto overscroll-contain p-1"
                              onWheel={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onClick={() => handleSelectDayStatus(day.date, 'present')}
                                className={
                                  !day.leave_type_id && day.day_status === 'present'
                                    ? 'bg-emerald-50 font-medium text-emerald-700'
                                    : 'text-emerald-700 focus:text-emerald-800'
                                }
                              >
                                Present
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSelectDayStatus(day.date, 'absent')}
                                className={
                                  !day.leave_type_id && day.day_status === 'absent'
                                    ? 'bg-rose-50 font-medium text-rose-700'
                                    : 'text-rose-700 focus:text-rose-800'
                                }
                              >
                                Absent
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {leaveTypes.length === 0 ? (
                                <DropdownMenuItem disabled>No leave types found</DropdownMenuItem>
                              ) : (
                                leaveTypes.map((leave) => (
                                  <DropdownMenuItem
                                    key={leave.id}
                                    onClick={() => handleSelectLeave(day.date, leave.id)}
                                    className={day.leave_type_id === leave.id ? 'bg-orange-50 font-medium' : ''}
                                  >
                                    {leave.name}
                                  </DropdownMenuItem>
                                ))
                              )}
                              {day.leave_type_id ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleSelectLeave(day.date, null)}
                                    className="text-rose-600 focus:text-rose-700"
                                  >
                                    Clear leave
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>

      <Dialog
        open={Boolean(selectedDay)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedDay(null);
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="relative shrink-0 border-b bg-orange-50 px-6 py-5 pr-28">
            <DialogTitle className="text-xl text-orange-900">Day details</DialogTitle>
            <DialogDescription className="text-base text-orange-800/80">
              {selectedDay ? formatDate(selectedDay.date) : ''}
              {user?.user_name ? ` · ${user.user_name}` : ''}
              {user?.email ? ` · ${user.email}` : ''}
            </DialogDescription>
            {selectedDay ? (
              <div className="absolute right-14 top-1/2 -translate-y-1/2 text-right sm:right-16">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-800/70">
                  Status
                </p>
                <p className={`mt-0.5 text-lg font-bold ${statusLabel(selectedDay).className}`}>
                  {statusLabel(selectedDay).text}
                </p>
                {selectedDay.leave_type_name ? (
                  <p className="mt-0.5 max-w-[160px] text-xs text-gray-600">
                    {selectedDay.leave_type_name}
                  </p>
                ) : null}
              </div>
            ) : null}
          </DialogHeader>
          {selectedDay ? (
            <div className="min-h-0 flex-1 space-y-5 overflow-auto px-6 py-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                    Punch In
                  </p>

                  <div className="mt-4 space-y-2.5 text-sm text-gray-800">
                    <p>
                      <span className="font-bold text-gray-800">Time: </span>
                      <span className="font-normal tabular-nums text-emerald-700">
                        {formatTime(selectedDay.in_time)}
                      </span>
                    </p>
                    <p>
                      <span className="font-bold text-gray-800">Marked by: </span>
                      <span className="font-normal">{formatVia(selectedDay.in_via)}</span>
                    </p>
                    <p className="leading-relaxed">
                      <span className="font-bold text-gray-800">Location: </span>
                      <span className="break-words font-normal">{selectedDay.in_location || '—'}</span>
                    </p>
                    <p>
                      <span className="font-bold text-gray-800">Latitude / Longitude: </span>
                      <span className="font-mono font-normal tabular-nums text-gray-700">
                        {formatCoords(selectedDay.in_latitude, selectedDay.in_longitude) || '—'}
                      </span>
                    </p>
                    {mapsUrl(selectedDay.in_latitude, selectedDay.in_longitude) ? (
                      <a
                        href={mapsUrl(selectedDay.in_latitude, selectedDay.in_longitude)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-2"
                      >
                        Open in Maps
                      </a>
                    ) : null}
                  </div>

                  {selectedDay.in_photo_url ? (
                    <a
                      href={selectedDay.in_photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block overflow-hidden rounded-xl border bg-white shadow-sm"
                    >
                      <img
                        src={selectedDay.in_photo_url}
                        alt="Punch in face"
                        className="h-48 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No punch-in photo</p>
                  )}
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5">
                  <p className="text-sm font-bold uppercase tracking-wide text-orange-800">
                    Punch Out
                  </p>

                  <div className="mt-4 space-y-2.5 text-sm text-gray-800">
                    <p>
                      <span className="font-bold text-gray-800">Time: </span>
                      <span className="font-normal tabular-nums text-orange-700">
                        {formatTime(selectedDay.out_time)}
                      </span>
                    </p>
                    <p>
                      <span className="font-bold text-gray-800">Marked by: </span>
                      <span className="font-normal">{formatVia(selectedDay.out_via)}</span>
                    </p>
                    <p className="leading-relaxed">
                      <span className="font-bold text-gray-800">Location: </span>
                      <span className="break-words font-normal">{selectedDay.out_location || '—'}</span>
                    </p>
                    <p>
                      <span className="font-bold text-gray-800">Latitude / Longitude: </span>
                      <span className="font-mono font-normal tabular-nums text-gray-700">
                        {formatCoords(selectedDay.out_latitude, selectedDay.out_longitude) || '—'}
                      </span>
                    </p>
                    {mapsUrl(selectedDay.out_latitude, selectedDay.out_longitude) ? (
                      <a
                        href={mapsUrl(selectedDay.out_latitude, selectedDay.out_longitude)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-semibold text-orange-700 underline underline-offset-2"
                      >
                        Open in Maps
                      </a>
                    ) : null}
                  </div>

                  {selectedDay.out_photo_url ? (
                    <a
                      href={selectedDay.out_photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 block overflow-hidden rounded-xl border bg-white shadow-sm"
                    >
                      <img
                        src={selectedDay.out_photo_url}
                        alt="Punch out face"
                        className="h-48 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No punch-out photo</p>
                  )}
                </div>
              </div>

              {selectedDay.gatepasses && selectedDay.gatepasses.length > 0 ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-5">
                  <p className="text-sm font-bold uppercase tracking-wide text-sky-800">
                    Gatepasses ({selectedDay.gatepasses.length})
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedDay.gatepasses.map((gp) => (
                      <button
                        key={gp.id}
                        type="button"
                        disabled={loadingGatepassId === gp.id}
                        onClick={() => void openGatepassDetails(gp.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left hover:border-sky-200 hover:bg-sky-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-gray-800">
                            {gp.display_reason}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {getGatepassStatusLabel(gp.status as never)}
                          </p>
                        </div>
                        <LogOut className="h-5 w-5 shrink-0 text-sky-600" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={usedLeaveOpen} onOpenChange={setUsedLeaveOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="border-b bg-orange-50 px-5 py-4">
            <DialogTitle className="text-orange-900">Used Leave</DialogTitle>
            <DialogDescription className="text-sm text-orange-800/80">
              {user?.user_name ?? 'User'} · total {formatBalance(leaveUsed)} day(s)
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto px-2 py-2">
            {usedLeaves.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-500">No used leave recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Leave type</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usedLeaves.map((entry) => (
                    <TableRow key={`${entry.date}-${entry.leave_type_id}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{entry.leave_type_name}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-700">
                        {formatBalance(entry.days)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(gatepassPicker)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setGatepassPicker(null);
        }}
      >
        <DialogContent className="max-w-md p-0 sm:rounded-xl">
          <DialogHeader className="border-b bg-sky-50 px-5 py-4">
            <DialogTitle className="text-sky-900">Gatepasses</DialogTitle>
            <DialogDescription className="text-sm text-sky-800/80">
              Select a gatepass to view details
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-auto p-3">
            {(gatepassPicker ?? []).map((gp) => (
              <button
                key={gp.id}
                type="button"
                disabled={loadingGatepassId === gp.id}
                onClick={() => void openGatepassDetails(gp.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-left hover:border-sky-200 hover:bg-sky-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{gp.display_reason}</p>
                  <p className="text-xs text-gray-500">{getGatepassStatusLabel(gp.status as never)}</p>
                </div>
                <LogOut className="h-4 w-4 shrink-0 text-sky-600" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={Boolean(selectedGatepass)}
        onClose={() => setSelectedGatepass(null)}
        userRole={(authUser?.role as 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest') ?? 'admin'}
      />
    </>
  );
};

export default UserMonthAttendanceDialog;
