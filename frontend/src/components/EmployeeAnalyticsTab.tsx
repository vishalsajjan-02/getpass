import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Clock, CheckCircle, X, BarChart3 } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import { useGatepasses, type Gatepass } from '@/hooks/useGatepasses';
import { calculateExtraLunchMinutes, LUNCH_LIMIT_MINUTES } from '@/lib/employee-analytics';
import {
  formatGatepassDate,
  formatGatepassReason,
  getGatepassStatusLabel,
  isPendingGatepassStatus,
  toDateOnlyKey,
} from '@/lib/gatepass';
import { toast } from '@/hooks/use-toast';

type RangePreset = '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

const PRESET_LABELS: Record<RangePreset, string> = {
  '1w': 'Last 7 days',
  '1m': 'Last 30 days',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '1y': 'Last year',
  all: 'All time',
};

const getRangeStart = (preset: RangePreset): string | null => {
  if (preset === 'all') return null;
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  switch (preset) {
    case '1w':
      start.setDate(end.getDate() - 6);
      break;
    case '1m':
      start.setMonth(end.getMonth() - 1);
      break;
    case '3m':
      start.setMonth(end.getMonth() - 3);
      break;
    case '6m':
      start.setMonth(end.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      break;
  }
  return toDateOnlyKey(start);
};

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

const downloadCsv = (filename: string, rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return;
  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

interface EmployeeAnalyticsTabProps {
  /** When provided, uses this list instead of the current user's gatepasses from the API. */
  gatepasses?: Gatepass[];
}

const EmployeeAnalyticsTab: React.FC<EmployeeAnalyticsTabProps> = ({ gatepasses: gatepassesProp }) => {
  const [preset, setPreset] = useState<RangePreset>('1m');
  const { data: fetchedGatepasses = [], isLoading: isFetching } = useGatepasses();
  const gatepasses = gatepassesProp ?? fetchedGatepasses;
  const isLoading = gatepassesProp === undefined ? isFetching : false;

  const rangeStart = useMemo(() => getRangeStart(preset), [preset]);

  const filtered = useMemo(() => {
    if (!rangeStart) return gatepasses;
    return gatepasses.filter((g) => {
      const key = toDateOnlyKey(g.date);
      return key !== null && key >= rangeStart;
    });
  }, [gatepasses, rangeStart]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      pending: filtered.filter((g) => isPendingGatepassStatus(g.status)).length,
      approved: filtered.filter((g) => g.status === 'approved').length,
      completed: filtered.filter((g) => g.status === 'completed').length,
      rejected: filtered.filter((g) => g.status === 'rejected' || g.status === 'cancelled').length,
      minutesOutside: filtered.reduce((sum, g) => sum + (g.total_minutes_outside || 0), 0),
      extraLunch: filtered.reduce((sum, g) => sum + calculateExtraLunchMinutes(g), 0),
    }),
    [filtered],
  );

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((g) => {
      const key = getGatepassStatusLabel(g.status);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ title: 'No data', description: 'Nothing to export for this period.', variant: 'destructive' });
      return;
    }
    downloadCsv(
      `my-gatepass-report-${preset}.csv`,
      filtered.map((g: Gatepass) => ({
        Date: formatGatepassDate(g.date),
        Reason: formatGatepassReason(g),
        Status: getGatepassStatusLabel(g.status),
        'Out Time': g.checked_out_at ? new Date(g.checked_out_at).toLocaleString() : '',
        'In Time': g.checked_in_at ? new Date(g.checked_in_at).toLocaleString() : '',
        'Minutes Outside': g.total_minutes_outside ?? 0,
        'Extra Lunch Minutes': calculateExtraLunchMinutes(g),
      })),
    );
    toast({ title: 'Report downloaded', description: 'Your gatepass report CSV has been saved.' });
  };

  if (isLoading) {
    return (
      <Card className="shadow-md border-0">
        <CardContent className="p-8 text-center text-gray-500">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-medium text-gray-700">Report period</span>
            <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRESET_LABELS) as RangePreset[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PRESET_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Total" value={stats.total} subtitle={PRESET_LABELS[preset]} icon={<FileText className="h-5 w-5" />} color="blue" />
        <MetricCard title="Pending" value={stats.pending} subtitle={PRESET_LABELS[preset]} icon={<Clock className="h-5 w-5" />} color="orange" />
        <MetricCard title="Approved" value={stats.approved} subtitle={PRESET_LABELS[preset]} icon={<CheckCircle className="h-5 w-5" />} color="green" />
        <MetricCard title="Completed" value={stats.completed} subtitle={PRESET_LABELS[preset]} icon={<CheckCircle className="h-5 w-5" />} color="indigo" />
        <MetricCard title="Rejected" value={stats.rejected} subtitle={PRESET_LABELS[preset]} icon={<X className="h-5 w-5" />} color="red" />
        <MetricCard
          title="Extra Lunch"
          value={formatMinutes(stats.extraLunch)}
          subtitle={`Over ${LUNCH_LIMIT_MINUTES} min`}
          icon={<BarChart3 className="h-5 w-5" />}
          color="purple"
        />
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-800">By status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byStatus.length === 0 ? (
            <p className="text-sm text-gray-500">No requests in this period.</p>
          ) : (
            byStatus.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{status}</span>
                <span className="font-semibold text-orange-600">{count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAnalyticsTab;
