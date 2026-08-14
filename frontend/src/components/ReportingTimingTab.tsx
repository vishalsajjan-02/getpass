import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  LogIn,
  LogOut,
  Download,
  Search,
  Users,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportAttendanceGridExcel } from '@/lib/attendance-export';
import {
  useAttendanceReport,
  useCheckInUser,
  useCheckOutUser,
  useUserInOutTimeDailyReport,
  type UserInOutTimeReportRow,
} from '@/hooks/useUserInOutTime';
import {
  getReportingAction,
  normalizeDateKey,
} from '@/lib/reporting-timing';
import UserMonthAttendanceDialog, {
  type AttendanceUserSummary,
} from '@/components/UserMonthAttendanceDialog';
import AttendanceMonthGrid from '@/components/AttendanceMonthGrid';

export interface ReportingTimingTabProps {
  /** Admin view: no In/Out buttons, same data as gatekeeper reporting. */
  readOnly?: boolean;
  /** Admin only: click a row to open monthly attendance details. */
  enableMonthDetails?: boolean;
  /** Admin: allow month filter in addition to day. */
  enableMonthFilter?: boolean;
  /** Admin: month grid with date columns and horizontal scroll. */
  enableMonthGrid?: boolean;
  /** Hide built-in search bar (parent renders it in a fixed page toolbar). */
  hideToolbar?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
}

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  return parsed.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

type TimingRow = UserInOutTimeReportRow & { date: string };

