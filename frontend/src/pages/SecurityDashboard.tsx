import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardBanner from '@/components/DashboardBanner';
import MetricCard from '../components/MetricCard';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassList from '../components/GatepassList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, QrCode, Eye, RefreshCw, Search, CheckCircle, Clock, Users, AlertTriangle, LogOut } from 'lucide-react';
import { useGatepasses, useUpdateGatepassStatus } from '../hooks/useGatepasses';
import { toast } from '@/hooks/use-toast';
import { formatGatepassReason, formatGatepassTime, getGatepassStatusLabel, isPermanentOutGatepass } from '@/lib/gatepass';

const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: gatepasses = [], isLoading } = useGatepasses();
  const updateGatepassMutation = useUpdateGatepassStatus();

  useEffect(() => {
    if (!selectedGatepass) return;
    const latestGatepass = gatepasses.find((gatepass) => gatepass.id === selectedGatepass.id);
    if (latestGatepass && latestGatepass !== selectedGatepass) {
      setSelectedGatepass(latestGatepass);
    }
  }, [gatepasses, selectedGatepass]);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Shield className="w-5 h-5" /> },
    { id: 'gatepasses', label: 'Gate Passes', icon: <QrCode className="w-5 h-5" /> },
  ];

  // Filter gatepasses based on search term
  const filteredGatepasses = gatepasses.filter((gatepass) =>
    gatepass.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gatepass.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatGatepassReason(gatepass).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const badgeClass: Record<string, string> = {
      approved: 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300',
      active: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300',
      completed: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300',
      pending: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300',
      pending_manager_approval: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 border-amber-300',
      pending_admin_approval: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300',
      rejected: 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-300',
      cancelled: 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border-rose-300',
    };

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
    total: gatepasses.length,
    activeNow: gatepasses.filter((g) => g.status === 'active').length,
    completed: gatepasses.filter((g) => g.status === 'completed').length,
    pending: gatepasses.filter(
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
      description: 'Search and manage all employee gatepass records',
    },
  };

  const currentPageHeader = pageHeaders[activeTab] ?? pageHeaders.overview;

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <MetricCard
          title="Total Passes"
          value={stats.total.toString()}
          subtitle="All time"
          icon={<QrCode className="w-4 h-4 md:w-6 md:h-6" />}
          color="blue"
        />
        <MetricCard
          title="Active Now"
          value={stats.activeNow.toString()}
          subtitle="All time"
          icon={<Clock className="w-4 h-4 md:w-6 md:h-6" />}
          color="orange"
        />
        <MetricCard
          title="Completed"
          value={stats.completed.toString()}
          subtitle="All time"
          icon={<CheckCircle className="w-4 h-4 md:w-6 md:h-6" />}
          color="green"
        />
        <MetricCard
          title="Pending Approval"
          value={stats.pending.toString()}
          subtitle="All time"
          icon={<AlertTriangle className="w-4 h-4 md:w-6 md:h-6" />}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-800 text-lg md:text-xl">
            <QrCode className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
            <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 text-sm">
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('gatepasses')}
              className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-2 hover:border-gray-300 transition-all duration-200 text-sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              View All Passes
            </Button>
            <Button variant="outline" className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-2 hover:border-gray-300 transition-all duration-200 text-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Gatepasses */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
          <CardTitle className="text-gray-800 text-lg md:text-xl">Today's Gatepasses</CardTitle>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Input
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 border-2 focus:border-orange-300 text-sm"
            />
            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p>Loading gatepasses...</p>
            </div>
          ) : filteredGatepasses.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No gatepasses found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGatepasses.slice(0, 10).map((gatepass) => (
                <div key={gatepass.id} className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 md:p-6 border-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-4 w-full lg:w-auto">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-md shrink-0">
                      <span className="text-white font-bold text-xs md:text-sm">
                        {gatepass.profiles?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 text-sm md:text-base truncate">{gatepass.profiles?.name || 'Unknown'}</p>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{gatepass.profiles?.email} • {gatepass.profiles?.department}</p>
                      <p className="text-xs md:text-sm text-gray-600 truncate">{formatGatepassReason(gatepass)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6 w-full lg:w-auto">
                    <div className="flex space-x-4">
                      {gatepass.checked_out_at && (
                        <div className="text-center">
                          <p className="text-xs font-semibold text-gray-700">OUT</p>
                          <p className="text-xs font-medium text-blue-600">
                            {formatGatepassTime(gatepass.checked_out_at)}
                          </p>
                        </div>
                      )}
                      {gatepass.checked_in_at && (
                        <div className="text-center">
                          <p className="text-xs font-semibold text-gray-700">IN</p>
                          <p className="text-xs font-medium text-green-600">
                            {formatGatepassTime(gatepass.checked_in_at)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(gatepass.status)}
                      {gatepass.status === 'approved' && (
                        <Button 
                          onClick={() => handleOut(gatepass.id)}
                          disabled={updateGatepassMutation.isPending}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-semibold"
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          {updateGatepassMutation.isPending ? 'Saving...' : 'Out'}
                        </Button>
                      )}
                      {gatepass.status === 'active' && !isPermanentOutGatepass(gatepass) && (
                        <Button 
                          onClick={() => handleIn(gatepass.id)}
                          disabled={updateGatepassMutation.isPending}
                          size="sm"
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-semibold"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {updateGatepassMutation.isPending ? 'Saving...' : 'In'}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelectedGatepass(gatepass)}
                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
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

  const renderGatepasses = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">All Gatepasses</h2>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Input
            placeholder="Search gatepasses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 border-2 focus:border-orange-300 text-sm"
          />
          <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading gatepasses...</p>
        </div>
      ) : (
        <GatepassList
          gatepasses={filteredGatepasses}
          onViewDetails={setSelectedGatepass}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'gatepasses':
        return renderGatepasses();
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
