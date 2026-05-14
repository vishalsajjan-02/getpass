import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export type GatepassStatus =
  | 'pending'
  | 'pending_manager_approval'
  | 'pending_admin_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'active'
  | 'completed';

export type ApprovalFlow = 'admin_only' | 'manager_then_admin';

export interface GatepassApprovalRequest {
  id: string;
  gatepass_id: string;
  approver_user_id: string;
  approver_role: 'admin' | 'manager';
  step: 1 | 2;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  remarks?: string;
  acted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Gatepass {
  id: string;
  gatepass_id: string;
  user_id: string;
  reason_id: string;
  reason_name: string;
  display_reason: string;
  reason_description?: string;
  destination?: string;
  date: string;
  status: GatepassStatus;
  approval_flow: ApprovalFlow;
  rejection_reason?: string;
  is_emergency?: boolean;
  checked_out_at?: string;
  checked_out_by?: string;
  checked_in_at?: string;
  checked_in_by?: string;
  total_minutes_outside: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    email: string;
    department?: string;
    manager_id?: string;
  } | null;
  approval_requests: GatepassApprovalRequest[];
}

export const useGatepasses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gatepasses', user?.id, user?.role],
    queryFn: () => api.get<Gatepass[]>('/gatepasses'),
    enabled: !!user,
  });
};

export const useCreateGatepass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      reason_id?: string;
      reason_name?: string;
      reason_description?: string;
      destination?: string;
      date?: string;
      is_emergency?: boolean;
    }) => api.post<Gatepass>('/gatepasses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['gatepass-stats'] });
    },
  });
};

export const useUpdateGatepassStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      status: GatepassStatus;
      rejection_reason?: string;
      remarks?: string;
    }) => {
      const { id, ...body } = data;
      return api.put<Gatepass>(`/gatepasses/${id}/status`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['gatepass-stats'] });
    },
  });
};

export const useSearchGatepasses = (searchTerm: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gatepasses-search', searchTerm, user?.id, user?.role],
    queryFn: () =>
      api.get<Gatepass[]>(`/gatepasses/search?q=${encodeURIComponent(searchTerm)}`),
    enabled: !!user && searchTerm.length > 0,
  });
};

export const useTodaysGatepasses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['todays-gatepasses', user?.id, user?.role],
    queryFn: () => api.get<Gatepass[]>('/gatepasses/today'),
    enabled: !!user,
  });
};
