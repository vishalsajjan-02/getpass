import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import type { Gatepass } from '@/hooks/useGatepasses';
import { buildReasonPieData, buildWeeklyExtraTimeData, LUNCH_LIMIT_MINUTES } from '@/lib/employee-analytics';

const pieChartConfig = {
  Out: { label: 'Out', color: '#3b82f6' },
  Lunch: { label: 'Lunch', color: '#f59e0b' },
  Other: { label: 'Other', color: '#8b5cf6' },
};

const lineChartConfig = {
  minutes: { label: 'Extra lunch time', color: '#f97316' },
};

interface EmployeeAnalyticsChartsProps {
  gatepasses: Gatepass[];
  periodLabel?: string;
  compact?: boolean;
  /** When set, line chart weeks align to this filter start date. */
  rangeStart?: string | null;
}

const EmployeeAnalyticsCharts: React.FC<EmployeeAnalyticsChartsProps> = ({
  gatepasses,
  periodLabel = 'All time',
  compact = false,
  rangeStart = null,
}) => {
  const pieData = useMemo(() => buildReasonPieData(gatepasses), [gatepasses]);
  const weeklyExtraData = useMemo(
    () => buildWeeklyExtraTimeData(gatepasses, rangeStart),
    [gatepasses, rangeStart],
  );

  const chartHeight = compact ? 'max-h-[240px]' : 'max-h-[300px]';
  const lineHeight = compact ? 'h-[240px]' : 'h-[300px]';

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
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-800">Extra lunch time (week-wise)</CardTitle>
          <p className="text-xs text-gray-500">
            Beyond {LUNCH_LIMIT_MINUTES} min allowed · {periodLabel}
          </p>
        </CardHeader>
        <CardContent>
          {weeklyExtraData.every((week) => week.minutes === 0) ? (
            <p className="py-12 text-center text-sm text-gray-500">No extra lunch time recorded.</p>
          ) : (
            <ChartContainer config={lineChartConfig} className={`w-full ${lineHeight}`}>
              <LineChart data={weeklyExtraData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
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
                    <ChartTooltipContent formatter={(value) => [`${value} min`, 'Extra time']} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--color-minutes)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--color-minutes)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAnalyticsCharts;
