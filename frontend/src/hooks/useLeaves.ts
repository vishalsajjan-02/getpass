import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface LeaveType {
  id: string;
  name: string;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserDayLeaveResult {
  user_id: string;
  date: string;
  leave_type_id?: string;
  leave_type_name?: string;
  leave_balance: number;
}

export type LeaveTypeInput = {
  name: string;
  is_paid?: boolean;
  sort_order?: number;
};

const LEAVE_KEY = 'leaves';

export const useLeaveTypes = (options?: { enabled?: boolean; includeInactive?: boolean }) => {
  const includeInactive = Boolean(options?.includeInactive);
  return useQuery({
    queryKey: [LEAVE_KEY, 'types', includeInactive ? 'all' : 'active'],
    queryFn: () =>
      api.get<LeaveType[]>(
        includeInactive ? '/leaves/types?include_inactive=true' : '/leaves/types',
      ),
    enabled: options?.enabled !== false,
  });
};

export const useCreateLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeaveTypeInput) => api.post<LeaveType>('/leaves/types', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_KEY] });
    },
  });
};

export const useUpdateLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: LeaveTypeInput & { id: string; is_active?: boolean }) =>
      api.put<LeaveType>(`/leaves/types/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_KEY] });
    },
  });
};

export const useDeleteLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/leaves/types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEAVE_KEY] });
    },
  });
};

export const useUpsertUserDayLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: string; date: string; leave_type_id: string | null }) =>
      api.put<UserDayLeaveResult>('/leaves/day', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
      queryClient.invalidateQueries({ queryKey: [LEAVE_KEY] });
    },
  });
};

export const useUpdateLeaveBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: string; leave_balance: number }) =>
      api.put<{ user_id: string; leave_balance: number }>('/leaves/balance', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
    },
  });
};
