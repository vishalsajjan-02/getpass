import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Clock, CheckCircle, UserCheck, Eye, Check, X, BarChart, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGatepasses, useUpdateGatepassStatus } from '@/hooks/useGatepasses';
import { useProfiles, useGatepassStats } from '@/hooks/useProfiles';
import { useMockAuth } from '@/contexts/MockAuthContext';
import HRUsersTab, { CreateUserDialogButton } from '@/components/HRUsersTab';
import HRAnalyticsTab from '@/components/HRAnalyticsTab';

const HRDashboard = () => {
  const { user } = useMockAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [requestFromDate, setRequestFromDate] = useState('');
  const [requestToDate, setRequestToDate] = useState('');
  
  const { data: gatepasses = [], isLoading: gatepassesLoading } = useGatepasses();
  const { data: stats } = useGatepassStats();
  const updateGatepassMutation = useUpdateGatepassStatus();

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'Requests', icon: <Clock className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart className="w-5 h-5" /> },
  ];

  const handleApprove = async (id: string) => {
    try {
      await updateGatepassMutation.mutateAsync({
        id,
        status: 'approved',
        approved_by: user?.id,
      });
      toast({
        title: "Gatepass Approved",
        description: "The gatepass request has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve gatepass",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await updateGatepassMutation.mutateAsync({
        id,
        status: 'rejected',
        rejection_reason: reason,
        approved_by: user?.id,
      });
      toast({
        title: "Gatepass Rejected",
        description: "The gatepass request has been rejected",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-300">Rejected</Badge>;
      case 'active':
        return <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatRequestTime = (timeString?: string) => {
    if (!timeString) return null;

    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRequestDateTime = (request: typeof gatepasses[number]) => {
    const formattedDate = new Date(request.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = formatRequestTime(request.out_time);

    return formattedTime ? `${formattedTime} ${formattedDate}` : formattedDate;
  };

  const headerContent = {
    overview: {
      title: 'HR Dashboard',
      description: 'Manage employees, approve requests, and monitor system analytics',
    },
    requests: {
      title: 'Requests',
      description: 'Review, approve, and track all employee gatepass requests',
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

  const currentHeader = headerContent[activeTab as keyof typeof headerContent] ?? headerContent.overview;

  const filteredGatepasses = gatepasses.filter((request) => {
    const search = requestSearch.trim().toLowerCase();
    const matchesSearch =
      search.length === 0 ||
      request.profiles?.name?.toLowerCase().includes(search) ||
      request.purpose?.toLowerCase().includes(search) ||
      request.gatepass_id?.toLowerCase().includes(search) ||
      request.profiles?.department?.toLowerCase().includes(search);

    const matchesStatus =
      requestStatusFilter === 'all' || request.status === requestStatusFilter;

    const requestDate = request.date?.slice(0, 10);
    const matchesDateFrom = !requestFromDate || (requestDate && requestDate >= requestFromDate);
    const matchesDateTo = !requestToDate || (requestDate && requestDate <= requestToDate);

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const openRequestsTab = (filter: 'all' | 'pending' | 'approved' = 'all') => {
    setRequestSearch('');
    setRequestStatusFilter(filter);
    setActiveTab('requests');
  };

  const renderDashboardHeader = () => (
    <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 rounded-xl px-5 py-4 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">{currentHeader.title}</h2>
          <p className="text-white/90 text-sm md:text-base leading-tight">{currentHeader.description}</p>
        </div>
        {activeTab === 'users' && (
          <CreateUserDialogButton className="shrink-0 h-12 rounded-xl bg-white px-5 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-50" />
        )}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={stats?.total?.toString() || '0'}
          icon={<Users className="w-6 h-6" />}
          color="blue"
          trend={{ value: "+12%", isPositive: true }}
          onClick={() => openRequestsTab('all')}
        />
        <MetricCard
          title="Pending Approval"
          value={stats?.pending?.toString() || '0'}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
          trend={{ value: "+5%", isPositive: true }}
          onClick={() => openRequestsTab('pending')}
        />
        <MetricCard
          title="Approved Today"
          value={stats?.approved?.toString() || '0'}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          trend={{ value: "+8%", isPositive: true }}
          onClick={() => openRequestsTab('approved')}
        />
        <MetricCard
          title="Active Gatepasses"
          value={stats?.active?.toString() || '0'}
          icon={<UserCheck className="w-6 h-6" />}
          color="purple"
          trend={{ value: "+2%", isPositive: true }}
          onClick={() => openRequestsTab('all')}
        />
      </div>

      {/* Recent Requests */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800">Recent Requests</CardTitle>
          <Button 
            variant="link" 
            className="text-blue-600 hover:text-blue-700 font-semibold"
            onClick={() => setActiveTab('requests')}
          >
            View All →
          </Button>
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
                      <p className="text-sm text-gray-500">{request.purpose} • {request.gatepass_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{formatRequestDateTime(request)}</p>
                      <p className="text-sm text-gray-500">{request.expected_return_time}</p>
                    </div>
                    {getStatusBadge(request.status)}
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelectedGatepass(request)}
                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleApprove(request.id)}
                            className="hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedGatepass(request)}
                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
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

  const renderRequests = () => (
    <div className="space-y-6">
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto rounded-xl border bg-white/80 p-3 shadow-sm scrollbar-hidden">
        <div className="relative w-full min-w-[240px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={requestSearch}
            onChange={(e) => setRequestSearch(e.target.value)}
            placeholder="Search requests..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-600">From</span>
          <Input
            type="date"
            value={requestFromDate}
            onChange={(e) => setRequestFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-gray-600">To</span>
          <Input
            type="date"
            value={requestToDate}
            onChange={(e) => setRequestToDate(e.target.value)}
            className="w-40"
          />
        </div>
        {(requestFromDate || requestToDate) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRequestFromDate('');
              setRequestToDate('');
            }}
            className="shrink-0"
          >
            Clear
          </Button>
        )}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
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
            variant={requestStatusFilter === 'approved' ? 'default' : 'outline'}
            onClick={() => setRequestStatusFilter('approved')}
            className={requestStatusFilter === 'approved' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            Approved
          </Button>
        </div>
      </div>

      {gatepassesLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredGatepasses.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
          No requests found for the selected search or filter.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredGatepasses.map((request) => (
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
                      <p className="text-gray-600 truncate">{request.purpose}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {request.gatepass_id} • {request.profiles?.department || 'No Department'}
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
                        onClick={() => setSelectedGatepass(request)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {request.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(request.id)}
                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setSelectedGatepass(request)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'requests':
        return renderRequests();
      case 'users':
        return <HRUsersTab />;
      case 'analytics':
        return <HRAnalyticsTab />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50 flex">
      <div className="h-screen overflow-hidden flex-shrink-0">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          menuItems={menuItems}
          colorScheme="orange"
        />
      </div>
      <main className="flex-1 min-w-0 min-h-0 p-8 overflow-hidden flex flex-col gap-6">
        <div className="flex-shrink-0">
          {renderDashboardHeader()}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden pr-1">
          {renderContent()}
        </div>
      </main>

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={!!selectedGatepass}
        onClose={() => setSelectedGatepass(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        userRole="admin"
      />
    </div>
  );
};

export default HRDashboard;