const ReportingTimingTab: React.FC<ReportingTimingTabProps> = ({
  readOnly = false,
  enableMonthDetails = false,
  enableMonthFilter = false,
  enableMonthGrid = false,
  hideToolbar = false,
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
}) => {
  const today = toLocalDateString(new Date());
  const [filterMode, setFilterMode] = useState<'day' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedMonth, setSelectedMonth] = useState(toMonthString(new Date()));
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AttendanceUserSummary | null>(null);

  const searchTerm = controlledSearchTerm ?? internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? setInternalSearchTerm;

  const isMonthView = enableMonthFilter && filterMode === 'month';
  const isGridView = enableMonthGrid || (readOnly && enableMonthDetails);

  const { data: dailyRows = [], isLoading: dailyLoading } =
    useUserInOutTimeDailyReport(selectedDate, { enabled: !isMonthView && !isGridView });

  const { data: monthRows = [], isLoading: monthLoading } =
    useAttendanceReport({
      mode: 'month',
      month: selectedMonth,
      enabled: isMonthView || isGridView,
    });

  // Day view always uses the selected filter date (not raw API date objects).
  const rows: TimingRow[] = isMonthView || isGridView
    ? monthRows.map((row) => ({
        ...row,
        date: normalizeDateKey(row.date) ?? selectedMonth,
      }))
    : dailyRows.map((row) => ({
        ...row,
        date: selectedDate,
      }));

  const isLoading = isGridView ? monthLoading : isMonthView ? monthLoading : dailyLoading;
  const checkInMutation = useCheckInUser();
  const checkOutMutation = useCheckOutUser();

  const isToday = !isMonthView && selectedDate === today;

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) =>
      [row.user_name, row.email, row.department, row.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [rows, searchTerm]);

  const handleCheckIn = async (row: TimingRow) => {
    try {
      setPendingUserId(row.user_id);
      await checkInMutation.mutateAsync(row.user_id);
      toast({ title: 'Marked In', description: `${row.user_name} can now request lunch, out, and other gatepasses.` });
    } catch (err) {
      toast({
        title: 'Failed',
        description: (err as Error).message || 'Could not mark check-in',
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleCheckOut = async (row: TimingRow) => {
    try {
      setPendingUserId(row.user_id);
      await checkOutMutation.mutateAsync(row.user_id);
      toast({ title: 'Marked Out', description: `${row.user_name} checked out for the day.` });
    } catch (err) {
      toast({
        title: 'Failed',
        description: (err as Error).message || 'Could not mark check-out',
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const renderActionCell = (row: TimingRow) => {
    const rowDate = normalizeDateKey(row.date) ?? selectedDate;
    const action =
      row.day_status === 'holiday'
        ? 'holiday'
        : row.day_status === 'weekly_off'
          ? 'weekly_off'
          : getReportingAction(row.in_time, row.out_time, rowDate, today);
    const isPending = pendingUserId === row.user_id;
    // Gatekeeper can mark In/Out only for today's day view.
    const canEdit = !readOnly && isToday;

    if (action === 'holiday') {
      return <span className="text-xs font-medium text-indigo-600">Holiday</span>;
    }
    if (action === 'weekly_off') {
      return <span className="text-xs font-medium text-violet-600">Weekly Off</span>;
    }
    if (action === 'in') {
      if (canEdit) {
        return (
          <Button
            size="sm"
            onClick={() => handleCheckIn(row)}
            disabled={isPending}
            className="h-8 min-w-[5.5rem] bg-gradient-to-r from-green-600 to-emerald-600 px-4 text-xs hover:from-green-700 hover:to-emerald-700"
          >
            <LogIn className="mr-1 h-3 w-3" />
            In
          </Button>
        );
      }
      // Today / open day with no In yet — show dash until marked.
      return <span className="text-xs text-gray-400">—</span>;
    }
    if (action === 'out') {
      if (canEdit) {
        return (
          <Button
            size="sm"
            onClick={() => handleCheckOut(row)}
            disabled={isPending}
            className="h-8 min-w-[5.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs hover:from-blue-700 hover:to-indigo-700"
          >
            <LogOut className="mr-1 h-3 w-3" />
            Out
          </Button>
        );
      }
      return <span className="text-xs font-medium text-sky-600">In</span>;
    }
    if (action === 'pending') {
      return <span className="text-xs font-medium text-sky-600">Pending</span>;
    }
    if (action === 'present') {
      return <span className="text-xs font-medium text-emerald-600">Present</span>;
    }
    if (action === 'absent') {
      return <span className="text-xs font-medium text-rose-600">Absent</span>;
    }
    return <span className="text-xs font-medium text-rose-600">Absent</span>;
  };

  const handleExportGrid = () => {
    try {
      exportAttendanceGridExcel(monthRows, selectedMonth, searchTerm);
      toast({
        title: 'Exported',
        description: `Attendance grid downloaded as attendance-grid-${selectedMonth}.xlsx`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: (error as Error).message || 'Could not export attendance',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="border-0 shadow-md">
        {hideToolbar ? null : (
          <CardHeader className="px-4 py-3">
            <div className="flex items-center gap-3">
              {isGridView ? (
                <Input
                  type="month"
                  value={selectedMonth}
                  max={toMonthString(new Date())}
                  onChange={(e) => setSelectedMonth(e.target.value || toMonthString(new Date()))}
                  className="h-9 w-40 shrink-0 text-sm"
                />
              ) : (
                <Input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value || today)}
                  className="h-9 w-40 shrink-0 text-sm"
                />
              )}
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-9 text-sm"
                />
              </div>
              {isGridView ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportGrid}
                  className="h-9 shrink-0 gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              ) : null}
            </div>
          </CardHeader>
        )}
        <CardContent className="px-0 pb-0 pt-0">
          {isLoading && !isGridView ? (
            <div className="py-10 text-center text-gray-500">
              <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-b-2 border-orange-600" />
              <p className="text-sm">Loading users...</p>
            </div>
          ) : isGridView ? (
            <AttendanceMonthGrid
              rows={monthRows}
              month={selectedMonth}
              searchTerm={searchTerm}
              loading={isLoading}
              onUserClick={
                enableMonthDetails
                  ? (user) => setSelectedUser(user)
                  : undefined
              }
            />
          ) : filteredRows.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <Users className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm">No users match the current filter.</p>
            </div>
          ) : (
            <div className={`overflow-x-auto ${isMonthView ? 'max-h-[60vh]' : ''}`}>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-orange-50">
                  <TableRow className="border-orange-100 bg-orange-50 hover:bg-orange-50">
                    <TableHead className={`bg-orange-50 text-orange-800 ${isMonthView ? '' : 'w-[40%]'}`}>User</TableHead>
                    {isMonthView ? <TableHead className="bg-orange-50 text-orange-800">Date</TableHead> : null}
                    {isMonthView ? <TableHead className="bg-orange-50 text-orange-800">Department</TableHead> : null}
                    <TableHead className={`bg-orange-50 text-orange-800 ${isMonthView ? '' : 'w-[18%]'}`}>In Time</TableHead>
                    <TableHead className={`bg-orange-50 text-orange-800 ${isMonthView ? '' : 'w-[18%]'}`}>Out Time</TableHead>
                    <TableHead className="bg-orange-50 text-right text-orange-800">{readOnly ? 'Status' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const initials =
                      row.user_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'U';
                    return (
                      <TableRow
                        key={`${row.user_id}-${row.date}`}
                        className={
                          enableMonthDetails
                            ? 'cursor-pointer hover:bg-orange-100'
                            : 'hover:bg-orange-50/60'
                        }
                        onClick={
                          enableMonthDetails
                            ? () =>
                                setSelectedUser({
                                  user_id: row.user_id,
                                  user_name: row.user_name,
                                  email: row.email,
                                  department: row.department,
                                })
                            : undefined
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!isMonthView ? (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-bold text-white">
                                {initials}
                              </div>
                            ) : null}
                            <div>
                              <p
                                className={
                                  enableMonthDetails
                                    ? 'truncate text-sm font-semibold text-orange-700 underline-offset-2 hover:underline'
                                    : 'truncate text-sm font-semibold text-gray-800'
                                }
                              >
                                {row.user_name}
                              </p>
                              {isMonthView ? (
                                <p className="text-xs text-gray-500">{row.email}</p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        {isMonthView ? (
                          <TableCell className="text-sm text-gray-700">{formatDate(row.date)}</TableCell>
                        ) : null}
                        {isMonthView ? (
                          <TableCell className="text-sm text-gray-600">{row.department ?? '—'}</TableCell>
                        ) : null}
                        <TableCell className="text-sm font-medium text-green-700">
                          {formatTime(row.in_time)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-orange-700">
                          {formatTime(row.out_time)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">{renderActionCell(row)}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {enableMonthDetails ? (
        <UserMonthAttendanceDialog
          user={selectedUser}
          open={Boolean(selectedUser)}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
          initialMonth={
            isGridView || isMonthView
              ? selectedMonth
              : (normalizeDateKey(selectedDate) ?? selectedDate).slice(0, 7)
          }
        />
      ) : null}
    </div>
  );
};

export function ReportingTimingSearchBar({
  searchTerm,
  onSearchTermChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="h-9 w-full border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
        />
      </div>
    </div>
  );
}

export default ReportingTimingTab;
