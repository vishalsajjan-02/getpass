import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export type EmployeeLunchStatus = 'On Lunch' | 'In Office' | 'Outside Office';

export interface LunchEntryReport {
  gatepass_id: string;
  date: string;
  checked_out_at?: string;
  checked_in_at?: string;
  lunch_duration_minutes: number;
  extra_lunch_minutes: number;
}

export interface LunchEmployeeSummary {
  user_id: string;
  employee_name: string;
  department?: string;
  checked_out_at?: string;
  checked_in_at?: string;
  current_status: EmployeeLunchStatus;
  total_lunch_duration_minutes: number;
  total_extra_lunch_minutes: number;
  violation_count: number;
  entries: LunchEntryReport[];
}

export interface DailyLunchReport {
  date: string;
  allowed_lunch_minutes: number;
  employees: LunchEmployeeSummary[];
  total_violations: number;
}

export interface MonthlyLunchReport {
  month: string;
  allowed_lunch_minutes: number;
  employees: LunchEmployeeSummary[];
  total_violations: number;
  top_employees: LunchEmployeeSummary[];
}

export interface YearlyLunchMonthSummary {
  month: string;
  total_extra_lunch_minutes: number;
  violation_count: number;
}

export interface YearlyLunchReport {
  year: number;
  allowed_lunch_minutes: number;
  employees: LunchEmployeeSummary[];
  months: YearlyLunchMonthSummary[];
  total_violations: number;
  top_employees: LunchEmployeeSummary[];
}

export interface LiveEmployeeStatusReport {
  user_id: string;
  employee_name: string;
  department?: string;
  current_status: EmployeeLunchStatus;
  active_reason_name?: string;
  checked_out_at?: string;
  checked_in_at?: string;
  lunch_duration_minutes: number;
  extra_lunch_minutes: number;
}

const buildEmployeeQuery = (employeeId?: string): string =>
  employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : '';

export const useDailyLunchReport = (date: string, employeeId?: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lunch-daily-report', date, employeeId, user?.id],
    queryFn: () => api.get<DailyLunchReport>(`/gatepasses/analytics/lunch/daily?date=${encodeURIComponent(date)}${buildEmployeeQuery(employeeId)}`),
    enabled: enabled && !!user,
  });
};

export const useMonthlyLunchReport = (month: string, employeeId?: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lunch-monthly-report', month, employeeId, user?.id],
    queryFn: () => api.get<MonthlyLunchReport>(`/gatepasses/analytics/lunch/monthly?month=${encodeURIComponent(month)}${buildEmployeeQuery(employeeId)}`),
    enabled: enabled && !!user,
  });
};

export const useYearlyLunchReport = (year: string, employeeId?: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lunch-yearly-report', year, employeeId, user?.id],
    queryFn: () => api.get<YearlyLunchReport>(`/gatepasses/analytics/lunch/yearly?year=${encodeURIComponent(year)}${buildEmployeeQuery(employeeId)}`),
    enabled: enabled && !!user,
  });
};

export const useLiveEmployeeStatuses = (employeeId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['live-employee-status', employeeId, user?.id],
    queryFn: () => api.get<LiveEmployeeStatusReport[]>(`/gatepasses/analytics/lunch/live-status?${employeeId ? `employeeId=${encodeURIComponent(employeeId)}` : ''}`),
    enabled: !!user,
  });
};
