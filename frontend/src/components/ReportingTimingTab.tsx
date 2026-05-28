import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle,
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useCheckInUser,
  useCheckOutUser,
  useUserInOutTimeDailyReport,
  type UserInOutTimeReportRow,
} from '@/hooks/useUserInOutTime';
import { useQueryClient } from '@tanstack/react-query';

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value?: string): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusBadge = (row: UserInOutTimeReportRow) => {
  if (row.in_time && row.out_time) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Completed
      </Badge>
    );
  }
  if (row.in_time) {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
        In Office
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-gray-500">
      Not Reported
    </Badge>
  );
};

const ReportingTimingTab: React.FC = () => {
  const today = toLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isFetching } = useUserInOutTimeDailyReport(selectedDate);
  const checkInMutation = useCheckInUser();
  const checkOutMutation = useCheckOutUser();

  const isToday = selectedDate === today;

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) => row.user_name.toLowerCase().includes(search));
  }, [rows, searchTerm]);

  const stats = useMemo(() => {
    const total = rows.length;
    const reported = rows.filter((r) => r.in_time).length;
    const inOffice = rows.filter((r) => r.in_time && !r.out_time).length;
    const completed = rows.filter((r) => r.in_time && r.out_time).length;
    return { total, reported, inOffice, completed, notReported: total - reported };
  }, [rows]);

  const handleCheckIn = async (row: UserInOutTimeReportRow) => {
    try {
      setPendingUserId(row.user_id);
      await checkInMutation.mutateAsync(row.user_id);
      toast({ title: 'Checked In', description: `${row.user_name} marked IN.` });
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

  const handleCheckOut = async (row: UserInOutTimeReportRow) => {
    try {
      setPendingUserId(row.user_id);
      await checkOutMutation.mutateAsync(row.user_id);
      toast({ title: 'Checked Out', description: `${row.user_name} marked OUT.` });
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Total Users</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Users className="h-7 w-7 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Reported</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.reported}</p>
              </div>
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">In Office</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">{stats.inOffice}</p>
              </div>
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-rose-50 to-red-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Not Reported</p>
                <p className="mt-1 text-2xl font-bold text-rose-900">{stats.notReported}</p>
              </div>
              <LogIn className="h-7 w-7 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-800 md:text-lg">
              Daily Reporting Timing
            </CardTitle>
            <p className="text-xs text-gray-500">
              {isToday
                ? "Today's in/out timings. New entries appear automatically."
                : `Timings for ${selectedDate}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              className="h-9 w-40 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-9"
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-0">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">
              <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-b-2 border-orange-600" />
              <p className="text-sm">Loading users...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <Users className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm">No users match the current filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[45%]">User</TableHead>
                    <TableHead className="w-[15%]">In Time</TableHead>
                    <TableHead className="w-[15%]">Out Time</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="w-[13%] text-right">Actions</TableHead>
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
                    const isPending = pendingUserId === row.user_id;
                    return (
                      <TableRow key={row.user_id} className="hover:bg-orange-50/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold text-white">
                              {initials}
                            </div>
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {row.user_name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-green-700">
                          {formatTime(row.in_time)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-blue-700">
                          {formatTime(row.out_time)}
                        </TableCell>
                        <TableCell>{getStatusBadge(row)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {!row.in_time ? (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(row)}
                                disabled={!isToday || isPending}
                                className="h-8 bg-gradient-to-r from-green-600 to-emerald-600 px-2 text-xs hover:from-green-700 hover:to-emerald-700"
                              >
                                <LogIn className="mr-1 h-3 w-3" />
                                In
                              </Button>
                            ) : !row.out_time ? (
                              <Button
                                size="sm"
                                onClick={() => handleCheckOut(row)}
                                disabled={!isToday || isPending}
                                className="h-8 bg-gradient-to-r from-blue-600 to-indigo-600 px-2 text-xs hover:from-blue-700 hover:to-indigo-700"
                              >
                                <LogOut className="mr-1 h-3 w-3" />
                                Out
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">Done</span>
                            )}
                          </div>
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
    </div>
  );
};

export default ReportingTimingTab;
