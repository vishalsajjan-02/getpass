import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import GatepassDetailsModal from '../components/GatepassDetailsModal';
import GatepassCard from '../components/GatepassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, QrCode, Eye, RefreshCw, Search, CheckCircle, Clock, Users, AlertTriangle, LogOut, Menu } from 'lucide-react';
import { useGatepasses, useUpdateGatepassStatus } from '../hooks/useGatepasses';
import { useMockAuth } from '../contexts/MockAuthContext';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { user } = useMockAuth();
  const { data: gatepasses = [], isLoading } = useGatepasses();
  const updateGatepassMutation = useUpdateGatepassStatus();
  const isMobile = useIsMobile();

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <Shield className="w-5 h-5" /> },
    { id: 'gatepasses', label: 'Gate Passes', icon: <QrCode className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <AlertTriangle className="w-5 h-5" /> }
  ];

  // Filter gatepasses based on search term
  const filteredGatepasses = gatepasses.filter(gatepass => 
    gatepass.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gatepass.gatepass_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gatepass.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300">Approved - Ready to Exit</Badge>;
      case 'pending':
        return <Badge className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-300">Rejected</Badge>;
      case 'active':
        return <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300">Active (Out)</Badge>;
      case 'completed':
        return <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCheckOut = async (gatepassId: string) => {
    try {
      const currentTime = new Date().toTimeString().slice(0, 5);
      await updateGatepassMutation.mutateAsync({
        id: gatepassId,
        status: 'active',
        out_time: currentTime
      });
      toast({
        title: "Success",
        description: `Employee checked out at ${currentTime}`,
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

  const handleCheckIn = async (gatepassId: string) => {
    try {
      const currentTime = new Date().toTimeString().slice(0, 5);
      await updateGatepassMutation.mutateAsync({
        id: gatepassId,
        status: 'completed',
        actual_return_time: currentTime
      });
      toast({
        title: "Success",
        description: `Employee checked in at ${currentTime}`,
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
    todaysPasses: gatepasses.filter(g => g.date === new Date().toISOString().split('T')[0]).length,
    activeNow: gatepasses.filter(g => g.status === 'active').length,
    checkedIn: gatepasses.filter(g => g.status === 'completed').length,
    pendingReturn: gatepasses.filter(g => g.status === 'active' && new Date(`${g.date}T${g.expected_return_time}`) < new Date()).length,
  };

  const renderOverview = () => (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 rounded-xl px-5 py-4 text-white shadow-xl">
        <h2 className="text-2xl md:text-3xl font-bold">Security Dashboard</h2>
        <p className="text-white/90 text-sm md:text-base leading-tight">Monitor and validate employee gatepasses at entry/exit points</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <MetricCard
          title="Today's Passes"
          value={stats.todaysPasses.toString()}
          subtitle="+3 from yesterday"
          icon={<QrCode className="w-4 h-4 md:w-6 md:h-6" />}
          color="blue"
        />
        <MetricCard
          title="Active Now"
          value={stats.activeNow.toString()}
          subtitle="Currently outside"
          icon={<Clock className="w-4 h-4 md:w-6 md:h-6" />}
          color="orange"
        />
        <MetricCard
          title="Checked In"
          value={stats.checkedIn.toString()}
          subtitle="Completed today"
          icon={<CheckCircle className="w-4 h-4 md:w-6 md:h-6" />}
          color="green"
        />
        <MetricCard
          title="Pending Return"
          value={stats.pendingReturn.toString()}
          subtitle="Overdue"
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
                      <p className="text-xs md:text-sm text-gray-500 truncate">{gatepass.profiles?.employee_id} • {gatepass.profiles?.department}</p>
                      <p className="text-xs md:text-sm text-gray-600 truncate">{gatepass.purpose}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6 w-full lg:w-auto">
                    <div className="flex space-x-4">
                      {gatepass.out_time && (
                        <div className="text-center">
                          <p className="text-xs font-semibold text-gray-700">OUT TIME</p>
                          <p className="text-xs font-medium text-blue-600">{gatepass.out_time}</p>
                        </div>
                      )}
                      {gatepass.actual_return_time && (
                        <div className="text-center">
                          <p className="text-xs font-semibold text-gray-700">IN TIME</p>
                          <p className="text-xs font-medium text-green-600">{gatepass.actual_return_time}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(gatepass.status)}
                      {gatepass.status === 'approved' && (
                        <Button 
                          onClick={() => handleCheckOut(gatepass.id)}
                          disabled={updateGatepassMutation.isPending}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-semibold"
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          {updateGatepassMutation.isPending ? 'Checking Out...' : 'Check Out'}
                        </Button>
                      )}
                      {gatepass.status === 'active' && (
                        <Button 
                          onClick={() => handleCheckIn(gatepass.id)}
                          disabled={updateGatepassMutation.isPending}
                          size="sm"
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-semibold"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {updateGatepassMutation.isPending ? 'Checking In...' : 'Check In'}
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
        <div className="grid gap-4">
          {filteredGatepasses.map((gatepass) => (
            <GatepassCard
              key={gatepass.id}
              gatepass={gatepass}
              onViewDetails={setSelectedGatepass}
              getStatusBadge={getStatusBadge}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'gatepasses':
        return renderGatepasses();
      case 'notifications':
        return (
          <div className="text-center p-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications at this time</p>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-orange-50 to-rose-50 flex">
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 bg-orange-600 hover:bg-orange-700 shadow-lg"
          size="sm"
        >
          <Menu className="w-4 h-4" />
        </Button>
      )}

      {/* Sidebar */}
      <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative'} ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'} transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (isMobile) setSidebarOpen(false);
          }}
          menuItems={menuItems}
          colorScheme="orange"
        />
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 min-w-0 min-h-0 p-4 md:p-8 overflow-hidden ${isMobile ? 'ml-0' : ''}`}>
        <div className={`h-full overflow-y-auto scrollbar-hidden ${isMobile ? 'mt-16' : ''}`}>
          {renderContent()}
        </div>
      </main>

      <GatepassDetailsModal
        gatepass={selectedGatepass}
        isOpen={!!selectedGatepass}
        onClose={() => setSelectedGatepass(null)}
        userRole="gatekeeper"
      />
    </div>
  );
};

export default SecurityDashboard;
