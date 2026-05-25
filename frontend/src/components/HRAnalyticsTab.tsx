
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Download, Eye, Search } from 'lucide-react';
import {
  type LunchEmployeeDetailReport,
  type LunchEmployeeSummary,
  useLunchEmployeeDetailReport,
  useLunchRangeReport,
} from '@/hooks/useLunchAnalytics';
import { useProfiles } from '@/hooks/useProfiles';
import { formatGatepassDateTime } from '@/lib/gatepass';
import { toast } from '@/hooks/use-toast';

type AnalyticsPreset = '1w' | '1m' | '3m' | '6m' | '1y' | 'custom';

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatOptionalDateTime = (value?: string): string => {
  if (!value) return 'N/A';
  const formatted = formatGatepassDateTime(value);
  return formatted === '—' ? 'N/A' : formatted;
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

type LunchTableRow = {
  user_id: string;
  employee_name: string;
  manager_name: string;
  department?: string;
  status: LunchEmployeeSummary['current_status'];
  extra_lunch_minutes: number;
};

const limitBadgeClass = (extraMinutes: number) =>
  extraMinutes > 0
    ? 'bg-red-100 text-red-700 border-red-300'
    : 'bg-green-100 text-green-700 border-green-300';

const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const getRangeDates = (
  preset: AnalyticsPreset,
  customStartDate: string,
  customEndDate: string,
): { startDate: string; endDate: string } => {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  if (preset === 'custom') {
    return {
      startDate: customStartDate || formatDateOnly(endDate),
      endDate: customEndDate || formatDateOnly(endDate),
    };
  }

  const startDate = new Date(endDate);

  switch (preset) {
    case '1w':
      startDate.setDate(endDate.getDate() - 6);
      break;
    case '1m':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3m':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6m':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      break;
  }

  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
  };
};

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  const csv = [
    Object.keys(rows[0] || {}).join(','),
    ...rows.map((row) => Object.values(row).map((value) => `"${value}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const HRAnalyticsTab = () => {
  const [preset, setPreset] = useState<AnalyticsPreset>('1w');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [detailPreset, setDetailPreset] = useState<AnalyticsPreset>('1w');
  const today = formatDateOnly(new Date());
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [detailCustomStartDate, setDetailCustomStartDate] = useState(today);
  const [detailCustomEndDate, setDetailCustomEndDate] = useState(today);
  const { startDate, endDate } = useMemo(
    () => getRangeDates(preset, customStartDate, customEndDate),
    [customEndDate, customStartDate, preset],
  );
  const { startDate: detailStartDate, endDate: detailEndDate } = useMemo(
    () => getRangeDates(detailPreset, detailCustomStartDate, detailCustomEndDate),
    [detailCustomEndDate, detailCustomStartDate, detailPreset],
  );

  const { data: profiles = [] } = useProfiles();
  const { data: rangeReport, isLoading } = useLunchRangeReport(startDate, endDate);

  const managerNameByUserId = useMemo(() => {
    const nameById = new Map(profiles.map((profile) => [profile.id, profile.name]));
    return new Map(
      profiles.map((profile) => [
        profile.id,
        profile.manager_id ? nameById.get(profile.manager_id) ?? 'Unassigned' : 'Unassigned',
      ]),
    );
  }, [profiles]);
  const { data: employeeDetail, isLoading: isDetailLoading } = useLunchEmployeeDetailReport(
    selectedEmployee?.id,
    detailStartDate,
    detailEndDate,
    !!selectedEmployee,
  );

  const reportEmployees = rangeReport?.employees ?? [];
  const reportRows = useMemo(
    () =>
      reportEmployees.map((employee) => ({
        user_id: employee.user_id,
        employee_name: employee.employee_name,
        manager_name: managerNameByUserId.get(employee.user_id) ?? 'Unassigned',
        department: employee.department,
        status: employee.current_status,
        extra_lunch_minutes: employee.total_extra_lunch_minutes,
      } satisfies LunchTableRow)),
    [managerNameByUserId, reportEmployees],
  );

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return reportRows;

    return reportRows.filter((row) =>
      row.employee_name.toLowerCase().includes(query)
      || row.manager_name.toLowerCase().includes(query)
      || (row.department || '').toLowerCase().includes(query),
    );
  }, [reportRows, searchTerm]);

  const exportTableData = () => {
    const rows = filteredRows.map((row) => ({
      Employee: row.employee_name,
      'Manager Name': row.manager_name,
      Department: row.department || 'N/A',
      Status: row.status,
      'Total Extra Time': formatMinutes(row.extra_lunch_minutes),
    }));

    downloadCsv(`lunch-analytics-${startDate}-to-${endDate}.csv`, rows);
    toast({
      title: 'Data Exported',
      description: 'Lunch analytics table has been exported to CSV.',
    });
  };

  const exportEmployeeDetail = (detail: LunchEmployeeDetailReport) => {
    const rows = detail.activity_logs.map((log) => ({
      Date: formatOptionalDateTime(log.date),
      Reason: log.reason_description ? `${log.reason_name}: ${log.reason_description}` : log.reason_name,
      Status: log.status,
      'Check Out': formatOptionalDateTime(log.checked_out_at),
      'Check In': formatOptionalDateTime(log.checked_in_at),
      'Lunch Duration': formatMinutes(log.lunch_duration_minutes),
      'Extra Time': formatMinutes(log.extra_lunch_minutes),
      'Outside Duration': formatMinutes(log.total_outside_office_minutes),
    }));

    downloadCsv(`lunch-history-${detail.employee_name}-${detail.start_date}-to-${detail.end_date}.csv`, rows);
    toast({
      title: 'Detail Exported',
      description: 'Employee history has been exported to CSV.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 bg-[#f8f9fb] px-4 pb-2 md:-mx-5 md:px-5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white/80 px-3 py-1.5 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by employee, manager, or department..."
            className="h-9 border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
            aria-label="Search lunch analytics"
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Select value={preset} onValueChange={(value) => setPreset(value as AnalyticsPreset)}>
            <SelectTrigger className="h-9 w-[220px] border-gray-200 bg-white text-sm shadow-sm">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1w">Last 1 Week</SelectItem>
              <SelectItem value="1m">Last 1 Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last 1 Year</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>

          {preset === 'custom' && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="h-9 w-[180px] border-gray-200 bg-white text-sm shadow-sm"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="h-9 w-[180px] border-gray-200 bg-white text-sm shadow-sm"
              />
            </>
          )}

          <Button
            size="sm"
            onClick={exportTableData}
            className="h-9 shrink-0 bg-green-600 hover:bg-green-700"
            disabled={filteredRows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lunch Tracking Report</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading lunch analytics...</div>
          ) : filteredRows.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No lunch data found for the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Manager Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total Extra Time</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRows.map((row) => (
                    <tr key={row.user_id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{row.employee_name}</p>
                          <p className="text-xs text-gray-500">{row.department || 'No Department'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.manager_name}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(row.status)}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={limitBadgeClass(row.extra_lunch_minutes)}>
                          {formatMinutes(row.extra_lunch_minutes)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee({ id: row.user_id, name: row.employee_name });
                            setDetailPreset(preset);
                            setDetailCustomStartDate(startDate);
                            setDetailCustomEndDate(endDate);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader className="space-y-0">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="min-w-[140px] flex-1 text-left text-lg font-semibold leading-tight">
                {selectedEmployee?.name ? `${selectedEmployee.name} Activity Details` : 'Employee Activity Details'}
              </DialogTitle>
              {selectedEmployee && (
                <>
                  <Select value={detailPreset} onValueChange={(value) => setDetailPreset(value as AnalyticsPreset)}>
                    <SelectTrigger className="h-9 w-[160px] shrink-0 bg-white">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1w">Last 1 Week</SelectItem>
                      <SelectItem value="1m">Last 1 Month</SelectItem>
                      <SelectItem value="3m">Last 3 Months</SelectItem>
                      <SelectItem value="6m">Last 6 Months</SelectItem>
                      <SelectItem value="1y">Last 1 Year</SelectItem>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                  {detailPreset === 'custom' && (
                    <>
                      <Input
                        type="date"
                        value={detailCustomStartDate}
                        onChange={(event) => setDetailCustomStartDate(event.target.value)}
                        className="h-9 w-[150px] shrink-0 bg-white"
                      />
                      <Input
                        type="date"
                        value={detailCustomEndDate}
                        onChange={(event) => setDetailCustomEndDate(event.target.value)}
                        className="h-9 w-[150px] shrink-0 bg-white"
                      />
                    </>
                  )}
                  <Button
                    size="sm"
                    disabled={!employeeDetail || isDetailLoading}
                    onClick={() => employeeDetail && exportEmployeeDetail(employeeDetail)}
                    className="h-9 shrink-0 bg-green-600 hover:bg-green-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          {!selectedEmployee ? null : isDetailLoading ? (
            <div className="py-8 text-center text-gray-500">Loading employee history...</div>
          ) : !employeeDetail ? (
            <div className="py-8 text-center text-gray-500">No detail report found for this employee.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Current Status</p>
                    <Badge className={`mt-2 ${statusBadgeClass(employeeDetail.current_status)}`}>
                      {employeeDetail.current_status}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Total Lunch Time</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatMinutes(employeeDetail.total_lunch_duration_minutes)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Extra Time</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatMinutes(employeeDetail.total_extra_lunch_minutes)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Total Outside Duration</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {formatMinutes(employeeDetail.total_outside_office_minutes)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="space-y-0 px-4 py-2">
                  <CardTitle className="text-base font-semibold">Activity Logs</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  {employeeDetail.activity_logs.length === 0 ? (
                    <div className="py-4 text-center text-gray-500">No activity logs found for this range.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Reason</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Check Out</th>
                            <th className="px-3 py-2">Check In</th>
                            <th className="px-3 py-2">Extra Time</th>
                            <th className="px-3 py-2">Outside Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {employeeDetail.activity_logs.map((log) => (
                            <tr key={`${log.id}-${log.date}-${log.checked_out_at ?? 'na'}`}>
                              <td className="px-3 py-2 text-gray-700">{formatOptionalDateTime(log.date)}</td>
                              <td className="px-3 py-2 text-gray-700">
                                {log.reason_description ? `${log.reason_name}: ${log.reason_description}` : log.reason_name}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline">{log.status}</Badge>
                              </td>
                              <td className="px-3 py-2 text-gray-700">{formatOptionalDateTime(log.checked_out_at)}</td>
                              <td className="px-3 py-2 text-gray-700">{formatOptionalDateTime(log.checked_in_at)}</td>
                              <td className="px-3 py-2">
                                <Badge className={limitBadgeClass(log.extra_lunch_minutes)}>
                                  {formatMinutes(log.extra_lunch_minutes)}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-gray-700">{formatMinutes(log.total_outside_office_minutes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRAnalyticsTab;
