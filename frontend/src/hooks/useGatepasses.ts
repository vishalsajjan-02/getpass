import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export interface Gatepass {
  id: string;
  gatepass_id: string;
  user_id: string;
  purpose: string;
  destination?: string;
  date: string;
  expected_return_time?: string;
  actual_return_time?: string;
  out_time?: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  is_emergency?: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    email: string;
    department?: string;
    employee_id?: string;
  } | null;
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
      purpose: string;
      destination?: string;
      date?: string;
      expected_return_time?: string;
      out_time?: string;
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
      status: string;
      approved_by?: string;
      rejection_reason?: string;
      out_time?: string;
      actual_return_time?: string;
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
