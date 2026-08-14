import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBanner from '@/components/DashboardBanner';
import GatepassRequestForm from '../components/GatepassRequestForm';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassList from '../components/GatepassList';
import SelfAttendanceTab from '@/components/SelfAttendanceTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Users, Search, ClipboardList, Clock } from 'lucide-react';
import { useMockAuth } from '../contexts/MockAuthContext';
import { useGatepasses, useCreateGatepass } from '../hooks/useGatepasses';
import { useMyAttendance } from '../hooks/useUserInOutTime';
import { toast } from '@/hooks/use-toast';
import {
  formatGatepassReason,
  getGatepassStatusLabel,
  isPendingGatepassStatus,
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

const getRequestTime = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  return 0;
};

const matchesGatepassSearch = (gatepass: any, search: string): boolean => {
  if (!search) return true;
  return [
    formatGatepassReason(gatepass),
    getGatepassStatusLabel(gatepass.status),
    gatepass.reason_name,
    gatepass.reason_description,
    gatepass.destination,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(search);
};

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [requestPage, setRequestPage] = useState<'requests' | 'history'>('requests');
  const [historySearch, setHistorySearch] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const { user } = useMockAuth();
  const { data: gatepasses = [], isLoading } = useGatepasses();
  const { data: attendance } = useMyAttendance();
  const createGatepassMutation = useCreateGatepass();
  const canRequestGatepass = attendance?.state === 'present';

  useEffect(() => {
    if (!isLoading && user) {
      setIsInitialLoading(false);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (!selectedGatepass) return;
    const latestGatepass = gatepasses.find((gatepass) => gatepass.id === selectedGatepass.id);
    if (latestGatepass && latestGatepass !== selectedGatepass) {
      setSelectedGatepass(latestGatepass);
    }
  }, [gatepasses, selectedGatepass]);

  const handleTabChange = (tab: string) => {
    setShowRequestForm(false);
    if (tab === 'overview') {
      setRequestPage('requests');
    }
    setActiveTab(tab);
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attendance', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  const badgeClass = 'text-[11px] px-2 py-0.5 font-medium whitespace-nowrap';

  const getStatusBadge = (gatepass: any) => {
    const { status, approval_flow, approval_requests } = gatepass;

    if (approval_flow === 'manager_then_admin') {
      const managerPending = approval_requests?.some((r: any) => r.step === 1 && r.status === 'pending');
      const adminPending = approval_requests?.some((r: any) => r.step === 2 && r.status === 'pending');
      if (managerPending || adminPending) {
        return (
          <div className="flex gap-1 flex-wrap">
            {managerPending && <Badge className={`${badgeClass} bg-amber-100 text-amber-800 border-amber-200`}>Pending for Manager</Badge>}
            {adminPending && <Badge className={`${badgeClass} bg-purple-100 text-purple-800 border-purple-200`}>Pending for Admin</Badge>}
          </div>
        );
      }
    }

    switch (status) {
      case 'approved':
        return <Badge className={`${badgeClass} bg-green-100 text-green-700 border-green-200`}>Approved</Badge>;
      case 'pending_manager_approval':
        return <Badge className={`${badgeClass} bg-amber-100 text-amber-800 border-amber-200`}>Pending for Manager</Badge>;
      case 'pending_admin_approval':
        return <Badge className={`${badgeClass} bg-purple-100 text-purple-800 border-purple-200`}>Pending for Admin</Badge>;
      case 'pending':
        return <Badge className={`${badgeClass} bg-orange-100 text-orange-700 border-orange-200`}>Pending</Badge>;
      case 'rejected':
        return <Badge className={`${badgeClass} bg-red-100 text-red-700 border-red-200`}>Rejected</Badge>;
      case 'cancelled':
        return <Badge className={`${badgeClass} bg-rose-100 text-rose-700 border-rose-200`}>Cancelled</Badge>;
      case 'active':
        return <Badge className={`${badgeClass} bg-orange-100 text-orange-700 border-orange-200`}>Out</Badge>;
      case 'completed':
        return <Badge className={`${badgeClass} bg-emerald-100 text-emerald-800 border-emerald-200`}>Completed</Badge>;
      default:
        return <Badge variant="secondary" className={badgeClass}>{getGatepassStatusLabel(status as any)}</Badge>;
    }
  };

  const todayDate = toLocalDateString(new Date());

  const sortRequests = (left: any, right: any) => {
    const leftPending = isPendingGatepassStatus(left.status);
    const rightPending = isPendingGatepassStatus(right.status);
    if (leftPending !== rightPending) return leftPending ? -1 : 1;
    const rightDate = getRequestTime(right.date);
    const leftDate = getRequestTime(left.date);
    if (rightDate !== leftDate) return rightDate - leftDate;
    return getRequestTime(right.created_at) - getRequestTime(left.created_at);
  };

  const todayRequests = useMemo(
    () =>
      gatepasses
        .filter((g) => getRequestDateKey(g.date) === todayDate)
        .sort(sortRequests),
    [gatepasses, todayDate],
  );

  const historyRequests = useMemo(
    () =>
      gatepasses
        .filter((g) => {
          const requestDate = getRequestDateKey(g.date);
          // History = everything except today (includes past and future-dated).
          if (!requestDate || requestDate === todayDate) return false;
          return matchesGatepassSearch(g, historySearch.trim().toLowerCase());
        })
        .sort(sortRequests),
    [gatepasses, todayDate, historySearch],
  );

  const handleNewRequest = async (data: any) => {
    try {
      await createGatepassMutation.mutateAsync({
        reason_id: data.reason_id,
        reason_name: data.reason_name,
        reason_description: data.reason_description,
        date: data.date,
      });
      setShowRequestForm(false);
      toast({
        title: 'Success',
        description: 'Gatepass request created successfully!',
      });
    } catch (error) {
      console.error('Error creating gatepass:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create gatepass request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const attendanceBanner = attendance && attendance.state !== 'present' && (
    <Card className="border-amber-200 bg-amber-50 shadow-sm">
      <CardContent className="p-4 text-sm text-amber-900">
        {attendance.state === 'absent' ? (
          <>
            You are not in today. Ask the gatekeeper to mark you{' '}
            <strong>Present</strong> before you can request lunch, out, or other gatepasses.
          </>
        ) : (
          <>
            You have <strong>left for the day</strong>. New gatepass requests are not allowed.
          </>
        )}
      </CardContent>
    </Card>
  );

  const pageHeaders: Record<string, { title: string; description: string }> = {
    overview: {
      title: requestPage === 'history' ? 'Request History' : 'Employee Dashboard',
      description:
        requestPage === 'history'
          ? 'All past gatepass requests'
          : 'Welcome back! Manage your gatepass requests and track their status.',
    },
    attendance: {
      title: 'Attendance',
      description: 'Your daily in/out attendance for the selected month',
    },
  };

  const currentPageHeader = pageHeaders[activeTab] ?? pageHeaders.overview;

  const renderRequestCards = (requests: typeof gatepasses, emptyMessage: string) => {
    if (isLoading) {
      return (
        <Card className="shadow-md border-0">
          <CardContent className="text-center p-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
            <p>Loading requests...</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <GatepassList
        gatepasses={requests}
        onViewDetails={setSelectedGatepass}
        getStatusBadge={getStatusBadge}
        emptyState={
          <div className="text-center p-8 text-gray-500">
            <Clock className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p>{emptyMessage}</p>
          </div>
        }
      />
    );
  };

  const renderOverview = () => (
    <div className="mt-2 space-y-4 animate-fade-in">
      {attendanceBanner}

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="shrink-0 text-lg font-semibold text-gray-800">
            {requestPage === 'history' ? 'Request History' : 'Gatepass Requests'}
          </h3>
          {requestPage === 'history' && (
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by reason or status..."
                className="h-9 border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
                aria-label="Search request history"
              />
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              variant={requestPage === 'requests' ? 'default' : 'outline'}
              onClick={() => setRequestPage('requests')}
              className={requestPage === 'requests' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={requestPage === 'history' ? 'default' : 'outline'}
              onClick={() => setRequestPage('history')}
              className={requestPage === 'history' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              History
            </Button>
          </div>
        </div>

        {requestPage === 'history'
          ? renderRequestCards(
              historyRequests,
              historySearch.trim()
                ? 'No past requests match your search.'
                : 'No past requests found.',
            )
          : renderRequestCards(todayRequests, 'No requests found for today.')}
      </div>
    </div>
  );

  const renderContent = () => {
    if (showRequestForm) {
      return (
        <GatepassRequestForm
          onSubmit={handleNewRequest}
          onCancel={() => setShowRequestForm(false)}
        />
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'attendance':
        return <SelfAttendanceTab />;
      default:
        return renderOverview();
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      menuItems={menuItems}
      colorScheme="orange"
      pageHeader={
        <DashboardBanner
          title={currentPageHeader.title}
          description={currentPageHeader.description}
          icon={
            activeTab === 'attendance' ? (
              <ClipboardList className="h-7 w-7 text-white" />
            ) : activeTab !== 'overview' ? (
              <Users className="h-4 w-4 text-white" />
            ) : undefined
          }
          actions={
            activeTab === 'overview' && requestPage === 'requests' && !showRequestForm ? (
              <Button
                type="button"
                onClick={() => setShowRequestForm(true)}
                disabled={createGatepassMutation.isPending || !canRequestGatepass}
                className="shrink-0 h-9 rounded-md bg-white px-3 md:px-4 text-xs md:text-sm font-semibold text-black shadow-sm hover:bg-gray-100 disabled:opacity-60"
              >
                <Plus className="w-4 h-4 mr-1.5 text-black" />
                {createGatepassMutation.isPending ? 'Creating...' : 'New Gatepass Request'}
              </Button>
            ) : undefined
          }
        />
      }
    >
      {renderContent()}

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={!!selectedGatepass}
        onClose={() => setSelectedGatepass(null)}
        userRole="employee"
      />
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
