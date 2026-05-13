import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useMockAuth } from '@/contexts/MockAuthContext';

const EmployeeProfile = () => {
  const { user } = useMockAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 rounded-xl px-5 py-4 text-white shadow-xl">
        <h2 className="text-2xl md:text-3xl font-bold">Employee Profile</h2>
        <p className="text-white/90 text-sm md:text-base leading-tight">Manage your personal information and settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Card */}
        <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <User className="w-5 h-5 text-orange-500" />
              <span>Profile Picture</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white text-2xl">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card className="lg:col-span-2 shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <User className="w-5 h-5 text-orange-500" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={user?.name || 'Not provided'}
                  disabled
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  value={user?.email || 'Not provided'}
                  disabled
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-id" className="text-gray-700 font-medium">Employee ID</Label>
                <Input
                  id="employee-id"
                  value={user?.employee_id || 'Not assigned'}
                  disabled
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-gray-700 font-medium">Department</Label>
                <Input
                  id="department"
                  value={user?.department || 'Not assigned'}
                  disabled
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">Role</Label>
                <Input
                  id="role"
                  value={user?.role || 'Employee'}
                  disabled
                  className="bg-gray-50 border-gray-200 capitalize"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                To update your personal information, please contact HR department.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeProfile;
