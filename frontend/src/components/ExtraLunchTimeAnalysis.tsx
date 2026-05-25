import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { useLunchRangeReport } from '@/hooks/useLunchAnalytics';
import { useProfiles } from '@/hooks/useProfiles';
import { useDepartments } from '@/hooks/useLookupData';
import {
  buildLunchChartData,
  formatAnalyticsMinutes,
  getDefaultChartRange,
  getTopLunchViolators,
  hasLunchChartData,
  filterEmployeesByDepartment,
  type LunchChartBarDatum,
  type LunchChartView,
} from '@/lib/admin-lunch-analytics';
import { toast } from '@/hooks/use-toast';

const chartConfig = {
  allowedMinutes: { label: 'Within allowance', color: '#3b82f6' },
  extraMinutes: { label: 'Extra time', color: '#ef4444' },
  withinLimit: { label: 'Within limit', color: '#22c55e' },
};

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return;
  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map((row) =>
      Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const LunchBarTooltip = ({
  active,
  payload,
  allowedLimit,
  employeeName,
}: TooltipProps<number, string> & { allowedLimit: number; employeeName: string }) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as LunchChartBarDatum | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-gray-700">{employeeName}</p>
      <p className="font-semibold text-gray-900">{row.label}</p>
      <p className="mt-1 text-gray-600">Total lunch: {formatAnalyticsMinutes(row.lunchMinutes)}</p>
      <p className="text-gray-600">Allowed: {allowedLimit} min</p>
      <p className="text-gray-600">Extra time: {formatAnalyticsMinutes(row.extraMinutes)}</p>
      {row.violationCount > 0 && (
        <p className="mt-1 text-red-600">Violations: {row.violationCount}</p>
      )}
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-full max-w-md" />
    <Skeleton className="h-[280px] w-full rounded-lg md:h-[320px]" />
  </div>
);

const ExtraLunchTimeAnalysis: React.FC = () => {
  const defaultRange = useMemo(() => getDefaultChartRange(), []);
  const [view, setView] = useState<LunchChartView>('daily');
  const [employeeId, setEmployeeId] = useState<string>('all');
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [stacked, setStacked] = useState(true);

  const { data: profiles = [] } = useProfiles();
  const { data: departments = [] } = useDepartments();

  const selectedDepartmentName = useMemo(() => {
    if (departmentId === 'all') return null;
    return departments.find((d) => d.department_id === departmentId)?.name ?? null;
  }, [departmentId, departments]);

  const employeeOptions = useMemo(
    () =>
      profiles
        .filter((profile) => profile.role === 'employee')
        .sort((left, right) => left.name.localeCompare(right.name)),
    [profiles],
  );

  const selectedEmployeeName = useMemo(() => {
    if (employeeId === 'all') return 'All employees';
    return employeeOptions.find((p) => p.id === employeeId)?.name ?? 'Selected employee';
  }, [employeeId, employeeOptions]);

  const { data: rangeReport, isLoading, isFetching } = useLunchRangeReport(
    startDate,
    endDate,
    employeeId === 'all' ? undefined : employeeId,
    !!startDate && !!endDate,
  );

  const allowedLimit = rangeReport?.allowed_lunch_minutes ?? 30;

  const filteredEmployees = useMemo(() => {
    const employees = rangeReport?.employees ?? [];
    return filterEmployeesByDepartment(employees, selectedDepartmentName);
  }, [rangeReport?.employees, selectedDepartmentName]);

  const chartData = useMemo(
    () => buildLunchChartData(view, filteredEmployees, startDate, endDate),
    [view, filteredEmployees, startDate, endDate],
  );

  const topViolators = useMemo(
    () => getTopLunchViolators(filteredEmployees, 10),
    [filteredEmployees],
  );

  const showEmpty = !isLoading && !hasLunchChartData(chartData);

  const exportChartData = () => {
    const rows = chartData.map((row) => ({
      Period: row.label,
      Key: row.key,
      'Total Lunch (min)': row.lunchMinutes,
      'Allowed Portion (min)': row.allowedMinutes,
      'Extra Time (min)': row.extraMinutes,
      Violations: row.violationCount,
    }));

    downloadCsv(`extra-lunch-${view}-${startDate}-to-${endDate}.csv`, rows);
    toast({
      title: 'Exported',
      description: 'Chart data downloaded as CSV.',
    });
  };

  const exportViolators = () => {
    const rows = topViolators.map((row) => ({
      Employee: row.employee_name,
      Department: row.department || 'N/A',
      'Total Extra Time': formatAnalyticsMinutes(row.total_extra_lunch_minutes),
      'Violation Count': row.violation_count,
    }));

    downloadCsv(`top-lunch-violators-${startDate}-to-${endDate}.csv`, rows);
    toast({
      title: 'Exported',
      description: 'Top violators list downloaded as CSV.',
    });
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="space-y-4 pb-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-lg text-gray-900">Extra Lunch Time Analysis</CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              Lunch allowance {allowedLimit} min · extra = duration − {allowedLimit}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportChartData}
              disabled={showEmpty}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export chart
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportViolators}
              disabled={topViolators.length === 0}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export violators
            </Button>
          </div>
        </div>

        <Tabs value={view} onValueChange={(value) => setView(value as LunchChartView)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-orange-50">
            <TabsTrigger value="daily" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="yearly" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Yearly
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employeeOptions.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.department_id} value={department.department_id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="bg-white"
            aria-label="Start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="bg-white"
            aria-label="End date"
          />

          <Select
            value={stacked ? 'stacked' : 'simple'}
            onValueChange={(value) => setStacked(value === 'stacked')}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Chart style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stacked">Stacked (allowed + extra)</SelectItem>
              <SelectItem value="simple">Extra only (green / red)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            {isLoading || isFetching ? (
              <ChartSkeleton />
            ) : showEmpty ? (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 md:h-[320px]">
                <p className="text-sm text-gray-500">No data available</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full md:h-[320px]">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    allowDecimals={false}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <ChartTooltip
                    content={
                      <LunchBarTooltip
                        allowedLimit={allowedLimit}
                        employeeName={selectedEmployeeName}
                      />
                    }
                  />
                  {stacked ? (
                    <>
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="allowedMinutes"
                        name="Within allowance"
                        stackId="lunch"
                        fill="var(--color-allowedMinutes)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="extraMinutes"
                        name="Extra time"
                        stackId="lunch"
                        fill="var(--color-extraMinutes)"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  ) : (
                    <Bar dataKey="extraMinutes" name="Extra time" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.extraMinutes > 0 ? '#ef4444' : '#22c55e'}
                        />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ChartContainer>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Viewing: {selectedEmployeeName}
              {selectedDepartmentName ? ` · ${selectedDepartmentName}` : ''}
              {' · '}
              {startDate} to {endDate}
            </p>
          </div>

          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-800">Top violators</CardTitle>
              <p className="text-xs text-gray-500">Highest extra lunch time in range</p>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 px-4 pb-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : topViolators.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-gray-500">No violations in this range.</p>
              ) : (
                <div className="max-h-[320px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Extra</th>
                        <th className="px-3 py-2">#</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topViolators.map((row) => (
                        <tr key={row.user_id} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{row.employee_name}</p>
                            <p className="text-xs text-gray-500">{row.department || '—'}</p>
                          </td>
                          <td className="px-3 py-2 font-medium text-red-600">
                            {formatAnalyticsMinutes(row.total_extra_lunch_minutes)}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{row.violation_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtraLunchTimeAnalysis;
