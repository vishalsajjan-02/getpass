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
  day_status?: 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday';
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

export type AttendanceState = 'absent' | 'present' | 'left';

export interface UserAttendance {
  date: string;
  state: AttendanceState;
  in_time?: string;
  out_time?: string;
}

const REPORT_KEY = 'user-in-out-time';

/**
 * Daily report of all users with their in/out times for the given date
 * (defaults to today on the server). Polls every 30s so the gatekeeper
 * always sees the freshest data without manual refresh.
 */
export const useUserInOutTimeDailyReport = (date?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [REPORT_KEY, 'daily', date ?? 'today'],
    queryFn: () =>
      api.get<UserInOutTimeReportRow[]>(
        `/user-in-out-time${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      ),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled !== false,
  });
};

export const useMyAttendance = (date?: string) => {
  return useQuery({
    queryKey: [REPORT_KEY, 'me', date ?? 'today'],
    queryFn: () =>
      api.get<UserAttendance>(
        `/user-in-out-time/me${date ? `?date=${encodeURIComponent(date)}` : ''}`,
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

export const useSetDayAttendanceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      user_id: string;
      date: string;
      status: 'present' | 'absent';
    }) =>
      api.put<{
        user_id: string;
        date: string;
        status: 'present' | 'absent';
        leave_balance: number;
      }>('/user-in-out-time/day-status', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REPORT_KEY] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
};

export interface UserDayGatepassSummary {
  id: string;
  reason_name: string;
  display_reason: string;
  status: string;
  gatepass_type: string;
  checked_out_at?: string;
  checked_in_at?: string;
  total_minutes_outside: number;
}

export interface UserDayAttendance {
  date: string;
  in_time?: string;
  out_time?: string;
  in_location?: string;
  out_location?: string;
  in_latitude?: number;
  in_longitude?: number;
  out_latitude?: number;
  out_longitude?: number;
  in_via?: 'self' | 'gatekeeper';
  out_via?: 'self' | 'gatekeeper';
  in_photo_path?: string;
  out_photo_path?: string;
  in_photo_url?: string;
  out_photo_url?: string;
  day_status: 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday' | 'leave';
  leave_type_id?: string;
  leave_type_name?: string;
  gatepasses?: UserDayGatepassSummary[];
}

export interface UsedLeaveEntry {
  date: string;
  leave_type_id: string;
  leave_type_name: string;
  days: number;
}

export interface UserMonthAttendanceResult {
  days: UserDayAttendance[];
  leave_balance: number;
  leave_used: number;
  used_leaves: UsedLeaveEntry[];
}

export const useUserMonthAttendance = (
  userId: string | null | undefined,
  month: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [REPORT_KEY, 'user-month', userId, month],
    queryFn: () =>
      api.get<UserMonthAttendanceResult>(
        `/user-in-out-time/users/${userId}?month=${encodeURIComponent(month)}`,
      ),
    enabled: Boolean(userId) && Boolean(month) && options?.enabled !== false,
  });
};

export interface AttendanceReportRow {
  user_id: string;
  user_name: string;
  email: string;
  role: UserInOutTimeRole;
  department?: string;
  date: string;
  in_time?: string;
  out_time?: string;
  total_working_hr?: number;
  ot?: number;
  day_status: 'absent' | 'present' | 'pending' | 'weekly_off' | 'holiday' | 'leave';
  leave_type_id?: string;
  leave_type_name?: string;
}

export const useAttendanceReport = (params: {
  mode: 'day' | 'month';
  date?: string;
  month?: string;
  enabled?: boolean;
}) => {
  const query = params.mode === 'day'
    ? `date=${encodeURIComponent(params.date ?? '')}`
    : `month=${encodeURIComponent(params.month ?? '')}`;

  return useQuery({
    queryKey: [REPORT_KEY, 'attendance', params.mode, params.date ?? params.month],
    queryFn: () => api.get<AttendanceReportRow[]>(`/user-in-out-time/attendance?${query}`),
    enabled: params.enabled !== false && (params.mode === 'day' ? Boolean(params.date) : Boolean(params.month)),
  });
};
