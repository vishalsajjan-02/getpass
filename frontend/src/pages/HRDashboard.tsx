import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBanner from '@/components/DashboardBanner';
import MetricCard from '../components/MetricCard';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassRequestForm from '@/components/GatepassRequestForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Users, Clock, CheckCircle, UserCheck, Eye, Check, X, BarChart, Search, ChevronDown, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCreateGatepass, useGatepasses, useUpdateGatepassStatus, type Gatepass, type GatepassStatus } from '@/hooks/useGatepasses';
import { useProfiles, useGatepassStats } from '@/hooks/useProfiles';
import { useMockAuth } from '@/contexts/MockAuthContext';
import HRUsersTab, { CreateUserDialogButton } from '@/components/HRUsersTab';
import HRAnalyticsTab from '@/components/HRAnalyticsTab';
import { formatGatepassDate, formatGatepassReason, getGatepassStatusLabel, isPendingGatepassStatus } from '@/lib/gatepass';

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

const HRDashboard = () => {
  const { user } = useMockAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [selectedApprovalStep, setSelectedApprovalStep] = useState<1 | 2 | null>(null);
  const [bulkApproveMode, setBulkApproveMode] = useState<'lunch' | 'all' | null>(null);
  const [requestPage, setRequestPage] = useState<'requests' | 'history'>('requests');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const isManager = user?.role === 'manager';
  
  const { data: gatepasses = [], isLoading: gatepassesLoading, refetch: refetchGatepasses } = useGatepasses();
  const { data: stats, refetch: refetchGatepassStats } = useGatepassStats();
  const updateGatepassMutation = useUpdateGatepassStatus();
  const createGatepassMutation = useCreateGatepass();

  useEffect(() => {
    if (!selectedGatepass) return;
    const latestGatepass = gatepasses.find((gatepass) => gatepass.id === selectedGatepass.id);
    if (latestGatepass && latestGatepass !== selectedGatepass) {
      setSelectedGatepass(latestGatepass);
    }
  }, [gatepasses, selectedGatepass]);

  const menuItems = isManager ? [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'Requests', icon: <Clock className="w-5 h-5" /> },
  ] : [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'Requests', icon: <Clock className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart className="w-5 h-5" /> },
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
        description: "Failed to create gatepass request.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300">Approved</Badge>;
      case 'pending_manager_approval':
        return <Badge className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border-amber-300">Pending Manager Approval</Badge>;
      case 'pending_admin_approval':
      case 'pending':
        return <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-300">Rejected</Badge>;
      case 'cancelled':
        return <Badge className="bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border-rose-300">Cancelled</Badge>;
      case 'active':
        return <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300">Out</Badge>;
      case 'completed':
        return <Badge className="bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300">Completed</Badge>;
      default:
        return <Badge variant="secondary">{getGatepassStatusLabel(status as any)}</Badge>;
    }
  };

  const formatRequestDateTime = (request: typeof gatepasses[number]) => formatGatepassDate(request.date);

  const headerContent = {
    overview: {
      title: isManager ? 'Manager Dashboard' : 'Admin Dashboard',
      description: isManager
        ? 'Approve employee Out requests and track your own gatepass requests'
        : 'Manage employees, approve requests, and monitor system analytics',
    },
    requests: {
      title: 'Requests',
      description: isManager
        ? 'Review manager approvals and track your gatepass requests'
        : 'Review, approve, and track all gatepass requests',
    },
    users: {
      title: 'User Management',
      description: 'Create, update, and manage employees, gatekeepers, and admins',
    },
    analytics: {
      title: 'Analytics & Reports',
      description: 'Monitor trends, export reports, and review system performance',
    },
  } as const;

  const currentHeader = activeTab === 'requests' && requestPage === 'history'
    ? {
        title: 'Request History',
        description: 'Review previous requests with search and date range filters',
      }
    : headerContent[activeTab as keyof typeof headerContent] ?? headerContent.overview;

  const todayDate = toLocalDateString(new Date());

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

  const currentRequests = gatepasses
    .filter((request) => {
      const requestDate = getRequestDateKey(request.date);
      const matchesStatus =
        requestStatusFilter === 'all'
        || isPendingGatepassStatus(request.status);

      return requestDate === todayDate && matchesStatus;
    })
    .sort(sortRequests);

  const historyRequests = gatepasses
    .filter((request) => {
      const requestDate = getRequestDateKey(request.date);
      if (!requestDate || requestDate >= todayDate) return false;

      const search = historySearch.trim().toLowerCase();
      const matchesSearch =
        search.length === 0 ||
        request.profiles?.name?.toLowerCase().includes(search) ||
        formatGatepassReason(request).toLowerCase().includes(search) ||
        request.id.toLowerCase().includes(search) ||
        request.profiles?.department?.toLowerCase().includes(search);

      const matchesDateFrom = !historyFromDate || requestDate >= historyFromDate;
      const matchesDateTo = !historyToDate || requestDate <= historyToDate;

      return matchesSearch && matchesDateFrom && matchesDateTo;
    })
    .sort(sortRequests);

  const openRequestsTab = (filter: 'all' | 'pending' = 'all') => {
    setRequestPage('requests');
    setRequestStatusFilter(filter);
    setActiveTab('requests');
    void refetchGatepasses();
    void refetchGatepassStats();
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'requests') {
      openRequestsTab('all');
      return;
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

  const renderDashboardHeader = () => (
    <DashboardBanner
      title={currentHeader.title}
      description={currentHeader.description}
      icon={<Users className="h-7 w-7 text-white" />}
      actions={
        activeTab === 'users' && !isManager ? (
          <CreateUserDialogButton className="shrink-0 h-11 rounded-lg bg-white px-5 text-slate-900 shadow-sm hover:bg-slate-50 font-medium" />
        ) : undefined
      }
    />
  );

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={stats?.total?.toString() || '0'}
          subtitle="All time"
          icon={<Users className="w-6 h-6" />}
          color="blue"
          onClick={() => openRequestsTab('all')}
        />
        <MetricCard
          title="Pending Approval"
          value={stats?.pending?.toString() || '0'}
          subtitle="All time"
          icon={<Clock className="w-6 h-6" />}
          color="orange"
          onClick={() => openRequestsTab('pending')}
        />
        <MetricCard
          title={isManager ? 'Awaiting Admin' : 'Approved'}
          value={stats?.approved?.toString() || '0'}
          subtitle="All time"
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          onClick={() => openRequestsTab('all')}
        />
        <MetricCard
          title={isManager ? 'Rejected / Cancelled' : 'Active Gatepasses'}
          value={(isManager ? ((stats?.rejected ?? 0) + (stats?.cancelled ?? 0)) : (stats?.active ?? 0)).toString()}
          subtitle="All time"
          icon={<UserCheck className="w-6 h-6" />}
          color="purple"
          onClick={() => openRequestsTab('all')}
        />
      </div>

      {/* Recent Requests */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800">Recent Requests</CardTitle>
          <div className="flex items-center gap-3">
            {isManager && (
              <Button
                onClick={() => setShowRequestForm(true)}
                disabled={createGatepassMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createGatepassMutation.isPending ? 'Creating...' : 'New Request'}
              </Button>
            )}
            <Button 
              variant="link" 
              className="text-blue-600 hover:text-blue-700 font-semibold"
              onClick={() => openRequestsTab('all')}
            >
              View All →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {gatepassesLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-4">
              {gatepasses.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-6 border-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm">
                        {request.profiles?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{request.profiles?.name || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">{formatGatepassReason(request)} • {request.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{formatRequestDateTime(request)}</p>
                      <p className="text-sm text-gray-500">{request.profiles?.department || 'No Department'}</p>
                    </div>
                    {getStatusBadge(request.status)}
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedGatepass(request);
                          setSelectedApprovalStep(null);
                        }}
                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {getVisibleApprovalSteps(request).map((step) => (
                        <React.Fragment key={`${request.id}-${step}`}>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            title={getApprovalActionTitle(step, 'approve')}
                            onClick={() => handleApprove(request.id, step)}
                            className="hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            title={getApprovalActionTitle(step, 'reject')}
                            onClick={() => {
                              setSelectedGatepass(request);
                              setSelectedApprovalStep(step);
                            }}
                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderRequestCards = (requests: Gatepass[], emptyMessage: string) => {
    if (gatepassesLoading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    if (requests.length === 0) {
      return (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {requests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-all duration-200">
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md shrink-0">
                    <span className="text-white font-bold text-xs">
                      {request.profiles?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0 flex items-center gap-3 text-sm">
                    <h3 className="font-semibold text-gray-900 shrink-0">{request.profiles?.name || 'Unknown User'}</h3>
                    <p className="text-gray-600 truncate">{formatGatepassReason(request)}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {request.id} • {request.profiles?.department || 'No Department'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-medium text-gray-700">{formatRequestDateTime(request)}</p>
                  {getStatusBadge(request.status)}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedGatepass(request);
                        setSelectedApprovalStep(null);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {getVisibleApprovalSteps(request).map((step) => (
                      <React.Fragment key={`${request.id}-${step}`}>
                        <Button 
                          size="sm" 
                          title={getApprovalActionTitle(step, 'approve')}
                          onClick={() => handleApprove(request.id, step)}
                          className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          title={getApprovalActionTitle(step, 'reject')}
                          onClick={() => {
                            setSelectedGatepass(request);
                            setSelectedApprovalStep(step);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderRequestsPage = () => (
    <div className="space-y-6">
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto rounded-xl border bg-white/80 p-3 shadow-sm scrollbar-hidden">
        <div className="flex items-center gap-2 shrink-0 ml-auto">
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

      {renderRequestCards(currentRequests, 'No requests found for today.')}
    </div>
  );

  const renderHistoryPage = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white/80 p-3 shadow-sm">
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
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search request history..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-600">From</span>
          <Input
            type="date"
            value={historyFromDate}
            onChange={(e) => setHistoryFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-600">To</span>
          <Input
            type="date"
            value={historyToDate}
            onChange={(e) => setHistoryToDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {renderRequestCards(historyRequests, 'No past requests found for the selected search or date range.')}
    </div>
  );

  const renderRequests = () =>
    requestPage === 'history' ? renderHistoryPage() : renderRequestsPage();

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
      case 'requests':
        return renderRequests();
      case 'users':
        return isManager ? renderRequests() : <HRUsersTab />;
      case 'analytics':
        return isManager ? renderOverview() : <HRAnalyticsTab />;
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
