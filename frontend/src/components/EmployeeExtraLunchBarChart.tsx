import React, { useMemo } from 'react';
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
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { Gatepass } from '@/hooks/useGatepasses';
import {
  buildEmployeeLunchBarData,
  hasEmployeeLunchBarData,
  LUNCH_LIMIT_MINUTES,
  type EmployeeLunchBarDatum,
  type LunchChartFilter,
} from '@/lib/employee-analytics';

const chartConfig = {
  allowedMinutes: { label: 'Within allowance', color: '#3b82f6' },
  extraMinutes: { label: 'Extra time', color: '#ef4444' },
};

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

const LunchBarTooltip = ({
  active,
  payload,
}: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as EmployeeLunchBarDatum | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-900">{row.label}</p>
      <p className="mt-1 text-gray-600">Total lunch: {formatMinutes(row.lunchMinutes)}</p>
      <p className="text-gray-600">Allowed: {LUNCH_LIMIT_MINUTES} min</p>
      <p className="text-gray-600">Extra time: {formatMinutes(row.extraMinutes)}</p>
    </div>
  );
};

interface EmployeeExtraLunchBarChartProps {
  gatepasses: Gatepass[];
  filter: LunchChartFilter;
  compact?: boolean;
}

const EmployeeExtraLunchBarChart: React.FC<EmployeeExtraLunchBarChartProps> = ({
  gatepasses,
  filter,
  compact = false,
}) => {
  const chartData = useMemo(
    () => buildEmployeeLunchBarData(gatepasses, filter),
    [gatepasses, filter],
  );

  const showEmpty = !hasEmployeeLunchBarData(chartData);
  const chartHeight = compact ? 'h-[220px]' : 'h-[280px] md:h-[300px]';

  return (
    <>
      {showEmpty ? (
        <p className={`flex items-center justify-center text-sm text-gray-500 ${chartHeight}`}>
          No extra lunch time recorded.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className={`w-full ${chartHeight}`}>
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
            <ChartTooltip content={<LunchBarTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="allowedMinutes"
              name="Within allowance"
              stackId="lunch"
              fill="var(--color-allowedMinutes)"
            />
            <Bar
              dataKey="extraMinutes"
              name="Extra time"
              stackId="lunch"
              fill="var(--color-extraMinutes)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </>
  );
};

export default EmployeeExtraLunchBarChart;
