import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export type UserInOutTimeRole = 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';

export interface UserInOutTimeReportRow {
  user_id: string;
  user_name: string;
  email: string;
  role: UserInOutTimeRole;
  department?: string;
  date: string;
  entry_id?: string;
  in_time?: string;
  out_time?: string;
  updated_at?: string;
}

export interface UserInOutTimeEntry {
  id: string;
  user_id: string;
  date: string;
  in_time?: string;
  out_time?: string;
  created_at: string;
  updated_at: string;
}

const REPORT_KEY = 'user-in-out-time';

/**
 * Daily report of all users with their in/out times for the given date
 * (defaults to today on the server). Polls every 30s so the gatekeeper
 * always sees the freshest data without manual refresh.
 */
export const useUserInOutTimeDailyReport = (date?: string) => {
  return useQuery({
    queryKey: [REPORT_KEY, 'daily', date ?? 'today'],
    queryFn: () =>
      api.get<UserInOutTimeReportRow[]>(
        `/user-in-out-time${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      ),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
};

export const useCheckInUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<UserInOutTimeEntry>('/user-in-out-time/check-in', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORT_KEY] });
    },
  });
};

export const useCheckOutUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<UserInOutTimeEntry>('/user-in-out-time/check-out', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORT_KEY] });
    },
  });
};
