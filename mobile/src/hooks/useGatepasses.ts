import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Gatepass, GatepassReason, GatepassStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useGatepasses = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gatepasses', user?.id, user?.role],
    queryFn: () => api.get<Gatepass[]>('/gatepasses'),
    enabled: !!user,
  });
};

export const useGatepassReasons = () =>
  useQuery({
    queryKey: ['gatepass-reasons'],
    queryFn: () => api.get<GatepassReason[]>('/gatepasses/reasons'),
  });

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
      approval_step?: 1 | 2;
    }) => {
      const { id, ...body } = data;
      return api.put<Gatepass>(`/gatepasses/${id}/status`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
    },
  });
};

export const useDeleteGatepass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/gatepasses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gatepasses'] }),
  });
};
