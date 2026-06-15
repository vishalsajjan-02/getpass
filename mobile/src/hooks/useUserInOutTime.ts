import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { UserInOutTimeReportRow } from '../types';

export const useDailyTimingReport = (date?: string) =>
  useQuery({
    queryKey: ['user-in-out-time', 'daily', date ?? 'today'],
    queryFn: () =>
      api.get<UserInOutTimeReportRow[]>(
        `/user-in-out-time${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      ),
    refetchInterval: 30_000,
  });

export const useCheckInUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post('/user-in-out-time/check-in', { user_id: userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] }),
  });
};

export const useCheckOutUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post('/user-in-out-time/check-out', { user_id: userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] }),
  });
};
