
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Users, Shield, UserCheck, Search, Eye, EyeOff } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserRoles, useManagers, useDepartments } from '@/hooks/useLookupData';
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUserManagement';
import { toast } from '@/hooks/use-toast';

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
  department_id: string;
  manager_id: string;
};

const emptyUserForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: 'employee',
  department_id: '',
  manager_id: '',
};

const fallbackRoles: UserFormData['role'][] = ['admin', 'manager', 'gatekeeper', 'employee', 'guest'];
const formatRoleLabel = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

export const CreateUserDialogButton = ({ className = '' }: { className?: string }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<UserFormData>(emptyUserForm);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const createUserMutation = useCreateUser();
  const { data: roles = fallbackRoles.map((name, i) => ({ name, role_id: i + 1 })) } = useUserRoles();
  const { data: managers = [] } = useManagers();
  const { data: departments = [] } = useDepartments();

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        department_id: newUser.department_id || undefined,
        manager_id: newUser.role === 'employee' && newUser.manager_id ? newUser.manager_id : undefined,
      });
      setIsCreateModalOpen(false);
      setNewUser(emptyUserForm);
      toast({ title: 'User Created', description: 'New user has been created successfully' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogTrigger asChild>
        <Button
          className={
            className ||
            'h-12 rounded-xl bg-white px-5 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-50'
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showCreatePassword ? 'text' : 'password'}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter initial password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={newUser.role}
              onValueChange={(value) =>
                setNewUser({ ...newUser, role: value as UserFormData['role'], manager_id: '' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.role_id} value={role.name}>
                    {formatRoleLabel(role.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {newUser.role === 'employee' && (
            <div>
              <Label htmlFor="manager_id">Manager</Label>
              <Select
                value={newUser.manager_id}
                onValueChange={(value) => setNewUser({ ...newUser, manager_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="department_id">Department</Label>
            <Select
              value={newUser.department_id}
              onValueChange={(value) => setNewUser({ ...newUser, department_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.department_id} value={String(dept.department_id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateUser} className="w-full">
            Create User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const HRUsersTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const { data: profiles = [], isLoading } = useProfiles();
  const { data: roles = fallbackRoles.map((name, i) => ({ name, role_id: i + 1 })) } = useUserRoles();
  const { data: managers = [] } = useManagers();
  const { data: departments = [] } = useDepartments();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const filteredProfiles = profiles.filter((profile) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return (
      profile.name?.toLowerCase().includes(search) ||
      profile.email?.toLowerCase().includes(search) ||
      profile.role?.toLowerCase().includes(search) ||
      profile.department?.toLowerCase().includes(search)
    );
  });

  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    const roleOrder: Record<string, number> = { admin: 1, manager: 2, gatekeeper: 3, employee: 4, guest: 5 };
    return (roleOrder[a.role] ?? 6) - (roleOrder[b.role] ?? 6);
  });

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'N/A';
    return managers.find((m) => m.id === managerId)?.name ?? 'N/A';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':    return <Users className="w-4 h-4" />;
      case 'manager':  return <Users className="w-4 h-4" />;
      case 'gatekeeper': return <Shield className="w-4 h-4" />;
      default:         return <UserCheck className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':      return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Admin</Badge>;
      case 'manager':    return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Manager</Badge>;
      case 'gatekeeper': return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Gatekeeper</Badge>;
      case 'employee':   return <Badge className="bg-green-100 text-green-700 border-green-300">Employee</Badge>;
      case 'guest':      return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Guest</Badge>;
      default:           return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const handleUpdateUser = async () => {
    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        name: editingUser.name,
        email: editingUser.email,
        ...(editingUser.password ? { password: editingUser.password } : {}),
        role: editingUser.role,
        department_id: editingUser.department_id || undefined,
        manager_id:
          editingUser.role === 'employee' && editingUser.manager_id
            ? editingUser.manager_id
            : undefined,
      });
      setEditingUser(null);
      toast({ title: 'User Updated', description: 'User has been updated successfully' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUserMutation.mutateAsync(userId);
        toast({ title: 'User Deleted', description: 'User has been deleted successfully' });
      } catch {
        toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/95">
        <CardContent className="p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">All Users ({profiles.length})</h3>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="h-10 rounded-lg border-gray-200 bg-white pl-9"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : sortedProfiles.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
              No users found for the current search.
            </div>
          ) : (
            <Table className="overflow-hidden rounded-xl">
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="bg-gradient-to-r from-orange-400 to-orange-500 hover:bg-gradient-to-r hover:from-orange-400 hover:to-orange-500">
                  <TableHead className="h-11 px-4 text-white">Name</TableHead>
                  <TableHead className="h-11 px-4 text-white">Email</TableHead>
                  <TableHead className="h-11 px-4 text-white">Role</TableHead>
                  <TableHead className="h-11 px-4 text-white">Department</TableHead>
                  <TableHead className="h-11 px-4 text-white">Manager</TableHead>
                  <TableHead className="h-11 px-4 text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProfiles.map((profile) => (
                  <TableRow key={profile.id} className="border-b border-gray-100">
                    <TableCell className="flex items-center space-x-2 py-4">
                      {getRoleIcon(profile.role)}
                      <span className="font-medium">{profile.name}</span>
                    </TableCell>
                    <TableCell className="py-4">{profile.email}</TableCell>
                    <TableCell className="py-4">{getRoleBadge(profile.role)}</TableCell>
                    <TableCell className="py-4">{profile.department || 'N/A'}</TableCell>
                    <TableCell className="py-4">
                      {profile.role === 'employee' ? getManagerName(profile.manager_id) : '—'}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowEditPassword(false);
                            setEditingUser({ ...profile, department_id: profile.department_id ?? '', password: '' });
                          }}
                          className="h-8 w-8 rounded-lg p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(profile.id)}
                          className="h-8 w-8 rounded-lg p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => { setEditingUser(null); setShowEditPassword(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-password">New Password <span className="text-gray-400 text-xs font-normal">(leave blank to keep current)</span></Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value, manager_id: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.role_id} value={role.name}>
                        {formatRoleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingUser.role === 'employee' && (
                <div>
                  <Label htmlFor="edit-manager">Manager</Label>
                  <Select
                    value={editingUser.manager_id || ''}
                    onValueChange={(value) => setEditingUser({ ...editingUser, manager_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={editingUser.department_id || ''}
                  onValueChange={(value) => setEditingUser({ ...editingUser, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.department_id} value={String(dept.department_id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateUser} className="w-full">
                Update User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRUsersTab;
