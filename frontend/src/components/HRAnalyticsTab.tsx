import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Download, Eye, Search } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';
import { useGatepasses, type Gatepass, type GatepassStatus } from '@/hooks/useGatepasses';
import GatepassDetailsModal from '@/components/GatepassDetailsModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatGatepassDate,
  formatGatepassReason,
  formatGatepassTime,
  getGatepassStatusLabel,
  resolveOutsideMinutes,
} from '@/lib/gatepass';
import { toast } from '@/hooks/use-toast';

type AnalyticsPreset = 'today' | '1w' | '1m' | '3m' | '6m' | '1y' | 'custom';
type GatepassReasonKey = 'lunch' | 'out' | 'other';

type UserGatepassSummary = {
  user_id: string;
  employee_name: string;
  email?: string;
  department?: string;
  manager_name: string;
  lunch: number;
  out: number;
  other: number;
  total: number;
  gatepasses: Gatepass[];
};

const formatMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const gatepassStatusBadgeClass = (status: GatepassStatus): string => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'pending_manager_approval':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'pending_admin_approval':
    case 'pending':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'active':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRequestDateKey = (value: string | undefined): string | null => {
  if (!value) return null;
  const normalized = String(value).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDateOnly(parsed);
};

const getReasonKey = (gatepass: Gatepass): GatepassReasonKey => {
  const name = gatepass.reason_name?.trim().toLowerCase() ?? '';
  if (name === 'lunch') return 'lunch';
  if (name === 'out') return 'out';
  return 'other';
};

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
    case 'today':
      break;
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
  const { user } = useAuth();
  const [preset, setPreset] = useState<AnalyticsPreset>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserGatepassSummary | null>(null);
  const [selectedGatepass, setSelectedGatepass] = useState<Gatepass | null>(null);
  const today = formatDateOnly(new Date());
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  const { startDate, endDate } = useMemo(
    () => getRangeDates(preset, customStartDate, customEndDate),
    [customEndDate, customStartDate, preset],
  );

  const { data: profiles = [] } = useProfiles();
  const { data: gatepasses = [], isLoading } = useGatepasses();

  const managerNameByUserId = useMemo(() => {
    const nameById = new Map(profiles.map((profile) => [profile.id, profile.name]));
    return new Map(
      profiles.map((profile) => [
        profile.id,
        profile.manager_id ? nameById.get(profile.manager_id) ?? 'Unassigned' : 'Unassigned',
      ]),
    );
  }, [profiles]);

  const userSummaries = useMemo(() => {
    const byUser = new Map<string, UserGatepassSummary>();

    for (const gatepass of gatepasses) {
      const dateKey = getRequestDateKey(gatepass.date);
      if (!dateKey || dateKey < startDate || dateKey > endDate) continue;

      const existing = byUser.get(gatepass.user_id);
      const reason = getReasonKey(gatepass);

      if (!existing) {
        byUser.set(gatepass.user_id, {
          user_id: gatepass.user_id,
          employee_name: gatepass.profiles?.name || 'Unknown',
          email: gatepass.profiles?.email,
          department: gatepass.profiles?.department,
          manager_name: managerNameByUserId.get(gatepass.user_id) ?? 'Unassigned',
          lunch: reason === 'lunch' ? 1 : 0,
          out: reason === 'out' ? 1 : 0,
          other: reason === 'other' ? 1 : 0,
          total: 1,
          gatepasses: [gatepass],
        });
        continue;
      }

      existing.lunch += reason === 'lunch' ? 1 : 0;
      existing.out += reason === 'out' ? 1 : 0;
      existing.other += reason === 'other' ? 1 : 0;
      existing.total += 1;
      existing.gatepasses.push(gatepass);
    }

    return [...byUser.values()]
      .map((summary) => ({
        ...summary,
        gatepasses: [...summary.gatepasses].sort((left, right) => {
          const leftDate = getRequestDateKey(left.date) ?? '';
          const rightDate = getRequestDateKey(right.date) ?? '';
          if (leftDate !== rightDate) return rightDate.localeCompare(leftDate);
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        }),
      }))
      .sort((left, right) => {
        if (right.total !== left.total) return right.total - left.total;
        return left.employee_name.localeCompare(right.employee_name);
      });
  }, [endDate, gatepasses, managerNameByUserId, startDate]);

  const filteredSummaries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return userSummaries;

    return userSummaries.filter(
      (row) =>
        row.employee_name.toLowerCase().includes(query)
        || (row.email || '').toLowerCase().includes(query)
        || (row.department || '').toLowerCase().includes(query)
        || row.manager_name.toLowerCase().includes(query),
    );
  }, [searchTerm, userSummaries]);

  const exportTableData = () => {
    const rows = filteredSummaries.map((row) => ({
      Employee: row.employee_name,
      Email: row.email || 'N/A',
      Department: row.department || 'N/A',
      Manager: row.manager_name,
      Lunch: row.lunch,
      Out: row.out,
      Other: row.other,
      Total: row.total,
    }));

    downloadCsv(`gatepass-users-${startDate}-to-${endDate}.csv`, rows);
    toast({
      title: 'Data Exported',
      description: 'User gatepass summary exported to CSV.',
    });
  };

  const exportUserDetail = (summary: UserGatepassSummary) => {
    const rows = summary.gatepasses.map((gatepass) => ({
      Date: formatGatepassDate(gatepass.date),
      Reason: formatGatepassReason(gatepass),
      Status: getGatepassStatusLabel(gatepass.status),
      'Out Time': gatepass.checked_out_at ? formatGatepassTime(gatepass.checked_out_at) : '—',
      'In Time': gatepass.checked_in_at ? formatGatepassTime(gatepass.checked_in_at) : '—',
      'Minutes Outside': resolveOutsideMinutes(gatepass),
      Destination: gatepass.destination || 'N/A',
    }));

    downloadCsv(
      `gatepasses-${summary.employee_name.replace(/\s+/g, '-').toLowerCase()}-${startDate}-to-${endDate}.csv`,
      rows,
    );
    toast({
      title: 'Detail Exported',
      description: `${summary.employee_name}'s gatepasses exported to CSV.`,
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
              aria-label="Search gatepass users"
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Select value={preset} onValueChange={(value) => setPreset(value as AnalyticsPreset)}>
              <SelectTrigger className="h-9 w-[220px] border-gray-200 bg-white text-sm shadow-sm">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
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
              disabled={filteredSummaries.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Gatepass Report</CardTitle>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{filteredSummaries.length}</span> user
            {filteredSummaries.length === 1 ? '' : 's'}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading gatepasses...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No gatepasses found for the selected filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-orange-50 text-left text-xs uppercase tracking-wide text-orange-800">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Lunch</th>
                    <th className="px-4 py-3">Out</th>
                    <th className="px-4 py-3">Other</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredSummaries.map((row) => (
                    <tr
                      key={row.user_id}
                      className="cursor-pointer hover:bg-orange-50/60"
                      onClick={() => setSelectedUser(row)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{row.employee_name}</p>
                          <p className="text-xs text-gray-500">
                            {row.department || 'No Department'}
                            {row.email ? ` · ${row.email}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.manager_name}</td>
                      <td className="px-4 py-3 tabular-nums font-medium text-amber-700">{row.lunch}</td>
                      <td className="px-4 py-3 tabular-nums font-medium text-sky-700">{row.out}</td>
                      <td className="px-4 py-3 tabular-nums font-medium text-violet-700">{row.other}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-gray-900">{row.total}</td>
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => setSelectedUser(row)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
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

      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b bg-orange-50 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="text-orange-900">
                  {selectedUser?.employee_name ?? 'Employee'} — Gatepasses
                </DialogTitle>
                <DialogDescription className="text-sm text-orange-800/80">
                  {[selectedUser?.email, selectedUser?.department, selectedUser?.manager_name]
                    .filter(Boolean)
                    .join(' · ')}
                  {selectedUser
                    ? ` · Lunch ${selectedUser.lunch} · Out ${selectedUser.out} · Other ${selectedUser.other}`
                    : ''}
                </DialogDescription>
              </div>
              {selectedUser ? (
                <Button
                  size="sm"
                  className="h-9 bg-green-600 hover:bg-green-700"
                  onClick={() => exportUserDetail(selectedUser)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            {!selectedUser || selectedUser.gatepasses.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">No gatepasses for this user.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="bg-orange-50 text-left text-xs uppercase tracking-wide text-orange-800">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Out</th>
                    <th className="px-3 py-2">In</th>
                    <th className="px-3 py-2">Outside</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {selectedUser.gatepasses.map((gatepass) => (
                    <tr
                      key={gatepass.id}
                      className="cursor-pointer hover:bg-orange-50/60"
                      onClick={() => setSelectedGatepass(gatepass)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-800">
                        {formatGatepassDate(gatepass.date)}
                      </td>
                      <td className="max-w-[220px] px-3 py-2 text-gray-700">
                        <p className="truncate" title={formatGatepassReason(gatepass)}>
                          {formatGatepassReason(gatepass)}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={gatepassStatusBadgeClass(gatepass.status)}>
                          {getGatepassStatusLabel(gatepass.status)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-orange-700">
                        {gatepass.checked_out_at ? formatGatepassTime(gatepass.checked_out_at) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-emerald-700">
                        {gatepass.checked_in_at ? formatGatepassTime(gatepass.checked_in_at) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                        {formatMinutes(resolveOutsideMinutes(gatepass))}
                      </td>
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGatepass(gatepass)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={Boolean(selectedGatepass)}
        onClose={() => setSelectedGatepass(null)}
        userRole={(user?.role as 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest') ?? 'admin'}
      />
    </div>
  );
};

export default HRAnalyticsTab;
