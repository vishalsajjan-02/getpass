
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Download, Eye } from 'lucide-react';
import {
  type LunchEmployeeDetailReport,
  type LunchEmployeeSummary,
  useLunchEmployeeDetailReport,
  useLunchRangeReport,
} from '@/hooks/useLunchAnalytics';
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

const formatTimestamp = (value?: string): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  department?: string;
  status: LunchEmployeeSummary['current_status'];
  reason_name?: string;
  checked_out_at?: string;
  checked_in_at?: string;
  extra_lunch_minutes: number;
  violation: boolean;
  id: string;
  date: string;
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

  const { data: rangeReport, isLoading } = useLunchRangeReport(startDate, endDate);
  const { data: employeeDetail, isLoading: isDetailLoading } = useLunchEmployeeDetailReport(
    selectedEmployee?.id,
    detailStartDate,
    detailEndDate,
    !!selectedEmployee,
  );

  const reportEmployees = rangeReport?.employees ?? [];
  const reportRows = useMemo(() => {
    return reportEmployees.flatMap((employee) => {
      if (employee.entries.length === 0) {
        return [{
          user_id: employee.user_id,
          employee_name: employee.employee_name,
          department: employee.department,
          status: employee.current_status,
          reason_name: undefined,
          checked_out_at: employee.checked_out_at,
          checked_in_at: employee.checked_in_at,
          extra_lunch_minutes: employee.total_extra_lunch_minutes,
          violation: employee.violation_count > 0,
          id: `live-${employee.user_id}`,
          date: startDate,
        } satisfies LunchTableRow];
      }

      return employee.entries.map((entry) => ({
        user_id: employee.user_id,
        employee_name: employee.employee_name,
        department: employee.department,
        status: entry.current_status,
        reason_name: entry.reason_name,
        checked_out_at: entry.checked_out_at,
        checked_in_at: entry.checked_in_at,
        extra_lunch_minutes: entry.extra_lunch_minutes,
        violation: entry.extra_lunch_minutes > 0,
        id: entry.id,
        date: entry.date,
      } satisfies LunchTableRow));
    });
  }, [reportEmployees, startDate]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return reportRows;

    return reportRows.filter((row) =>
      row.employee_name.toLowerCase().includes(query)
      || (row.department || '').toLowerCase().includes(query)
      || (row.reason_name || '').toLowerCase().includes(query)
      || row.id.toLowerCase().includes(query),
    );
  }, [reportRows, searchTerm]);

  const exportTableData = () => {
    const rows = filteredRows.map((row) => ({
      Employee: row.employee_name,
      Reason: row.reason_name || 'N/A',
      Status: row.status,
      'Check Out': formatTimestamp(row.checked_out_at),
      'Check In': formatTimestamp(row.checked_in_at),
      'Extra Time': formatMinutes(row.extra_lunch_minutes),
      Violations: row.violation ? 'Yes' : 'No',
      ID: row.id,
    }));

    downloadCsv(`lunch-analytics-${startDate}-to-${endDate}.csv`, rows);
    toast({
      title: 'Data Exported',
      description: 'Lunch analytics table has been exported to CSV.',
    });
  };

  const exportEmployeeDetail = (detail: LunchEmployeeDetailReport) => {
    const rows = detail.activity_logs.map((log) => ({
      Date: log.date,
      Reason: log.reason_description ? `${log.reason_name}: ${log.reason_description}` : log.reason_name,
      Status: log.status,
      'Check Out': formatTimestamp(log.checked_out_at),
      'Check In': formatTimestamp(log.checked_in_at),
      'Lunch Duration': formatMinutes(log.lunch_duration_minutes),
      'Extra Time': formatMinutes(log.extra_lunch_minutes),
      'Outside Duration': formatMinutes(log.total_outside_office_minutes),
      Violation: log.violation ? 'Yes' : 'No',
    }));

    downloadCsv(`lunch-history-${detail.employee_name}-${detail.start_date}-to-${detail.end_date}.csv`, rows);
    toast({
      title: 'Detail Exported',
      description: 'Employee history has been exported to CSV.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <Select value={preset} onValueChange={(value) => setPreset(value as AnalyticsPreset)}>
            <SelectTrigger className="w-[220px] bg-white">
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
                className="w-[180px] bg-white"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="w-[180px] bg-white"
              />
            </>
          )}

          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search employee..."
            className="w-[240px] bg-white"
          />
        </div>

        <Button onClick={exportTableData} className="bg-green-600 hover:bg-green-700" disabled={filteredRows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
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
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Extra Time</th>
                    <th className="px-4 py-3">Violations</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredRows.map((row) => (
                    <tr key={`${row.user_id}-${row.id}-${row.checked_out_at ?? row.date}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{row.employee_name}</p>
                          <p className="text-xs text-gray-500">
                            {[row.department || 'No Department', row.reason_name].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(row.status)}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatTimestamp(row.checked_out_at)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatTimestamp(row.checked_in_at)}</td>
                      <td className="px-4 py-3">
                        <Badge className={limitBadgeClass(row.extra_lunch_minutes)}>
                          {formatMinutes(row.extra_lunch_minutes)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.violation ? 'Yes' : 'No'}</td>
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
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.name ? `${selectedEmployee.name} Activity Details` : 'Employee Activity Details'}
            </DialogTitle>
          </DialogHeader>

          {!selectedEmployee ? null : isDetailLoading ? (
            <div className="py-8 text-center text-gray-500">Loading employee history...</div>
          ) : !employeeDetail ? (
            <div className="py-8 text-center text-gray-500">No detail report found for this employee.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                  <Select value={detailPreset} onValueChange={(value) => setDetailPreset(value as AnalyticsPreset)}>
                    <SelectTrigger className="w-[220px] bg-white">
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
                        className="w-[180px] bg-white"
                      />
                      <Input
                        type="date"
                        value={detailCustomEndDate}
                        onChange={(event) => setDetailCustomEndDate(event.target.value)}
                        className="w-[180px] bg-white"
                      />
                    </>
                  )}
                </div>

                <Button onClick={() => exportEmployeeDetail(employeeDetail)} className="bg-green-600 hover:bg-green-700">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

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
                <CardHeader>
                  <CardTitle>Activity Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeDetail.activity_logs.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">No activity logs found for this range.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Reason</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Check Out</th>
                            <th className="px-4 py-3">Check In</th>
                            <th className="px-4 py-3">Extra Time</th>
                            <th className="px-4 py-3">Outside Duration</th>
                            <th className="px-4 py-3">Violation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {employeeDetail.activity_logs.map((log) => (
                            <tr key={`${log.id}-${log.date}-${log.checked_out_at ?? 'na'}`}>
                              <td className="px-4 py-3 text-gray-700">{log.date}</td>
                              <td className="px-4 py-3 text-gray-700">
                                {log.reason_description ? `${log.reason_name}: ${log.reason_description}` : log.reason_name}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline">{log.status}</Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-700">{formatTimestamp(log.checked_out_at)}</td>
                              <td className="px-4 py-3 text-gray-700">{formatTimestamp(log.checked_in_at)}</td>
                              <td className="px-4 py-3">
                                <Badge className={limitBadgeClass(log.extra_lunch_minutes)}>
                                  {formatMinutes(log.extra_lunch_minutes)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-700">{formatMinutes(log.total_outside_office_minutes)}</td>
                              <td className="px-4 py-3">
                                <Badge className={log.violation ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}>
                                  {log.violation ? 'Yes' : 'No'}
                                </Badge>
                              </td>
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
