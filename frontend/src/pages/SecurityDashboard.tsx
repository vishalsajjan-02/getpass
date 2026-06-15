import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBanner from '@/components/DashboardBanner';
import MetricCard from '../components/MetricCard';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassList from '../components/GatepassList';
import ReportingTimingTab from '../components/ReportingTimingTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, QrCode, Eye, Search, CheckCircle, Clock, AlertTriangle, LogOut, ArrowLeft, ClipboardList } from 'lucide-react';
import { useGatepasses, useUpdateGatepassStatus } from '../hooks/useGatepasses';
import { toast } from '@/hooks/use-toast';
import {
  formatGatepassReason,
  formatGatepassTime,
  getGatepassReasonParts,
  getGatepassStatusLabel,
  isPermanentOutGatepass,
} from '@/lib/gatepass';

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRequestDateKey = (value: string | undefined): string | null => {
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return toLocalDateString(parsed);
  }

  const normalized = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [gatepassPage, setGatepassPage] = useState<'today' | 'history'>('today');
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const { data: gatepasses = [], isLoading } = useGatepasses();
  const updateGatepassMutation = useUpdateGatepassStatus();

  useEffect(() => {
    if (!selectedGatepass) return;
    const latestGatepass = gatepasses.find((gatepass) => gatepass.id === selectedGatepass.id);
    if (latestGatepass && latestGatepass !== selectedGatepass) {
      setSelectedGatepass(latestGatepass);
    }
  }, [gatepasses, selectedGatepass]);

  useEffect(() => {
    if (activeTab !== 'gatepasses') {
      setGatepassPage('today');
    }
  }, [activeTab]);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Shield className="w-5 h-5" /> },
    { id: 'gatepasses', label: 'Gate Passes', icon: <QrCode className="w-5 h-5" /> },
    { id: 'reporting-timing', label: 'Reporting Timing', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  const todayDate = toLocalDateString(new Date());
  const todayGatepasses = gatepasses.filter((gatepass) => getRequestDateKey(gatepass.date) === todayDate);

  const sortedTodayGatepasses = [...todayGatepasses].sort((left, right) => {
    const leftCompleted = left.status === 'completed';
    const rightCompleted = right.status === 'completed';
    if (leftCompleted !== rightCompleted) {
      return leftCompleted ? 1 : -1;
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  const matchesSearch = (gatepass: (typeof gatepasses)[number]) =>
    gatepass.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gatepass.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatGatepassReason(gatepass).toLowerCase().includes(searchTerm.toLowerCase());

  const filteredTodayGatepasses = sortedTodayGatepasses.filter(matchesSearch);

  const historyGatepasses = gatepasses.filter((gatepass) => {
    const requestDate = getRequestDateKey(gatepass.date);
    if (!requestDate || requestDate >= todayDate) return false;

    const search = historySearch.trim().toLowerCase();
    const matchesHistorySearch =
      !search ||
      gatepass.profiles?.name?.toLowerCase().includes(search) ||
      gatepass.id.toLowerCase().includes(search) ||
      formatGatepassReason(gatepass).toLowerCase().includes(search);

    const matchesDateFrom = !historyFromDate || requestDate >= historyFromDate;
    const matchesDateTo = !historyToDate || requestDate <= historyToDate;

    return matchesHistorySearch && matchesDateFrom && matchesDateTo;
  });

  const getStatusBadge = (gatepass: any) => {
    const { status, approval_flow, approval_requests } = gatepass;
    const badgeClass: Record<string, string> = {
      approved: 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300',
      active: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300',
      completed: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300',
      pending: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300',
      pending_manager_approval: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border-amber-300',
      pending_admin_approval: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
      rejected: 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-300',
      cancelled: 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border-rose-300',
    };

    if (approval_flow === 'manager_then_admin') {
      const managerPending = approval_requests?.some((r: any) => r.step === 1 && r.status === 'pending');
      const adminPending = approval_requests?.some((r: any) => r.step === 2 && r.status === 'pending');
      if (managerPending || adminPending) {
        return (
          <div className="flex gap-1 flex-wrap">
            {managerPending && <Badge className={badgeClass.pending_manager_approval}>Pending for Manager</Badge>}
            {adminPending && <Badge className={badgeClass.pending_admin_approval}>Pending for Admin</Badge>}
          </div>
        );
      }
    }

    return (
      <Badge className={badgeClass[status] ?? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300'}>
        {getGatepassStatusLabel(status as any)}
      </Badge>
    );
  };

  const handleOut = async (gatepassId: string) => {
    try {
      await updateGatepassMutation.mutateAsync({
        id: gatepassId,
        status: 'active',
      });
      toast({
        title: "Success",
        description: 'Employee marked Out successfully',
      });
    } catch (error) {
      console.error('Error checking out employee:', error);
      toast({
        title: "Error",
        description: "Failed to check out employee",
        variant: "destructive"
      });
    }
  };

  const handleIn = async (gatepassId: string) => {
    try {
      await updateGatepassMutation.mutateAsync({
        id: gatepassId,
        status: 'completed',
      });
      toast({
        title: "Success",
        description: 'Employee marked In successfully',
      });
    } catch (error) {
      console.error('Error checking in employee:', error);
      toast({
        title: "Error",
        description: "Failed to check in employee",
        variant: "destructive"
      });
    }
  };

  const stats = {
    total: todayGatepasses.length,
    activeNow: todayGatepasses.filter((g) => g.status === 'active').length,
    completed: todayGatepasses.filter((g) => g.status === 'completed').length,
    pending: todayGatepasses.filter(
      (g) =>
        g.status === 'pending' ||
        g.status === 'pending_manager_approval' ||
        g.status === 'pending_admin_approval',
    ).length,
  };

  const pageHeaders: Record<string, { title: string; description: string }> = {
    overview: {
      title: 'Security Dashboard',
      description: 'Monitor and validate employee gatepasses at entry/exit points',
    },
    gatepasses: {
      title: 'Gate Passes',
      description: "View and manage today's employee gatepass records",
    },
    'reporting-timing': {
      title: 'Reporting Timing',
      description: 'Daily in/out timing for all users — updates throughout the day',
    },
  };

  const currentPageHeader =
    activeTab === 'gatepasses' && gatepassPage === 'history'
      ? {
          title: 'Gatepass History',
          description: 'Search and review past gatepass records',
        }
      : pageHeaders[activeTab] ?? pageHeaders.overview;

  const renderOverview = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Metrics */}
      <div className="mt-2 grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <MetricCard
          title="Total Passes"
          value={stats.total.toString()}
          subtitle="Today"
          icon={<QrCode className="w-4 h-4 md:w-6 md:h-6" />}
          color="blue"
        />
        <MetricCard
          title="Active Now"
          value={stats.activeNow.toString()}
          subtitle="Today"
          icon={<Clock className="w-4 h-4 md:w-6 md:h-6" />}
          color="orange"
        />
        <MetricCard
          title="Completed"
          value={stats.completed.toString()}
          subtitle="Today"
          icon={<CheckCircle className="w-4 h-4 md:w-6 md:h-6" />}
          color="green"
        />
        <MetricCard
          title="Pending Approval"
          value={stats.pending.toString()}
          subtitle="Today"
          icon={<AlertTriangle className="w-4 h-4 md:w-6 md:h-6" />}
          color="red"
        />
      </div>

      {/* Today's Gatepasses */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="space-y-0 px-4 py-2 pb-1">
          <CardTitle className="text-base font-semibold text-gray-800 md:text-lg">Today's Gatepasses</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          {isLoading ? (
            <div className="py-6 text-center text-gray-500">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-orange-600 mx-auto mb-2"></div>
              <p className="text-sm">Loading gatepasses...</p>
            </div>
          ) : todayGatepasses.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              <QrCode className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No gatepasses found for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTodayGatepasses.slice(0, 10).map((gatepass) => {
                const reason = getGatepassReasonParts(gatepass);
                const reasonLabel = reason.description ? `${reason.name}: ${reason.description}` : reason.name;

                return (
                <div key={gatepass.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-sm">
                    <span className="text-white font-bold text-xs">
                      {gatepass.profiles?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                    <p
                      className="min-w-0 shrink truncate text-sm text-gray-600"
                      title={`${gatepass.profiles?.name || 'Unknown'}${gatepass.profiles?.department ? ` • ${gatepass.profiles.department}` : ''}`}
                    >
                      <span className="font-semibold text-gray-800">{gatepass.profiles?.name || 'Unknown'}</span>
                      {gatepass.profiles?.department && (
                        <>
                          <span className="text-gray-300"> • </span>
                          <span>{gatepass.profiles.department}</span>
                        </>
                      )}
                    </p>
                    <span
                      className="max-w-[45%] shrink-0 truncate rounded-md bg-orange-100 px-2 py-0.5 text-xs text-orange-800 ring-1 ring-orange-200"
                      title={reasonLabel}
                    >
                      <span className="font-bold">{reason.name}</span>
                      {reason.description && (
                        <>
                          <span className="font-normal text-orange-700">: {reason.description}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                    {(gatepass.checked_out_at || gatepass.checked_in_at) && (
                      <span className="hidden text-xs sm:inline">
                        {gatepass.checked_out_at && (
                          <>
                            <span className="font-semibold text-gray-700">OUT </span>
                            <span className="font-medium text-blue-600">{formatGatepassTime(gatepass.checked_out_at)}</span>
                          </>
                        )}
                        {gatepass.checked_out_at && gatepass.checked_in_at && (
                          <span className="mx-1 text-gray-300">·</span>
                        )}
                        {gatepass.checked_in_at && (
                          <>
                            <span className="font-semibold text-gray-700">IN </span>
                            <span className="font-medium text-green-600">{formatGatepassTime(gatepass.checked_in_at)}</span>
                          </>
                        )}
                      </span>
                    )}
                    <span className="shrink-0">{getStatusBadge(gatepass)}</span>
                    {gatepass.status === 'approved' && (
                      <Button
                        onClick={() => handleOut(gatepass.id)}
                        disabled={updateGatepassMutation.isPending}
                        size="sm"
                        className="h-8 bg-gradient-to-r from-blue-600 to-indigo-600 px-2 text-xs font-semibold hover:from-blue-700 hover:to-indigo-700"
                      >
                        <LogOut className="mr-1 h-3 w-3" />
                        {updateGatepassMutation.isPending ? 'Saving...' : 'Out'}
                      </Button>
                    )}
                    {gatepass.status === 'active' && !isPermanentOutGatepass(gatepass) && (
                      <Button
                        onClick={() => handleIn(gatepass.id)}
                        disabled={updateGatepassMutation.isPending}
                        size="sm"
                        className="h-8 bg-gradient-to-r from-green-600 to-emerald-600 px-2 text-xs font-semibold hover:from-green-700 hover:to-emerald-700"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {updateGatepassMutation.isPending ? 'Saving...' : 'In'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedGatepass(gatepass)}
                      className="h-8 w-8 shrink-0 p-0 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderGatepassesToolbar = () =>
    gatepassPage === 'history' ? (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white/80 px-3 py-1.5 shadow-sm">
        <Button size="sm" variant="outline" onClick={() => setGatepassPage('today')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search gatepass history..."
            className="h-9 border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
            aria-label="Search gatepass history"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-medium text-gray-600">From</span>
          <Input
            type="date"
            value={historyFromDate}
            onChange={(e) => setHistoryFromDate(e.target.value)}
            className="h-9 w-40 border-gray-200 bg-white text-sm shadow-sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-medium text-gray-600">To</span>
          <Input
            type="date"
            value={historyToDate}
            onChange={(e) => setHistoryToDate(e.target.value)}
            className="h-9 w-40 border-gray-200 bg-white text-sm shadow-sm"
          />
        </div>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search gatepasses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 w-full min-w-[200px] flex-1 border-2 focus:border-orange-300 text-sm sm:max-w-xs"
        />
        <Button size="sm" className="h-9 shrink-0 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Search className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setGatepassPage('history')} className="h-9 shrink-0">
          History
        </Button>
      </div>
    );

  const renderGatepasses = () => {
    const listGatepasses = gatepassPage === 'history' ? historyGatepasses : filteredTodayGatepasses;
    const emptyMessage =
      gatepassPage === 'history'
        ? 'No past gatepasses found for the selected search or date range.'
        : 'No gatepasses found for today.';

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-gray-800 md:text-2xl">
            {gatepassPage === 'history' ? 'Gatepass History' : "Today's Gatepasses"}
          </h2>
          {renderGatepassesToolbar()}
        </div>

        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading gatepasses...</p>
          </div>
        ) : listGatepasses.length === 0 ? (
          <div className="text-center p-8 text-gray-500">{emptyMessage}</div>
        ) : (
          <GatepassList
            gatepasses={listGatepasses}
            onViewDetails={setSelectedGatepass}
            getStatusBadge={getStatusBadge}
          />
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'gatepasses':
        return renderGatepasses();
      case 'reporting-timing':
        return <ReportingTimingTab />;
      default:
        return renderOverview();
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      menuItems={menuItems}
      colorScheme="orange"
      pageHeader={
        <DashboardBanner
          title={currentPageHeader.title}
          description={currentPageHeader.description}
          icon={<Shield className="h-7 w-7 text-white" />}
        />
      }
    >
      {renderContent()}

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={!!selectedGatepass}
        onClose={() => setSelectedGatepass(null)}
        userRole="gatekeeper"
      />
    </DashboardLayout>
  );
};

export default SecurityDashboard;
