
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit, Save, X } from 'lucide-react';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useUpdateProfile } from '@/hooks/useUserManagement';
import { toast } from '@/hooks/use-toast';

const HRProfileTab = () => {
  const { user } = useMockAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    employee_id: user?.employee_id || ''
  });

  const updateProfileMutation = useUpdateProfile();

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        id: user?.id,
        ...editData
      });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      department: user?.department || '',
      employee_id: user?.employee_id || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32">
              <AvatarFallback className="text-2xl">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile Information</CardTitle>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button onClick={handleSaveProfile} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handleCancelEdit} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded-md">{user?.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded-md">{user?.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <p className="mt-1 p-2 bg-gray-50 rounded-md capitalize">{user?.role}</p>
              </div>

              <div>
                <Label htmlFor="employee_id">Employee ID</Label>
                {isEditing ? (
                  <Input
                    id="employee_id"
                    value={editData.employee_id}
                    onChange={(e) => setEditData({ ...editData, employee_id: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded-md">{user?.employee_id || 'Not set'}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="department">Department</Label>
                {isEditing ? (
                  <Input
                    id="department"
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 p-2 bg-gray-50 rounded-md">{user?.department || 'Not set'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Account Created</Label>
              <p className="mt-1 p-2 bg-gray-50 rounded-md">
                {new Date().toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label>Last Login</Label>
              <p className="mt-1 p-2 bg-gray-50 rounded-md">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRProfileTab;
