import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarDays, ListChecks, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  useCompanyHolidays,
  useCreateCompanyHoliday,
  useDeleteCompanyHoliday,
  useUpdateCompanyHoliday,
  type CompanyHoliday,
} from '@/hooks/useCompanyHolidays';
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
  type LeaveType,
} from '@/hooks/useLeaves';
import { useProfiles, type Profile } from '@/hooks/useProfiles';
import { api } from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type SettingsSection = 'company_holidays' | 'leave_type' | 'user_permission';

type HolidayForm = {
  name: string;
  description: string;
  holiday_date: string;
  is_fixed: boolean;
  is_paid: boolean;
  sort_order: string;
};

type LeaveForm = {
  name: string;
  is_paid: boolean;
  sort_order: string;
};

const emptyHolidayForm = (): HolidayForm => ({
  name: '',
  description: '',
  holiday_date: '',
  is_fixed: false,
  is_paid: true,
  sort_order: '0',
});

const emptyLeaveForm = (): LeaveForm => ({
  name: '',
  is_paid: true,
  sort_order: '0',
});

const formatDisplayDate = (value: string): string => {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const HRSettingsTab: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [section, setSection] = useState<SettingsSection>('company_holidays');
  const [holidayYear, setHolidayYear] = useState(String(currentYear));

  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHoliday | null>(null);
  const [holidayForm, setHolidayForm] = useState<HolidayForm>(emptyHolidayForm);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveType | null>(null);
  const [leaveForm, setLeaveForm] = useState<LeaveForm>(emptyLeaveForm);
  const [permissionSearch, setPermissionSearch] = useState('');

  const yearNumber = Number(holidayYear);
  const selectedYear = Number.isFinite(yearNumber) && yearNumber >= 2000 ? yearNumber : currentYear;
  const { data: holidays = [], isLoading: holidaysLoading } = useCompanyHolidays(selectedYear);
  const { data: leaveTypes = [], isLoading: leaveLoading } = useLeaveTypes({ includeInactive: true });
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();
  const queryClient = useQueryClient();

  const createHoliday = useCreateCompanyHoliday();
  const updateHoliday = useUpdateCompanyHoliday();
  const deleteHoliday = useDeleteCompanyHoliday();
  const createLeave = useCreateLeaveType();
  const updateLeave = useUpdateLeaveType();
  const deleteLeave = useDeleteLeaveType();

  const setPunchPermission = useMutation({
    mutationFn: ({ id, can_self_punch }: { id: string; can_self_punch: boolean }) =>
      api.put<Profile>(`/users/${id}/punch-permission`, { can_self_punch }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear + 1, currentYear - 1]);
    holidays.forEach((row) => years.add(row.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, holidays]);

  const openCreateHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({
      ...emptyHolidayForm(),
      holiday_date: `${holidayYear}-01-01`,
    });
    setHolidayDialogOpen(true);
  };

  const openEditHoliday = (holiday: CompanyHoliday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      description: holiday.description,
      holiday_date: holiday.holiday_date,
      is_fixed: holiday.is_fixed,
      is_paid: holiday.is_paid,
      sort_order: String(holiday.sort_order),
    });
    setHolidayDialogOpen(true);
  };

  const openCreateLeave = () => {
    setEditingLeave(null);
    setLeaveForm(emptyLeaveForm());
    setLeaveDialogOpen(true);
  };

  const openEditLeave = (leave: LeaveType) => {
    setEditingLeave(leave);
    setLeaveForm({
      name: leave.name,
      is_paid: leave.is_paid,
      sort_order: String(leave.sort_order),
    });
    setLeaveDialogOpen(true);
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.holiday_date) {
      toast({
        title: 'Missing fields',
        description: 'Name and date are required.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: holidayForm.name.trim(),
      description: holidayForm.description.trim(),
      holiday_date: holidayForm.holiday_date,
      is_fixed: holidayForm.is_fixed,
      is_paid: holidayForm.is_paid,
      sort_order: Number(holidayForm.sort_order) || 0,
    };

    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({ id: editingHoliday.id, ...payload });
        toast({ title: 'Holiday updated' });
      } else {
        await createHoliday.mutateAsync(payload);
        toast({ title: 'Holiday added' });
      }
      setHolidayDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not save holiday',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteHoliday = async (holiday: CompanyHoliday) => {
    try {
      await deleteHoliday.mutateAsync(holiday.id);
      toast({ title: 'Holiday removed' });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not remove holiday',
        variant: 'destructive',
      });
    }
  };

  const handleSaveLeave = async () => {
    if (!leaveForm.name.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Leave type name is required.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: leaveForm.name.trim(),
      is_paid: leaveForm.is_paid,
      sort_order: Number(leaveForm.sort_order) || 0,
    };

    try {
      if (editingLeave) {
        await updateLeave.mutateAsync({ id: editingLeave.id, ...payload, is_active: true });
        toast({ title: 'Leave type updated' });
      } else {
        await createLeave.mutateAsync(payload);
        toast({ title: 'Leave type added' });
      }
      setLeaveDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not save leave type',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLeave = async (leave: LeaveType) => {
    try {
      await deleteLeave.mutateAsync(leave.id);
      toast({ title: 'Leave type deactivated' });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Could not remove leave type',
        variant: 'destructive',
      });
    }
  };

  const renderSectionSwitcher = () => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Button
        type="button"
        variant={section === 'company_holidays' ? 'default' : 'outline'}
        onClick={() => setSection('company_holidays')}
        className={cn(
          'h-11 w-full border text-sm font-semibold',
          section === 'company_holidays'
            ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-red-600'
            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50',
        )}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        Company Holidays
      </Button>
      <Button
        type="button"
        variant={section === 'leave_type' ? 'default' : 'outline'}
        onClick={() => setSection('leave_type')}
        className={cn(
          'h-11 w-full border text-sm font-semibold',
          section === 'leave_type'
            ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-red-600'
            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50',
        )}
      >
        <ListChecks className="mr-2 h-4 w-4" />
        Leave Types
      </Button>
      <Button
        type="button"
        variant={section === 'user_permission' ? 'default' : 'outline'}
        onClick={() => setSection('user_permission')}
        className={cn(
          'h-11 w-full border text-sm font-semibold',
          section === 'user_permission'
            ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-600 hover:to-red-600'
            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50',
        )}
      >
        <ShieldCheck className="mr-2 h-4 w-4" />
        User Permission
      </Button>
    </div>
  );

  const permissionUsers = useMemo(
    () => profiles.filter((u) => u.role === 'employee' || u.role === 'manager'),
    [profiles],
  );

  const filteredPermissionUsers = useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();
    if (!search) return permissionUsers;
    return permissionUsers.filter((user) =>
      [user.name, user.email, user.role, user.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [permissionUsers, permissionSearch]);

  const renderPermissions = () => (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Self Punch & Face Registration</CardTitle>
          <div className="relative w-full shrink-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search by name..."
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              className="h-9 w-full pl-9 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {profilesLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading users...</p>
        ) : permissionUsers.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No employees or managers found.</p>
        ) : filteredPermissionUsers.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Face</th>
                  <th className="px-4 py-3 text-right font-semibold">Self Punch</th>
                </tr>
              </thead>
              <tbody>
                {filteredPermissionUsers.map((user) => {
                  const allowed = Boolean(user.can_self_punch);
                  const busy =
                    setPunchPermission.isPending && setPunchPermission.variables?.id === user.id;
                  return (
                    <tr key={user.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 font-semibold text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{user.role}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.face_image_url ? (
                            <a
                              href={user.face_image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-9 w-9 overflow-hidden rounded-full border border-gray-200"
                            >
                              <img
                                src={user.face_image_url}
                                alt={`${user.name} face`}
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ) : (
                            <span className="text-xs text-rose-600">Not registered</span>
                          )}
                          <label className="cursor-pointer rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">
                            {user.has_face ? 'Replace' : 'Upload'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (!file) return;
                                try {
                                  const form = new FormData();
                                  form.append('face', file);
                                  await api.postForm(`/users/${user.id}/face`, form);
                                  await queryClient.invalidateQueries({ queryKey: ['profiles'] });
                                  toast({ title: 'Face registered' });
                                } catch (error) {
                                  toast({
                                    title: 'Face registration failed',
                                    description: (error as Error).message,
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Switch
                            checked={allowed}
                            disabled={busy}
                            onCheckedChange={(checked) => {
                              setPunchPermission.mutate(
                                { id: user.id, can_self_punch: checked },
                                {
                                  onSuccess: () =>
                                    toast({
                                      title: checked
                                        ? 'Self punch enabled'
                                        : 'Self punch disabled',
                                    }),
                                  onError: (error) =>
                                    toast({
                                      title: 'Error',
                                      description: (error as Error).message,
                                      variant: 'destructive',
                                    }),
                                },
                              );
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderHolidays = () => (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-lg">Company Holidays</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            className="h-9 w-28"
            value={holidayYear}
            onChange={(e) => setHolidayYear(e.target.value)}
            min={2000}
            max={2100}
            aria-label="Holiday year"
          />
          <Button type="button" size="sm" onClick={openCreateHoliday}>
            <Plus className="mr-1 h-4 w-4" />
            Add Holiday
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {holidaysLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading holidays...</p>
        ) : holidays.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No company holidays found for {holidayYear}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-orange-50 text-left text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 font-semibold">Flags</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="border-t border-gray-100 hover:bg-orange-50/60">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                      {formatDisplayDate(holiday.holiday_date)}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{holiday.name}</td>
                    <td className="max-w-xs px-3 py-2 text-gray-600">{holiday.description || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {holiday.is_paid ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                            Unpaid
                          </Badge>
                        )}
                        {holiday.is_fixed ? (
                          <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
                            Fixed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700">
                            Variable
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditHoliday(holiday)}
                          aria-label={`Edit ${holiday.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteHoliday(holiday)}
                          aria-label={`Delete ${holiday.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {yearOptions.length > 0 ? (
          <p className="mt-3 text-xs text-gray-500">Years with data: {yearOptions.join(', ')}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  const renderLeaveTypes = () => (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-lg">Leave Types</CardTitle>
        <Button type="button" size="sm" onClick={openCreateLeave}>
          <Plus className="mr-1 h-4 w-4" />
          Add Leave Type
        </Button>
      </CardHeader>
      <CardContent>
        {leaveLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading leave types...</p>
        ) : leaveTypes.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No leave types found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-orange-50 text-left text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Paid</th>
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.map((leave) => (
                  <tr key={leave.id} className="border-t border-gray-100 hover:bg-orange-50/60">
                    <td className="px-3 py-2 font-medium text-gray-900">{leave.name}</td>
                    <td className="px-3 py-2">
                      {leave.is_paid ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                          Unpaid
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{leave.sort_order}</td>
                    <td className="px-3 py-2">
                      {leave.is_active ? (
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-600">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditLeave(leave)}
                          aria-label={`Edit ${leave.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {leave.is_active ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteLeave(leave)}
                            aria-label={`Deactivate ${leave.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        ) : null}
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
  );

  return (
    <div className="space-y-4">
      {renderSectionSwitcher()}
      {section === 'company_holidays'
        ? renderHolidays()
        : section === 'leave_type'
          ? renderLeaveTypes()
          : renderPermissions()}

      <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={holidayForm.holiday_date}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, holiday_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-description">Description</Label>
              <Input
                id="holiday-description"
                value={holidayForm.description}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holiday-sort">Sort order</Label>
              <Input
                id="holiday-sort"
                type="number"
                value={holidayForm.sort_order}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <Label htmlFor="holiday-paid">Paid holiday</Label>
              <Switch
                id="holiday-paid"
                checked={holidayForm.is_paid}
                onCheckedChange={(checked) => setHolidayForm((prev) => ({ ...prev, is_paid: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <Label htmlFor="holiday-fixed">Fixed date</Label>
              <Switch
                id="holiday-fixed"
                checked={holidayForm.is_fixed}
                onCheckedChange={(checked) => setHolidayForm((prev) => ({ ...prev, is_fixed: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHolidayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveHoliday}
              disabled={createHoliday.isPending || updateHoliday.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLeave ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="leave-name">Name</Label>
              <Input
                id="leave-name"
                value={leaveForm.name}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-sort">Sort order</Label>
              <Input
                id="leave-sort"
                type="number"
                value={leaveForm.sort_order}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, sort_order: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
              <Label htmlFor="leave-paid">Paid leave</Label>
              <Switch
                id="leave-paid"
                checked={leaveForm.is_paid}
                onCheckedChange={(checked) => setLeaveForm((prev) => ({ ...prev, is_paid: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLeaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveLeave}
              disabled={createLeave.isPending || updateLeave.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRSettingsTab;
