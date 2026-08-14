import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBanner from '@/components/DashboardBanner';
import MetricCard from '../components/MetricCard';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassRequestForm from '@/components/GatepassRequestForm';
import GatepassList from '@/components/GatepassList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Users, Clock, CheckCircle, UserCheck, Check, X, BarChart, Search, ChevronDown, ArrowLeft, Plus, ClipboardList, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCreateGatepass, useGatepasses, useUpdateGatepassStatus, type Gatepass, type GatepassStatus } from '@/hooks/useGatepasses';
import { useGatepassStats, type GatepassStats } from '@/hooks/useProfiles';
import { useUserInOutTimeDailyReport, useMyAttendance } from '@/hooks/useUserInOutTime';
import { useMockAuth } from '@/contexts/MockAuthContext';
import HRUsersTab, { UsersToolbar, type UserRoleFilter } from '@/components/HRUsersTab';
import HRAnalyticsTab from '@/components/HRAnalyticsTab';
import HRSettingsTab from '@/components/HRSettingsTab';
import ReportingTimingTab from '@/components/ReportingTimingTab';
import SelfAttendanceTab from '@/components/SelfAttendanceTab';
import { formatGatepassReason, getGatepassStatusLabel, isPendingGatepassStatus } from '@/lib/gatepass';

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
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return 0;
};

const buildGatepassStats = (requests: Gatepass[]): GatepassStats => {
  const stats: GatepassStats = {
    total: 0,
    pending: 0,
    pending_manager_approval: 0,
    pending_admin_approval: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    active: 0,
    completed: 0,
  };

  for (const request of requests) {
    stats.total += 1;

    switch (request.status) {
      case 'pending':
        stats.pending += 1;
        break;
      case 'pending_manager_approval':
        stats.pending_manager_approval += 1;
        stats.pending += 1;
        break;
      case 'pending_admin_approval':
        stats.pending_admin_approval += 1;
        stats.pending += 1;
        break;
      case 'approved':
        stats.approved += 1;
        break;
      case 'rejected':
        stats.rejected += 1;
        break;
      case 'cancelled':
        stats.cancelled += 1;
        break;
      case 'active':
        stats.active += 1;
        break;
      case 'completed':
        stats.completed += 1;
        break;
    }
  }

  return stats;
};

const matchesGatepassSearch = (request: Gatepass, search: string): boolean => {
  if (search.length === 0) return true;

  return (
    Boolean(request.profiles?.name?.toLowerCase().includes(search)) ||
    formatGatepassReason(request).toLowerCase().includes(search) ||
    request.id.toLowerCase().includes(search) ||
    Boolean(request.profiles?.department?.toLowerCase().includes(search))
  );
};

