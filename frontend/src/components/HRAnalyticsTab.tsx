
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, Clock, Download, TimerReset, Users } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';
import {
  type LunchEmployeeSummary,
  useDailyLunchReport,
  useLiveEmployeeStatuses,
  useMonthlyLunchReport,
  useYearlyLunchReport,
} from '@/hooks/useLunchAnalytics';
import { toast } from '@/hooks/use-toast';

type AnalyticsRange = 'today' | 'month' | 'year';

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatTimestamp = (value?: string): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const statusBadgeClass = (status: LunchEmployeeSummary['current_status'] | 'Outside Office') => {
  switch (status) {
    case 'On Lunch':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'Outside Office':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-green-100 text-green-700 border-green-300';
  }
};

const limitBadgeClass = (extraMinutes: number) =>
  extraMinutes > 0
    ? 'bg-red-100 text-red-700 border-red-300'
    : 'bg-green-100 text-green-700 border-green-300';

const HRAnalyticsTab = () => {
  const [range, setRange] = useState<AnalyticsRange>('today');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');

  const employeeId = selectedEmployeeId === 'all' ? undefined : selectedEmployeeId;
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);

  const { data: profiles = [] } = useProfiles();
  const { data: dailyReport, isLoading: isDailyLoading } = useDailyLunchReport(today, employeeId, range === 'today');
  const { data: monthlyReport, isLoading: isMonthlyLoading } = useMonthlyLunchReport(currentMonth, employeeId, range === 'month');
  const { data: yearlyReport, isLoading: isYearlyLoading } = useYearlyLunchReport(currentYear, employeeId, range === 'year');
  const { data: liveStatuses = [] } = useLiveEmployeeStatuses(employeeId);

  const employeeOptions = useMemo(
    () => profiles.filter((profile) => profile.role === 'employee' || profile.role === 'manager'),
    [profiles],
  );

  const activeReport = range === 'today' ? dailyReport : range === 'month' ? monthlyReport : yearlyReport;
  const reportEmployees = activeReport?.employees ?? [];
  const allowedLunchMinutes = activeReport?.allowed_lunch_minutes ?? 30;
  const isLoading = range === 'today' ? isDailyLoading : range === 'month' ? isMonthlyLoading : isYearlyLoading;

  const liveCounts = useMemo(() => ({
    onLunch: liveStatuses.filter((status) => status.current_status === 'On Lunch').length,
    outsideOffice: liveStatuses.filter((status) => status.current_status === 'Outside Office').length,
    inOffice: liveStatuses.filter((status) => status.current_status === 'In Office').length,
  }), [liveStatuses]);

  const totalExtraMinutes = reportEmployees.reduce((sum, employee) => sum + employee.total_extra_lunch_minutes, 0);
  const totalLunchMinutes = reportEmployees.reduce((sum, employee) => sum + employee.total_lunch_duration_minutes, 0);
  const topEmployees = range === 'today'
    ? [...reportEmployees]
      .filter((employee) => employee.total_extra_lunch_minutes > 0)
      .sort((left, right) => right.total_extra_lunch_minutes - left.total_extra_lunch_minutes)
      .slice(0, 5)
    : activeReport?.top_employees ?? [];

  const chartData = range === 'year'
    ? (yearlyReport?.months ?? []).map((month) => ({
      label: month.month.slice(5),
      extraMinutes: month.total_extra_lunch_minutes,
      violations: month.violation_count,
    }))
    : topEmployees.map((employee) => ({
      label: employee.employee_name,
      extraMinutes: employee.total_extra_lunch_minutes,
      violations: employee.violation_count,
    }));

  const exportData = () => {
    const rows = reportEmployees.map((employee) => ({
      'Employee Name': employee.employee_name,
      Department: employee.department || 'N/A',
      Status: employee.current_status,
      'Check Out': formatTimestamp(employee.checked_out_at),
      'Check In': formatTimestamp(employee.checked_in_at),
      'Total Lunch Duration': formatMinutes(employee.total_lunch_duration_minutes),
      'Extra Lunch Time': formatMinutes(employee.total_extra_lunch_minutes),
      'Violations': employee.violation_count,
    }));

    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((row) => Object.values(row).map((value) => `"${value}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lunch-analytics-${range}-${today}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Data Exported',
      description: 'Lunch analytics data has been exported to CSV.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant={range === 'today' ? 'default' : 'outline'} onClick={() => setRange('today')}>
            Today
          </Button>
          <Button variant={range === 'month' ? 'default' : 'outline'} onClick={() => setRange('month')}>
            This Month
          </Button>
          <Button variant={range === 'year' ? 'default' : 'outline'} onClick={() => setRange('year')}>
            This Year
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-[220px] bg-white">
              <SelectValue placeholder="Employee-wise filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employeeOptions.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportData} className="bg-green-600 hover:bg-green-700">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Allowed Lunch Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatMinutes(allowedLunchMinutes)}</p>
              </div>
              <TimerReset className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Employees On Lunch</p>
                <p className="text-2xl font-bold text-gray-900">{liveCounts.onLunch}</p>
              </div>
              <Users className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lunch Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatMinutes(totalLunchMinutes)}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Extra Lunch / Violations</p>
                <p className="text-2xl font-bold text-gray-900">{formatMinutes(totalExtraMinutes)}</p>
                <p className="text-xs text-gray-500">{activeReport?.total_violations ?? 0} violations</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {range === 'year' ? 'Yearly Extra Lunch Trend' : 'Top Employees Exceeding Lunch Limit'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="extraMinutes" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Employee Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveStatuses.map((status) => (
                <div key={status.user_id} className="rounded-lg border bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{status.employee_name}</p>
                      <p className="text-sm text-gray-500">{status.department || 'No Department'}</p>
                    </div>
                    <Badge className={statusBadgeClass(status.current_status)}>
                      {status.current_status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{status.active_reason_name || 'No active pass'}</span>
                    <span>{formatMinutes(status.extra_lunch_minutes)} extra</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lunch Tracking Report</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading lunch analytics...</div>
          ) : reportEmployees.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No lunch data found for the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Lunch Time</th>
                    <th className="px-4 py-3">Extra Time</th>
                    <th className="px-4 py-3">Violations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {reportEmployees.map((employee) => (
                    <tr key={employee.user_id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{employee.employee_name}</p>
                          <p className="text-xs text-gray-500">{employee.department || 'No Department'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(employee.current_status)}>
                          {employee.current_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatTimestamp(employee.checked_out_at)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatTimestamp(employee.checked_in_at)}</td>
                      <td className="px-4 py-3">
                        <Badge className={limitBadgeClass(employee.total_extra_lunch_minutes)}>
                          {formatMinutes(employee.total_lunch_duration_minutes)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={limitBadgeClass(employee.total_extra_lunch_minutes)}>
                          {formatMinutes(employee.total_extra_lunch_minutes)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{employee.violation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRAnalyticsTab;
