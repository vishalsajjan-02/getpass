
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, TrendingUp, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useGatepasses } from '@/hooks/useGatepasses';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from '@/hooks/use-toast';

const HRAnalyticsTab = () => {
  const { data: gatepasses = [] } = useGatepasses();
  const { data: profiles = [] } = useProfiles();

  // Process data for analytics
  const statusData = [
    { name: 'Pending', value: gatepasses.filter(g => g.status === 'pending').length, color: '#f59e0b' },
    { name: 'Approved', value: gatepasses.filter(g => g.status === 'approved').length, color: '#10b981' },
    { name: 'Rejected', value: gatepasses.filter(g => g.status === 'rejected').length, color: '#ef4444' },
    { name: 'Active', value: gatepasses.filter(g => g.status === 'active').length, color: '#3b82f6' },
    { name: 'Completed', value: gatepasses.filter(g => g.status === 'completed').length, color: '#6b7280' },
  ];

  const departmentData = profiles.reduce((acc, profile) => {
    const dept = profile.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const departmentChartData = Object.entries(departmentData).map(([name, value]) => ({ name, value }));

  const roleData = profiles.reduce((acc, profile) => {
    acc[profile.role] = (acc[profile.role] || 0) + 1;
    return acc;
  }, {});

  const roleChartData = Object.entries(roleData).map(([name, value]) => ({ name, value }));

  // Weekly trends (mock data for demonstration)
  const weeklyTrends = [
    { day: 'Mon', requests: 12, approved: 8, rejected: 2 },
    { day: 'Tue', requests: 15, approved: 11, rejected: 1 },
    { day: 'Wed', requests: 8, approved: 6, rejected: 1 },
    { day: 'Thu', requests: 18, approved: 14, rejected: 2 },
    { day: 'Fri', requests: 22, approved: 18, rejected: 1 },
    { day: 'Sat', requests: 5, approved: 4, rejected: 0 },
    { day: 'Sun', requests: 3, approved: 3, rejected: 0 },
  ];

  const exportData = () => {
    const exportGatepasses = gatepasses.map(gatepass => ({
      'Gatepass ID': gatepass.gatepass_id,
      'Employee Name': gatepass.profiles?.name || 'Unknown',
      'Purpose': gatepass.purpose,
      'Destination': gatepass.destination || 'N/A',
      'Date': gatepass.date,
      'Status': gatepass.status,
      'Created At': new Date(gatepass.created_at).toLocaleString(),
      'Approved By': gatepass.approved_by || 'N/A',
      'Rejection Reason': gatepass.rejection_reason || 'N/A',
    }));

    const csv = [
      Object.keys(exportGatepasses[0] || {}).join(','),
      ...exportGatepasses.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gatepass-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Gatepass data has been exported to CSV",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Button onClick={exportData} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{profiles.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{gatepasses.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gatepasses.length > 0 
                    ? `${Math.round((gatepasses.filter(g => g.status === 'approved').length / gatepasses.length) * 100)}%`
                    : '0%'
                  }
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gatepasses.filter(g => g.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gatepass Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Request Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gatepasses.slice(0, 10).map((gatepass) => (
              <div key={gatepass.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">
                      {gatepass.profiles?.name || 'Unknown User'} - {gatepass.purpose}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(gatepass.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge 
                  className={
                    gatepass.status === 'approved' ? 'bg-green-100 text-green-700' :
                    gatepass.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    gatepass.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }
                >
                  {gatepass.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRAnalyticsTab;
