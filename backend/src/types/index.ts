export type UserRole = 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
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
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type EmployeeLiveStatus = 'On Lunch' | 'In Office' | 'Outside Office';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  role_id?: string;
  department?: string;
  department_id?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password: string;
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
  is_emergency: boolean;
  checked_out_at?: string;
  checked_out_by?: string;
  checked_in_at?: string;
  checked_in_by?: string;
  total_minutes_outside: number;
  created_at: string;
  updated_at: string;
}

export interface RoleOption {
  name: UserRole;
  role_id: string;
}

export interface DepartmentOption {
  name: string;
  department_id: string;
}

export interface GatepassReason {
  id: string;
  name: string;
}

export interface GatepassApprovalRequest {
  id: string;
  gatepass_id: string;
  approver_user_id: string;
  approver_role: 'admin' | 'manager';
  step: 1 | 2;
  status: ApprovalRequestStatus;
  remarks?: string;
  acted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GatepassWithProfile extends Gatepass {
  profiles?: {
    name: string;
    email: string;
    department?: string;
    manager_id?: string;
  };
  approval_requests: GatepassApprovalRequest[];
}

export interface GatepassStats {
  total: number;
  pending: number;
  pending_manager_approval: number;
  pending_admin_approval: number;
  approved: number;
  rejected: number;
  cancelled: number;
  active: number;
  completed: number;
}

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
  current_status: EmployeeLiveStatus;
  total_lunch_duration_minutes: number;
  total_extra_lunch_minutes: number;
  violation_count: number;
  entries: LunchEntryReport[];
}

export interface LiveEmployeeStatusReport {
  user_id: string;
  employee_name: string;
  department?: string;
  current_status: EmployeeLiveStatus;
  active_reason_name?: string;
  checked_out_at?: string;
  checked_in_at?: string;
  lunch_duration_minutes: number;
  extra_lunch_minutes: number;
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

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department_id?: string;
  manager_id?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  department_id?: string;
  manager_id?: string;
}

export interface CreateGatepassInput {
  reason_id?: string;
  reason_name?: string;
  reason_description?: string;
  destination?: string;
  date?: string;
  is_emergency?: boolean;
}

export interface UpdateGatepassStatusInput {
  status: GatepassStatus;
  rejection_reason?: string;
  remarks?: string;
}
