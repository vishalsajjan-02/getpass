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
      department?: string;
      employee_id?: string;
    }) => api.post<Profile>('/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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
      role?: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
      department?: string;
      employee_id?: string;
    }) => api.put<Profile>(`/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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
      department?: string;
      employee_id?: string;
    }) => api.put<Profile>(`/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
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
