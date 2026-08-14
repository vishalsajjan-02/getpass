import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassList from '../components/GatepassList';
import ReportingTimingTab, {
  ReportingTimingSearchBar,
} from '../components/ReportingTimingTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  QrCode,
  Eye,
  ArrowLeft,
  ClipboardList,
  LogOut,
  CheckCircle,
} from 'lucide-react';
import { useGatepasses, useUpdateGatepassStatus } from '../hooks/useGatepasses';
import { toast } from '@/hooks/use-toast';
import {
  formatGatepassTime,
  getGatepassReasonParts,
  getGatepassStatusLabel,
  isPermanentOutGatepass,
} from '@/lib/gatepass';
import { cn } from '@/lib/utils';

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

type DashboardSection = 'gatepass' | 'attendance';

const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('gatepass');
  const [gatepassPage, setGatepassPage] = useState<'today' | 'history'>('today');
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [attendanceSearch, setAttendanceSearch] = useState('');
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
    if (dashboardSection !== 'gatepass') {
      setGatepassPage('today');
    }
  }, [dashboardSection]);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Shield className="w-5 h-5" /> },
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

  const historyGatepasses = gatepasses.filter((gatepass) => {
    const requestDate = getRequestDateKey(gatepass.date);
    return !!requestDate && requestDate < todayDate;
  });

  const getStatusBadge = (gatepass: any) => {
    const { status, approval_flow, approval_requests } = gatepass;
    const badgeClass: Record<string, string> = {
      approved: 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300',
      active: 'bg-gradient-to-r from-blue-100 to-blue-200 text-orange-700 border-orange-300',
      completed: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300',
      pending: 'bg-gradient-to-r from-blue-100 to-blue-200 text-orange-700 border-orange-300',
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
        title: 'Success',
        description: 'Employee marked Out successfully',
      });
    } catch (error) {
      console.error('Error checking out employee:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to check out employee',
        variant: 'destructive',
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
        title: 'Success',
        description: 'Employee marked In successfully',
      });
    } catch (error) {
      console.error('Error checking in employee:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to check in employee',
        variant: 'destructive',
      });
    }
  };

  const renderSectionSwitcher = () => (
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={dashboardSection === 'gatepass' ? 'default' : 'outline'}
        onClick={() => setDashboardSection('gatepass')}
        className={cn(
          'h-11 w-full border text-sm font-semibold',
          dashboardSection === 'gatepass'
            ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-red-600'
            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50',
        )}
      >
        <QrCode className="mr-2 h-4 w-4" />
        Gatepass
      </Button>
      <Button
        type="button"
        variant={dashboardSection === 'attendance' ? 'default' : 'outline'}
        onClick={() => setDashboardSection('attendance')}
        className={cn(
          'h-11 w-full border text-sm font-semibold',
          dashboardSection === 'attendance'
            ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-red-600'
            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50',
        )}
      >
        <ClipboardList className="mr-2 h-4 w-4" />
        Attendance
      </Button>
    </div>
  );

  const renderGatepassSection = () => {
    if (gatepassPage === 'history') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setGatepassPage('today')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h2 className="text-lg font-bold text-gray-800 md:text-xl">Gatepass History</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-orange-600" />
              <p className="text-gray-500">Loading gatepasses...</p>
            </div>
          ) : historyGatepasses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No past gatepasses found.</div>
          ) : (
            <GatepassList
              gatepasses={historyGatepasses}
              onViewDetails={setSelectedGatepass}
              getStatusBadge={getStatusBadge}
            />
          )}
        </div>
      );
    }

    return (
      <div className="animate-fade-in">
        <Card className="border-0 bg-gradient-to-br from-white to-gray-50 shadow-xl">
          <CardHeader className="space-y-2 px-4 py-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-gray-800 md:text-lg">
                Today&apos;s Gatepasses
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGatepassPage('history')}
                className="h-8 shrink-0"
              >
                History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {isLoading ? (
              <div className="py-6 text-center text-gray-500">
                <div className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-b-2 border-orange-600" />
                <p className="text-sm">Loading gatepasses...</p>
              </div>
            ) : sortedTodayGatepasses.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                <QrCode className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm">No gatepasses found for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedTodayGatepasses.map((gatepass) => {
                  const reason = getGatepassReasonParts(gatepass);
                  const reasonLabel = reason.description
                    ? `${reason.name}: ${reason.description}`
                    : reason.name;

                  return (
                    <div
                      key={gatepass.id}
                      className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 shadow-sm">
                        <span className="text-xs font-bold text-white">
                          {gatepass.profiles?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('') || 'U'}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        <p
                          className="min-w-0 shrink truncate text-sm text-gray-600"
                          title={`${gatepass.profiles?.name || 'Unknown'}${
                            gatepass.profiles?.department ? ` • ${gatepass.profiles.department}` : ''
                          }`}
                        >
                          <span className="font-semibold text-gray-800">
                            {gatepass.profiles?.name || 'Unknown'}
                          </span>
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
                            <span className="font-normal text-orange-700">: {reason.description}</span>
                          )}
                        </span>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                        {(gatepass.checked_out_at || gatepass.checked_in_at) && (
                          <span className="hidden text-xs sm:inline">
                            {gatepass.checked_out_at && (
                              <>
                                <span className="font-semibold text-gray-700">OUT </span>
                                <span className="font-medium text-blue-600">
                                  {formatGatepassTime(gatepass.checked_out_at)}
                                </span>
                              </>
                            )}
                            {gatepass.checked_out_at && gatepass.checked_in_at && (
                              <span className="mx-1 text-gray-300">·</span>
                            )}
                            {gatepass.checked_in_at && (
                              <>
                                <span className="font-semibold text-gray-700">IN </span>
                                <span className="font-medium text-green-600">
                                  {formatGatepassTime(gatepass.checked_in_at)}
                                </span>
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
                          className="h-8 w-8 shrink-0 p-0 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
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
  };

  const renderContent = () =>
    dashboardSection === 'gatepass' ? (
      renderGatepassSection()
    ) : (
      <ReportingTimingTab
        hideToolbar
        searchTerm={attendanceSearch}
        onSearchTermChange={setAttendanceSearch}
      />
    );

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      menuItems={menuItems}
      colorScheme="orange"
      hideSidebar
      pageHeader={renderSectionSwitcher()}
      pageToolbar={
        dashboardSection === 'attendance' ? (
          <ReportingTimingSearchBar
            searchTerm={attendanceSearch}
            onSearchTermChange={setAttendanceSearch}
          />
        ) : undefined
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
