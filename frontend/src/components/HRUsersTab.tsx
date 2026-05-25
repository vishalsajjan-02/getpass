
import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Users, Shield, UserCheck, Search, Eye, EyeOff, Download, Upload } from 'lucide-react';
import { useProfiles, type Profile } from '@/hooks/useProfiles';
import { useUserRoles, useManagers, useDepartments } from '@/hooks/useLookupData';
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUserManagement';
import { exportUsersCsv } from '@/lib/users-csv';
import BulkImportUsersDialog from '@/components/BulkImportUsersDialog';
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
          size="sm"
          className={
            className ||
            'h-9 shrink-0 bg-orange-500 px-3 text-white hover:bg-orange-600'
          }
        >
          <Plus className="mr-2 h-4 w-4" />
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

const USER_TABLE_COLGROUP = (
  <colgroup>
    <col className="w-[18%]" />
    <col className="w-[22%]" />
    <col className="w-[12%]" />
    <col className="w-[16%]" />
    <col className="w-[16%]" />
    <col className="w-[16%]" />
  </colgroup>
);

export type UserRoleFilter = 'all' | Profile['role'];

export const filterUserProfiles = (
  profiles: Profile[],
  searchTerm: string,
  roleFilter: UserRoleFilter,
) => {
  let list = profiles;

  if (roleFilter !== 'all') {
    list = list.filter((profile) => profile.role === roleFilter);
  }

  const search = searchTerm.trim().toLowerCase();
  if (!search) return list;

  return list.filter((profile) =>
    profile.name?.toLowerCase().includes(search)
    || profile.email?.toLowerCase().includes(search)
    || profile.role?.toLowerCase().includes(search)
    || profile.department?.toLowerCase().includes(search),
  );
};

export const UsersToolbar = ({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: UserRoleFilter;
  onRoleFilterChange: (value: UserRoleFilter) => void;
}) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { data: profiles = [] } = useProfiles();
  const { data: roles = fallbackRoles.map((name, i) => ({ name, role_id: i + 1 })) } = useUserRoles();

  const filteredProfiles = useMemo(
    () => filterUserProfiles(profiles, searchTerm, roleFilter),
    [profiles, searchTerm, roleFilter],
  );

  const resolveManagerName = (managerId?: string) => {
    if (!managerId) return 'N/A';
    return profiles.find((profile) => profile.id === managerId)?.name ?? 'N/A';
  };

  const handleExport = () => {
    if (filteredProfiles.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'No users match the current search.',
        variant: 'destructive',
      });
      return;
    }

    exportUsersCsv(filteredProfiles, resolveManagerName);
    toast({
      title: 'Users exported',
      description: `${filteredProfiles.length} user(s) downloaded as CSV.`,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white/80 px-3 py-1 shadow-sm">
      <h3 className="shrink-0 text-base font-semibold leading-none text-gray-900">
        All Users ({filteredProfiles.length})
      </h3>
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search users..."
          className="h-9 border-gray-200 bg-white pl-9 text-sm shadow-sm focus-visible:ring-orange-400"
          aria-label="Search users"
        />
      </div>
      <Select
        value={roleFilter}
        onValueChange={(value) => onRoleFilterChange(value as UserRoleFilter)}
      >
        <SelectTrigger className="h-9 w-[150px] shrink-0 border-gray-200 bg-white text-sm shadow-sm">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.role_id} value={role.name}>
              {formatRoleLabel(role.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => setImportDialogOpen(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 bg-green-600 hover:bg-green-700"
          onClick={handleExport}
          disabled={filteredProfiles.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <CreateUserDialogButton />
      </div>

      <BulkImportUsersDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
};

type HRUsersTabProps = {
  searchTerm: string;
  roleFilter: UserRoleFilter;
};

const HRUsersTab = ({ searchTerm, roleFilter }: HRUsersTabProps) => {
  const [editingUser, setEditingUser] = useState(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const { data: profiles = [], isLoading } = useProfiles();
  const { data: roles = fallbackRoles.map((name, i) => ({ name, role_id: i + 1 })) } = useUserRoles();
  const { data: managers = [] } = useManagers();
  const { data: departments = [] } = useDepartments();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const filteredProfiles = useMemo(
    () => filterUserProfiles(profiles, searchTerm, roleFilter),
    [profiles, searchTerm, roleFilter],
  );

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
    <div>
      <Card className="border-0 shadow-lg bg-white/95">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center">Loading users...</div>
          ) : sortedProfiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No users found for the current search.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto rounded-xl scrollbar-hidden">
              <table className="w-full table-fixed border-collapse text-sm">
                {USER_TABLE_COLGROUP}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-orange-400 to-orange-500">
                    <th className="h-11 px-4 text-left align-middle font-medium text-white">Name</th>
                    <th className="h-11 px-4 text-left align-middle font-medium text-white">Email</th>
                    <th className="h-11 px-4 text-left align-middle font-medium text-white">Role</th>
                    <th className="h-11 px-4 text-left align-middle font-medium text-white">Department</th>
                    <th className="h-11 px-4 text-left align-middle font-medium text-white">Manager</th>
                    <th className="h-11 px-4 text-left align-middle font-medium text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProfiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-gray-100 transition-colors hover:bg-muted/50">
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(profile.role)}
                          <span className="font-medium">{profile.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">{profile.email}</td>
                      <td className="px-4 py-4 align-middle">{getRoleBadge(profile.role)}</td>
                      <td className="px-4 py-4 align-middle">{profile.department || 'N/A'}</td>
                      <td className="px-4 py-4 align-middle">
                        {profile.role === 'employee' ? getManagerName(profile.manager_id) : '—'}
                      </td>
                      <td className="px-4 py-4 align-middle">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
