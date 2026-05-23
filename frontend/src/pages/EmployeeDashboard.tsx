
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBanner from '@/components/DashboardBanner';
import MetricCard from '../components/MetricCard';
import GatepassRequestForm from '../components/GatepassRequestForm';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassList from '../components/GatepassList';
import EmployeeAnalyticsTab from '../components/EmployeeAnalyticsTab';
import EmployeeAnalyticsCharts from '../components/EmployeeAnalyticsCharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Clock, CheckCircle, X, Users, Search, BarChart3 } from 'lucide-react';
import { useMockAuth } from '../contexts/MockAuthContext';
import { useGatepasses, useCreateGatepass } from '../hooks/useGatepasses';
import { toast } from '@/hooks/use-toast';
import {
  formatGatepassDate,
  formatGatepassReason,
  getGatepassStatusLabel,
  isPendingGatepassStatus,
} from '@/lib/gatepass';

type RequestStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const FILTER_LABELS: Record<RequestStatusFilter, string> = {
  all: 'All requests',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');

  const { user } = useMockAuth();
  const { data: gatepasses = [], isLoading } = useGatepasses();
  const createGatepassMutation = useCreateGatepass();

  // Handle initial loading state
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

  useEffect(() => {
    if (activeTab !== 'requests') {
      setSearchTerm('');
      setStatusFilter('all');
    }
  }, [activeTab]);

  const handleMetricClick = (filter: RequestStatusFilter) => {
    setStatusFilter(filter);
    setSearchTerm('');
    setActiveTab('requests');
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'My Requests', icon: <FileText className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const badgeClass = 'text-[11px] px-2 py-0.5 font-medium whitespace-nowrap';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className={`${badgeClass} bg-green-100 text-green-700 border-green-200`}>Approved</Badge>;
      case 'pending_manager_approval':
        return <Badge className={`${badgeClass} bg-amber-100 text-amber-800 border-amber-200`}>Pending Manager</Badge>;
      case 'pending_admin_approval':
      case 'pending':
        return <Badge className={`${badgeClass} bg-orange-100 text-orange-700 border-orange-200`}>Pending</Badge>;
      case 'rejected':
        return <Badge className={`${badgeClass} bg-red-100 text-red-700 border-red-200`}>Rejected</Badge>;
      case 'cancelled':
        return <Badge className={`${badgeClass} bg-rose-100 text-rose-700 border-rose-200`}>Cancelled</Badge>;
      case 'active':
        return <Badge className={`${badgeClass} bg-blue-100 text-blue-700 border-blue-200`}>Out</Badge>;
      case 'completed':
        return <Badge className={`${badgeClass} bg-emerald-100 text-emerald-800 border-emerald-200`}>Completed</Badge>;
      default:
        return <Badge variant="secondary" className={badgeClass}>{getGatepassStatusLabel(status as any)}</Badge>;
    }
  };

  const filteredGatepasses = useMemo(() => {
    let list = gatepasses;

    if (statusFilter === 'pending') {
      list = list.filter((g) => isPendingGatepassStatus(g.status));
    } else if (statusFilter === 'approved') {
      list = list.filter((g) => g.status === 'approved');
    } else if (statusFilter === 'rejected') {
      list = list.filter((g) => g.status === 'rejected' || g.status === 'cancelled');
    }

    const query = searchTerm.trim().toLowerCase();
    if (!query) return list;

    return list.filter((gatepass) => {
      const searchable = [
        formatGatepassReason(gatepass),
        formatGatepassDate(gatepass.date),
        getGatepassStatusLabel(gatepass.status),
        gatepass.reason_name,
        gatepass.reason_description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [gatepasses, searchTerm, statusFilter]);

  const stats = {
    total: gatepasses.length,
    pending: gatepasses.filter(g => isPendingGatepassStatus(g.status)).length,
    approved: gatepasses.filter(g => g.status === 'approved').length,
    rejected: gatepasses.filter(g => g.status === 'rejected' || g.status === 'cancelled').length,
  };

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
        title: "Success",
        description: "Gatepass request created successfully!",
      });
    } catch (error) {
      console.error('Error creating gatepass:', error);
      toast({
        title: "Error",
        description: "Failed to create gatepass request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pageHeaders: Record<string, { title: string; description: string }> = {
    overview: {
      title: 'Employee Dashboard',
      description: 'Welcome back! Manage your gatepass requests and track their status.',
    },
    requests: {
      title: 'My Requests',
      description: 'View and track all your gatepass requests.',
    },
    analytics: {
      title: 'Analytics & Reports',
      description: 'View your gatepass trends and download reports.',
    },
  };

  const currentPageHeader = pageHeaders[activeTab] ?? pageHeaders.overview;

  const renderOverview = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={stats.total.toString()}
          subtitle="All time"
          icon={<FileText className="w-6 h-6" />}
          color="blue"
          onClick={() => handleMetricClick('all')}
        />
        <MetricCard
          title="Pending"
          value={stats.pending.toString()}
          subtitle="All time"
          icon={<Clock className="w-6 h-6" />}
          color="orange"
          onClick={() => handleMetricClick('pending')}
        />
        <MetricCard
          title="Approved"
          value={stats.approved.toString()}
          subtitle="All time"
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          onClick={() => handleMetricClick('approved')}
        />
        <MetricCard
          title="Rejected"
          value={stats.rejected.toString()}
          subtitle="All time"
          icon={<X className="w-6 h-6" />}
          color="red"
          onClick={() => handleMetricClick('rejected')}
        />
      </div>

      {isLoading ? (
        <Card className="shadow-md border-0">
          <CardContent className="text-center p-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4" />
            <p>Loading charts...</p>
          </CardContent>
        </Card>
      ) : (
        <EmployeeAnalyticsCharts gatepasses={gatepasses} periodLabel="All time" compact />
      )}

      {isLoading ? (
        <Card className="shadow-md border-0">
          <CardContent className="text-center p-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
            <p>Loading requests...</p>
          </CardContent>
        </Card>
      ) : (
        <GatepassList
          title="Recent Requests"
          gatepasses={gatepasses.slice(0, 2)}
          onViewDetails={setSelectedGatepass}
          getStatusBadge={getStatusBadge}
          headerAction={
            <Button
              variant="link"
              className="text-green-600 hover:text-green-700 font-semibold h-auto p-0"
              onClick={() => setActiveTab('requests')}
            >
              View All →
            </Button>
          }
          emptyState={
            <div className="text-center p-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No gatepass requests yet</p>
              <p className="text-sm">Create your first request to get started</p>
            </div>
          }
        />
      )}
    </div>
  );

  const renderRequestsToolbar = () => (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search by reason, date, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
            aria-label="Search gatepass requests"
          />
        </div>
        <Button
          onClick={() => setShowRequestForm(true)}
          disabled={createGatepassMutation.isPending}
          className="shrink-0 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {createGatepassMutation.isPending ? 'Creating...' : 'New Request'}
        </Button>
      </div>

      {statusFilter !== 'all' && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-800">
            Showing: {FILTER_LABELS[statusFilter]}
          </Badge>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-orange-600 hover:text-orange-700"
            onClick={() => setStatusFilter('all')}
          >
            Show all
          </Button>
        </div>
      )}
    </div>
  );

  const renderRequestsList = () => (
    <>
      {isLoading ? (
        <Card className="shadow-md border-0">
          <CardContent className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading your requests...</p>
          </CardContent>
        </Card>
      ) : (
        <GatepassList
          gatepasses={filteredGatepasses}
          onViewDetails={setSelectedGatepass}
          getStatusBadge={getStatusBadge}
          emptyState={
            <div className="text-center p-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>
                {searchTerm.trim()
                  ? 'No requests match your search'
                  : statusFilter !== 'all'
                    ? `No ${FILTER_LABELS[statusFilter].toLowerCase()} requests`
                    : 'No gatepass requests yet'}
              </p>
              {searchTerm.trim() || statusFilter !== 'all' ? (
                <Button
                  variant="link"
                  className="mt-2 text-orange-600 hover:text-orange-700"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  {searchTerm.trim() && statusFilter !== 'all' ? 'Clear filters' : searchTerm.trim() ? 'Clear search' : 'Show all'}
                </Button>
              ) : null}
            </div>
          }
        />
      )}
    </>
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
      case 'requests':
        return renderRequestsList();
      case 'analytics':
        return <EmployeeAnalyticsTab />;
      default:
        return renderOverview();
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
          icon={
            activeTab === 'analytics' ? (
              <BarChart3 className="h-4 w-4 text-white" />
            ) : activeTab !== 'overview' ? (
              <Users className="h-4 w-4 text-white" />
            ) : undefined
          }
          actions={
            activeTab === 'overview' ? (
              <Button
                type="button"
                onClick={() => setShowRequestForm(true)}
                disabled={createGatepassMutation.isPending}
                className="shrink-0 h-9 rounded-md bg-white px-3 md:px-4 text-xs md:text-sm font-semibold text-black shadow-sm hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-1.5 text-black" />
                {createGatepassMutation.isPending ? 'Creating...' : 'New Gatepass Request'}
              </Button>
            ) : undefined
          }
        />
      }
      pageToolbar={
        activeTab === 'requests' && !showRequestForm ? renderRequestsToolbar() : undefined
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
