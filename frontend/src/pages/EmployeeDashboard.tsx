
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import GatepassRequestForm from '../components/GatepassRequestForm';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassCard from '../components/GatepassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Clock, CheckCircle, X, Users } from 'lucide-react';
import { useMockAuth } from '../contexts/MockAuthContext';
import { useGatepasses, useCreateGatepass } from '../hooks/useGatepasses';
import { toast } from '@/hooks/use-toast';
import { getGatepassStatusLabel, isPendingGatepassStatus } from '@/lib/gatepass';

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'My Requests', icon: <FileText className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <Clock className="w-5 h-5" /> }
  ];

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
        return <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300">In</Badge>;
      default:
        return <Badge variant="secondary">{getGatepassStatusLabel(status as any)}</Badge>;
    }
  };

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

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 rounded-xl px-5 py-4 text-white shadow-xl">
        <h2 className="text-2xl md:text-3xl font-bold">Employee Dashboard</h2>
        <p className="text-white/90 text-sm md:text-base leading-tight">Welcome back! Manage your gatepass requests and track their status.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={stats.total.toString()}
          subtitle="All time"
          icon={<FileText className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Pending"
          value={stats.pending.toString()}
          subtitle="Awaiting approval"
          icon={<Clock className="w-6 h-6" />}
          color="orange"
        />
        <MetricCard
          title="Approved"
          value={stats.approved.toString()}
          subtitle="This month"
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Rejected"
          value={stats.rejected.toString()}
          subtitle="Need revision"
          icon={<X className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-800">
            <Plus className="w-5 h-5 text-green-600" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => setShowRequestForm(true)}
              disabled={createGatepassMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createGatepassMutation.isPending ? 'Creating...' : 'New Gatepass Request'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('requests')}
              className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-2 hover:border-gray-300 transition-all duration-200"
            >
              <FileText className="w-4 h-4 mr-2" />
              View My Requests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800">Recent Requests</CardTitle>
          <Button 
            variant="link" 
            className="text-green-600 hover:text-green-700 font-semibold"
            onClick={() => setActiveTab('requests')}
          >
            View All →
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p>Loading requests...</p>
            </div>
          ) : gatepasses.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No gatepass requests yet</p>
              <p className="text-sm">Create your first request to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gatepasses.slice(0, 5).map((request) => (
                <GatepassCard
                  key={request.id}
                  gatepass={request}
                  onViewDetails={setSelectedGatepass}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">My Gatepass Requests</h2>
        <Button 
          onClick={() => setShowRequestForm(true)}
          disabled={createGatepassMutation.isPending}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {createGatepassMutation.isPending ? 'Creating...' : 'New Request'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your requests...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {gatepasses.map((request) => (
            <GatepassCard
              key={request.id}
              gatepass={request}
              onViewDetails={setSelectedGatepass}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}
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
      case 'requests':
        return renderRequests();
      case 'notifications':
        return (
          <div className="text-center p-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications at this time</p>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50 flex">
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        menuItems={menuItems}
        colorScheme="orange"
      />
      <main className="flex-1 min-w-0 min-h-0 p-8 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-hidden pr-1">
          {renderContent()}
        </div>
      </main>

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={!!selectedGatepass}
        onClose={() => setSelectedGatepass(null)}
        userRole="employee"
      />
    </div>
  );
};

export default EmployeeDashboard;
