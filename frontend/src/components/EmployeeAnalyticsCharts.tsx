import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Cell, Pie, PieChart } from 'recharts';
import type { Gatepass } from '@/hooks/useGatepasses';
import {
  buildReasonPieData,
  getAvailableChartYears,
  getLunchChartPeriodLabel,
  getMonthSelectOptions,
  LUNCH_LIMIT_MINUTES,
  type LunchBarView,
  type LunchChartFilter,
} from '@/lib/employee-analytics';
import EmployeeExtraLunchBarChart from '@/components/EmployeeExtraLunchBarChart';

const pieChartConfig = {
  Out: { label: 'Out', color: '#3b82f6' },
  Lunch: { label: 'Lunch', color: '#f59e0b' },
  Other: { label: 'Other', color: '#8b5cf6' },
};

interface EmployeeAnalyticsChartsProps {
  gatepasses: Gatepass[];
  periodLabel?: string;
  compact?: boolean;
}

const EmployeeAnalyticsCharts: React.FC<EmployeeAnalyticsChartsProps> = ({
  gatepasses,
  periodLabel = 'All time',
  compact = false,
}) => {
  const now = new Date();
  const [lunchView, setLunchView] = useState<LunchBarView>('daily');
  const [lunchYear, setLunchYear] = useState(now.getFullYear());
  const [lunchMonth, setLunchMonth] = useState(now.getMonth() + 1);

  const yearOptions = useMemo(() => getAvailableChartYears(gatepasses), [gatepasses]);
  const monthOptions = useMemo(() => getMonthSelectOptions(), []);

  const lunchFilter = useMemo(
    (): LunchChartFilter => ({
      view: lunchView,
      year: lunchYear,
      month: lunchMonth,
    }),
    [lunchView, lunchYear, lunchMonth],
  );

  const lunchPeriodLabel = useMemo(
    () => getLunchChartPeriodLabel(lunchFilter),
    [lunchFilter],
  );

  const pieData = useMemo(() => buildReasonPieData(gatepasses), [gatepasses]);
  const chartHeight = compact ? 'max-h-[240px]' : 'max-h-[300px]';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-800">Requests by reason</CardTitle>
          <p className="text-xs text-gray-500">
            Out, Lunch, and Other · {periodLabel}
          </p>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No requests yet.</p>
          ) : (
            <ChartContainer config={pieChartConfig} className={`mx-auto aspect-square w-full ${chartHeight}`}>
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="category" />} />
                <ChartLegend content={<ChartLegendContent nameKey="category" />} />
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={compact ? 48 : 56}
                  outerRadius={compact ? 80 : 96}
                  strokeWidth={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.category} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base text-gray-800">Extra lunch time</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Beyond {LUNCH_LIMIT_MINUTES} min allowed · {lunchPeriodLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={lunchView} onValueChange={(value) => setLunchView(value as LunchBarView)}>
              <SelectTrigger className="h-8 w-[100px] shrink-0 border-orange-200 bg-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            {lunchView === 'daily' && (
              <Select
                value={String(lunchMonth)}
                onValueChange={(value) => setLunchMonth(Number(value))}
              >
                <SelectTrigger className="h-8 w-[120px] shrink-0 border-orange-200 bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(lunchView === 'daily' || lunchView === 'monthly') && (
              <Select
                value={String(lunchYear)}
                onValueChange={(value) => setLunchYear(Number(value))}
              >
                <SelectTrigger className="h-8 w-[88px] shrink-0 border-orange-200 bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <EmployeeExtraLunchBarChart
            gatepasses={gatepasses}
            filter={lunchFilter}
            compact={compact}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAnalyticsCharts;
