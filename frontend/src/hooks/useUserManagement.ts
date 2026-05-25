import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Profile } from './useProfiles';

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: {
      name: string;
      email: string;
      password: string;
      role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
      department_id?: string;
      manager_id?: string;
    }) => api.post<Profile>('/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['managers'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: {
      id: string;
      name?: string;
      email?: string;
      password?: string;
      role?: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
      department_id?: string;
      manager_id?: string;
    }) => api.put<Profile>(`/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['managers'] });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: {
      id: string;
      name?: string;
      email?: string;
      department_id?: string;
    }) => api.put<Profile>(`/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};

export interface BulkImportUsersResult {
  created: number;
  failed: number;
  errors: Array<{ email: string; message: string }>;
}

export const useBulkImportUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (users: Array<{
      name: string;
      email: string;
      password: string;
      role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
      department?: string;
      manager_email?: string;
    }>) => api.post<BulkImportUsersResult>('/users/bulk-import', { users }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['managers'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => api.delete<void>(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};