const HRDashboard = () => {
  const { user } = useMockAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [selectedApprovalStep, setSelectedApprovalStep] = useState<1 | 2 | null>(null);
  const [bulkApproveMode, setBulkApproveMode] = useState<'lunch' | 'all' | null>(null);
  const [requestPage, setRequestPage] = useState<'requests' | 'history'>('requests');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending'>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [usersSearchTerm, setUsersSearchTerm] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<UserRoleFilter>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'admin';
  
  const { data: gatepasses = [], isLoading: gatepassesLoading, refetch: refetchGatepasses } = useGatepasses();
  const { data: stats, refetch: refetchGatepassStats } = useGatepassStats({ enabled: isAdmin });
  const {
    data: dailyAttendance = [],
    isSuccess: dailyAttendanceLoaded,
  } = useUserInOutTimeDailyReport(undefined, {
    enabled: isAdmin && activeTab === 'overview',
  });
  const { data: myAttendance } = useMyAttendance();
  const canRequestGatepass = !isManager || myAttendance?.state === 'present';
  const updateGatepassMutation = useUpdateGatepassStatus();
  const createGatepassMutation = useCreateGatepass();

  const managersInToday = useMemo(() => {
    const present = new Set<string>();
    for (const row of dailyAttendance) {
      // Currently in office: checked in and not checked out.
      if (row.in_time && !row.out_time) {
        present.add(row.user_id);
      }
    }
    return present;
  }, [dailyAttendance]);

  const getManagerApproverId = (request: Gatepass): string | undefined =>
    request.approval_requests?.find((approval) => approval.step === 1)?.approver_user_id
    ?? request.profiles?.manager_id;

  const isManagerNotIn = (request: Gatepass): boolean => {
    const managerId = getManagerApproverId(request);
    if (!managerId) return false;
    if (isManager && user?.id === managerId) {
      return myAttendance?.state !== 'present';
    }
    // Avoid false "away" while admin daily attendance is still loading.
    if (!dailyAttendanceLoaded) return false;
    return !managersInToday.has(managerId);
  };

  useEffect(() => {
    if (!selectedGatepass) return;
    const latestGatepass = gatepasses.find((gatepass) => gatepass.id === selectedGatepass.id);
    if (latestGatepass && latestGatepass !== selectedGatepass) {
      setSelectedGatepass(latestGatepass);
    }
  }, [gatepasses, selectedGatepass]);

  const menuItems = isManager ? [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attendance', icon: <ClipboardList className="w-5 h-5" /> },
  ] : [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attendance', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const approveGatepassStep = async (id: string, approvalStep?: 1 | 2) => {
    await updateGatepassMutation.mutateAsync({
      id,
      status: 'approved',
      approval_step: approvalStep,
    });
  };

  const handleApprove = async (id: string, approvalStep?: 1 | 2) => {
    try {
      await approveGatepassStep(id, approvalStep);
      toast({
        title: approvalStep === 1 ? "Manager Step Approved" : (isManager ? "Manager Approval Saved" : "Admin Approval Saved"),
        description: approvalStep === 1
          ? "The manager approval step has been completed."
          : isManager
            ? "The request has moved to admin approval."
            : "The gatepass request has been approved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve gatepass",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (id: string, reason: string, approvalStep?: 1 | 2) => {
    try {
      await updateGatepassMutation.mutateAsync({
        id,
        status: 'rejected',
        rejection_reason: reason,
        approval_step: approvalStep,
      });
      toast({
        title: approvalStep === 1 ? "Manager Step Rejected" : "Gatepass Rejected",
        description: approvalStep === 1
          ? "The manager approval step has been rejected."
          : "The gatepass request has been rejected.",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject gatepass",
        variant: "destructive"
      });
    }
  };

  const handleNewRequest = async (data: {
    reason_id?: string;
    reason_name?: string;
    reason_description?: string;
    date?: string;
  }) => {
    try {
      await createGatepassMutation.mutateAsync({
        reason_id: data.reason_id,
        reason_name: data.reason_name,
        reason_description: data.reason_description,
        date: data.date,
      });
      setShowRequestForm(false);
      toast({
        title: "Request Created",
        description: "Your gatepass request has been submitted for approval.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create gatepass request.",
        variant: "destructive"
      });
    }
  };

  const badgeClass = 'text-xs font-medium shrink-0';

  const renderManagerPendingLabel = (managerAway: boolean) => (
    <span className="inline-flex items-center gap-0.5">
      {managerAway ? (
        <span className="font-bold text-rose-600" title="Manager is not marked In today">
          !
        </span>
      ) : null}
      Pending for Manager
    </span>
  );

  const getStatusBadge = (gatepass: any) => {
    // When approve/reject actions are shown, status lives inside those action boxes.
    if (getVisibleApprovalSteps(gatepass).length > 0) {
      return null;
    }

    const { status, approval_flow, approval_requests } = gatepass;
    const managerAway = isManagerNotIn(gatepass);

    if (approval_flow === 'manager_then_admin') {
      const managerPending = approval_requests?.some((r: any) => r.step === 1 && r.status === 'pending');
      const adminPending = approval_requests?.some((r: any) => r.step === 2 && r.status === 'pending');
      if (managerPending || adminPending) {
        return (
          <div className="flex gap-1 flex-wrap">
            {managerPending && (
              <Badge
                className={`${badgeClass} bg-amber-100 text-amber-800 border-amber-200`}
                title={managerAway ? 'Manager is not marked In today' : undefined}
              >
                {renderManagerPendingLabel(managerAway)}
              </Badge>
            )}
            {adminPending && <Badge className={`${badgeClass} bg-purple-100 text-purple-800 border-purple-200`}>Pending for Admin</Badge>}
          </div>
        );
      }
    }

    switch (status) {
      case 'approved':
        return <Badge className={`${badgeClass} bg-green-100 text-green-700 border-green-200`}>Approved</Badge>;
      case 'pending_manager_approval':
        return (
          <Badge
            className={`${badgeClass} bg-amber-100 text-amber-800 border-amber-200`}
            title={managerAway ? 'Manager is not marked In today' : undefined}
          >
            {renderManagerPendingLabel(managerAway)}
          </Badge>
        );
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
        return <Badge variant="secondary" className={badgeClass}>{getGatepassStatusLabel(status as GatepassStatus)}</Badge>;
    }
  };

  const openGatepassDetails = (request: Gatepass) => {
    setSelectedGatepass(request);
    setSelectedApprovalStep(null);
  };

  const renderRowActions = (request: Gatepass) => {
    const steps = getVisibleApprovalSteps(request);
    if (steps.length === 0) return null;
    const managerAway = isManagerNotIn(request);

    return (
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step) => {
          const isManagerStep = step === 1;
          return (
            <div
              key={`${request.id}-${step}`}
              className={
                isManagerStep
                  ? 'inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-1.5 py-1'
                  : 'inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-1.5 py-1'
              }
            >
              <Badge
                className={
                  isManagerStep
                    ? `${badgeClass} bg-amber-100 text-amber-800 border-amber-200`
                    : `${badgeClass} bg-purple-100 text-purple-800 border-purple-200`
                }
                title={
                  isManagerStep && managerAway ? 'Manager is not marked In today' : undefined
                }
              >
                {isManagerStep
                  ? renderManagerPendingLabel(managerAway)
                  : 'Pending for Admin'}
              </Badge>
              <Button
                size="icon"
                variant="outline"
                title={getApprovalActionTitle(step, 'approve')}
                onClick={() => handleApprove(request.id, step)}
                className="h-7 w-7 bg-green-600 text-white hover:bg-green-700 hover:text-white border-green-600"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                title={getApprovalActionTitle(step, 'reject')}
                onClick={() => {
                  setSelectedGatepass(request);
                  setSelectedApprovalStep(step);
                }}
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  const headerContent = {
    overview: {
      title: isManager ? 'Manager Dashboard' : 'Admin Dashboard',
      description: isManager
        ? 'Overview, gatepass requests, and approvals in one place'
        : 'Metrics, gatepass requests, and approvals in one place',
    },
    attendance: {
      title: 'Attendance',
      description: isManager
        ? 'Your daily in/out attendance for the selected month'
        : 'Monthly grid — scroll horizontally for In, Out, and status by day',
    },
    users: {
      title: 'User Management',
      description: 'Create, update, and manage employees, gatekeepers, and admins',
    },
    analytics: {
      title: 'Analytics',
      description: 'Gatepass reports with search, date range, and export',
    },
    settings: {
      title: 'Settings',
      description: 'Manage company holidays and leave types',
    },
  } as const;

  const currentHeader = activeTab === 'overview' && requestPage === 'history'
    ? {
        title: 'Request History',
        description: isManager
          ? 'All past gatepass requests'
          : 'Review previous requests with search and date range filters',
      }
    : headerContent[activeTab as keyof typeof headerContent] ?? headerContent.overview;

  const todayDate = toLocalDateString(new Date());
  const todayGatepasses = gatepasses.filter((request) => getRequestDateKey(request.date) === todayDate);
  const overviewStats = isAdmin ? buildGatepassStats(todayGatepasses) : stats;
  const metricsSubtitle = isAdmin ? 'Today' : 'All time';

  const sortRequests = (left: Gatepass, right: Gatepass) => {
    const leftPending = isPendingGatepassStatus(left.status);
    const rightPending = isPendingGatepassStatus(right.status);

    if (leftPending !== rightPending) {
      return leftPending ? -1 : 1;
    }

    const rightDate = getRequestTime(right.date);
    const leftDate = getRequestTime(left.date);
    if (rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    return getRequestTime(right.created_at) - getRequestTime(left.created_at);
  };

  const isDoneGatepassStatus = (status: Gatepass['status']) =>
    status === 'completed' || status === 'rejected' || status === 'cancelled';

  const currentRequests = gatepasses
    .filter((request) => {
      const requestDate = getRequestDateKey(request.date);
      if (requestDate !== todayDate) return false;

      if (isManager) return true;

      // Admin: finished gatepasses belong in History
      if (isDoneGatepassStatus(request.status)) return false;

      const matchesStatus =
        requestStatusFilter === 'all'
        || isPendingGatepassStatus(request.status);
      const search = requestSearch.trim().toLowerCase();

      return matchesStatus && matchesGatepassSearch(request, search);
    })
    .sort(sortRequests);

  const historyRequests = gatepasses
    .filter((request) => {
      const requestDate = getRequestDateKey(request.date);
      if (!requestDate) return false;

      const search = historySearch.trim().toLowerCase();
      const matchesSearch = matchesGatepassSearch(request, search);

      if (isManager) {
        // History = everything except today
        if (requestDate === todayDate) return false;
        return matchesSearch;
      }

      // Admin history: past dates + today's completed/rejected/cancelled
      const isPast = requestDate !== todayDate;
      const isDoneToday = requestDate === todayDate && isDoneGatepassStatus(request.status);
      if (!isPast && !isDoneToday) return false;

      const matchesDateFrom = !historyFromDate || requestDate >= historyFromDate;
      const matchesDateTo = !historyToDate || requestDate <= historyToDate;

      return matchesSearch && matchesDateFrom && matchesDateTo;
    })
    .sort(sortRequests);

  const openRequestsTab = (filter: 'all' | 'pending' = 'all') => {
    setRequestPage('requests');
    setRequestStatusFilter(filter);
    setActiveTab('overview');
    void refetchGatepasses();
    void refetchGatepassStats();
  };

  const handleTabChange = (tab: string) => {
    if (isManager && (tab === 'analytics' || tab === 'users' || tab === 'settings')) {
      setActiveTab('overview');
      return;
    }
    setShowRequestForm(false);
    if (tab === 'overview') {
      setRequestPage('requests');
    }
    setActiveTab(tab);
  };

  const getPendingApprovalStep = (request: Gatepass, step: 1 | 2) =>
    request.approval_requests?.find((approval) => approval.step === step && approval.status === 'pending');

  const getVisibleApprovalSteps = (request: Gatepass): Array<1 | 2> => {
    if (isManager) {
      return request.status === 'pending_manager_approval' && getPendingApprovalStep(request, 1) ? [1] : [];
    }

    if (request.status === 'pending_admin_approval' && getPendingApprovalStep(request, 2)) {
      return [2];
    }

    if (request.status === 'pending_manager_approval' && request.approval_flow === 'manager_then_admin') {
      const steps: Array<1 | 2> = [];
      if (getPendingApprovalStep(request, 1)) steps.push(1);
      if (getPendingApprovalStep(request, 2)) steps.push(2);
      return steps;
    }

    return [];
  };

  const getApprovalActionTitle = (step: 1 | 2, action: 'approve' | 'reject') =>
    `${step === 1 ? 'Manager' : 'Admin'} ${action === 'approve' ? 'Approve' : 'Reject'}`;

  const isLunchRequest = (request: Gatepass) =>
    request.reason_name?.trim().toLowerCase() === 'lunch';

  const getBulkApprovalTargets = (mode: 'lunch' | 'all'): Gatepass[] =>
    currentRequests.filter((request) =>
      getVisibleApprovalSteps(request).length > 0 && (mode === 'all' || isLunchRequest(request)),
    );

  const bulkLunchTargets = !isManager ? getBulkApprovalTargets('lunch') : [];
  const bulkAllTargets = !isManager ? getBulkApprovalTargets('all') : [];

  const handleBulkApprove = async (mode: 'lunch' | 'all') => {
    const targets = getBulkApprovalTargets(mode);

    if (targets.length === 0) {
      toast({
        title: mode === 'lunch' ? 'No Lunch Requests' : 'No Pending Requests',
        description: mode === 'lunch'
          ? 'No pending lunch requests were found in the current list.'
          : 'No pending requests were found in the current list.',
      });
      return;
    }

    setBulkApproveMode(mode);

    let successCount = 0;
    let failedCount = 0;

    try {
      for (const request of targets) {
        try {
          for (const step of getVisibleApprovalSteps(request)) {
            await approveGatepassStep(request.id, step);
          }
          successCount += 1;
        } catch (error) {
          failedCount += 1;
        }
      }

      toast({
        title: mode === 'lunch' ? 'Lunch Requests Approved' : 'Requests Approved',
        description:
          failedCount === 0
            ? `${successCount} request${successCount === 1 ? '' : 's'} approved successfully.`
            : `${successCount} request${successCount === 1 ? '' : 's'} approved, ${failedCount} failed.`,
        variant: failedCount > 0 ? 'destructive' : undefined,
      });
    } finally {
      setBulkApproveMode(null);
    }
  };

  const renderDashboardHeader = () => {
    const showManagerNewRequest =
      isManager && activeTab === 'overview' && requestPage === 'requests' && !showRequestForm;

    return (
      <DashboardBanner
        title={currentHeader.title}
        description={currentHeader.description}
        icon={
          activeTab === 'analytics' ? (
            <BarChart className="h-7 w-7 text-white" />
          ) : (
            <Users className="h-7 w-7 text-white" />
          )
        }
        actions={
          showManagerNewRequest ? (
            <Button
              type="button"
              onClick={() => setShowRequestForm(true)}
              disabled={createGatepassMutation.isPending || !canRequestGatepass}
              className="shrink-0 h-9 rounded-md bg-white px-3 md:px-4 text-xs md:text-sm font-semibold text-black shadow-sm hover:bg-gray-100 disabled:opacity-60"
            >
              <Plus className="mr-1.5 h-4 w-4 text-black" />
              {createGatepassMutation.isPending ? 'Creating...' : 'New Request'}
            </Button>
          ) : undefined
        }
      />
    );
  };

  const renderOverview = () => (
    <div className="mt-2 animate-fade-in">
      {isManager && myAttendance && myAttendance.state !== 'present' && (
        <Card className="mb-4 border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4 text-sm text-amber-900">
            {myAttendance.state === 'absent' ? (
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
      )}
      {!isManager && requestPage !== 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Requests"
            value={overviewStats?.total?.toString() || '0'}
            subtitle={metricsSubtitle}
            icon={<Users className="w-6 h-6" />}
            color="orange"
            onClick={() => openRequestsTab('all')}
          />
          <MetricCard
            title="Pending Approval"
            value={overviewStats?.pending?.toString() || '0'}
            subtitle={metricsSubtitle}
            icon={<Clock className="w-6 h-6" />}
            color="orange"
            onClick={() => openRequestsTab('pending')}
          />
          <MetricCard
            title="Approved"
            value={overviewStats?.approved?.toString() || '0'}
            subtitle={metricsSubtitle}
            icon={<CheckCircle className="w-6 h-6" />}
            color="green"
            onClick={() => openRequestsTab('all')}
          />
          <MetricCard
            title="Active Gatepasses"
            value={(overviewStats?.active ?? 0).toString()}
            subtitle={metricsSubtitle}
            icon={<UserCheck className="w-6 h-6" />}
            color="purple"
            onClick={() => openRequestsTab('all')}
          />
        </div>
      )}

      <div className={isManager || requestPage === 'history' ? 'mt-2' : 'mt-8'}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="shrink-0 text-lg font-semibold text-gray-800">
            {isManager && requestPage === 'history' ? 'Request History' : 'Gatepass Requests'}
          </h3>
          {isManager && (
            <>
              {requestPage === 'history' && (
                <div className="relative min-w-[180px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by name, reason, or department..."
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
            </>
          )}
        </div>
        {gatepassesLoading ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center text-gray-500">Loading requests...</CardContent>
          </Card>
        ) : requestPage === 'history' ? (
          renderHistoryPage()
        ) : (
          renderRequestsPage()
        )}
      </div>
    </div>
  );

  const renderRequestCards = (requests: Gatepass[], emptyMessage: string) => {
    if (gatepassesLoading) {
      return (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center text-gray-500">Loading requests...</CardContent>
        </Card>
      );
    }

    return (
      <GatepassList
        gatepasses={requests}
        onViewDetails={openGatepassDetails}
        getStatusBadge={getStatusBadge}
        renderRowActions={renderRowActions}
        showRequesterName
        emptyState={
          <div className="p-8 text-center text-gray-500">
            <Clock className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p>{emptyMessage}</p>
          </div>
        }
      />
    );
  };

  const renderRequestsToolbar = () => (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white/80 px-3 py-1.5 shadow-sm">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          value={requestSearch}
          onChange={(e) => setRequestSearch(e.target.value)}
          placeholder="Search by name, reason, or department..."
          className="h-9 border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
          aria-label="Search gatepass requests"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!isManager && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={bulkApproveMode !== null || bulkAllTargets.length === 0}
              >
                {bulkApproveMode ? 'Approving...' : 'Approved All'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={bulkApproveMode !== null || bulkLunchTargets.length === 0}
                onClick={() => handleBulkApprove('lunch')}
              >
                Lunch
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={bulkApproveMode !== null || bulkAllTargets.length === 0}
                onClick={() => handleBulkApprove('all')}
              >
                Approve All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          size="sm"
          variant={requestStatusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setRequestStatusFilter('all')}
          className={requestStatusFilter === 'all' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={requestStatusFilter === 'pending' ? 'default' : 'outline'}
          onClick={() => setRequestStatusFilter('pending')}
          className={requestStatusFilter === 'pending' ? 'bg-orange-500 hover:bg-orange-600' : ''}
        >
          Pending
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRequestPage('history')}
        >
          Request History
        </Button>
      </div>
    </div>
  );

  const renderHistoryToolbar = () => (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white/80 px-3 py-1.5 shadow-sm">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRequestPage('requests')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder="Search request history..."
          className="h-9 border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
          aria-label="Search request history"
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
  );

  const renderRequestsPage = () =>
    renderRequestCards(currentRequests, 'No requests found for today.');

  const renderHistoryPage = () =>
    renderRequestCards(
      historyRequests,
      isManager
        ? (historySearch.trim()
          ? 'No past requests match your search.'
          : 'No past requests found.')
        : 'No past requests found for the selected search or date range.',
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
        return isManager ? <SelfAttendanceTab /> : (
          <ReportingTimingTab
            readOnly
            enableMonthDetails
          />
        );
      case 'users':
        return isManager ? renderOverview() : (
          <HRUsersTab searchTerm={usersSearchTerm} roleFilter={usersRoleFilter} />
        );
      case 'analytics':
        return isManager ? renderOverview() : <HRAnalyticsTab />;
      case 'settings':
        return isManager ? renderOverview() : <HRSettingsTab />;
      default:
        return renderOverview();
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      menuItems={menuItems}
      colorScheme="orange"
      pageHeader={renderDashboardHeader()}
      pageToolbar={
        activeTab === 'overview' && !showRequestForm && !isManager
          ? (requestPage === 'history' ? renderHistoryToolbar() : renderRequestsToolbar())
          : activeTab === 'users' && !isManager
            ? (
              <UsersToolbar
                searchTerm={usersSearchTerm}
                onSearchChange={setUsersSearchTerm}
                roleFilter={usersRoleFilter}
                onRoleFilterChange={setUsersRoleFilter}
              />
            )
            : undefined
      }
    >
      {renderContent()}

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={!!selectedGatepass}
        onClose={() => {
          setSelectedGatepass(null);
          setSelectedApprovalStep(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        preferredApprovalStep={selectedApprovalStep}
        userRole={isManager ? 'manager' : 'admin'}
      />
    </DashboardLayout>
  );
};

export default HRDashboard;
