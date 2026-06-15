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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  department_id?: string;
  manager_id?: string;
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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  remarks?: string;
  acted_at?: string;
}

export interface Gatepass {
  id: string;
  user_id: string;
  reason_id: string;
  reason_name: string;
  display_reason: string;
  reason_description?: string;
  destination?: string;
  date: string;
  status: GatepassStatus;
  approval_flow: 'admin_only' | 'manager_then_admin';
  gatepass_type: 'out-in' | 'out';
  rejection_reason?: string;
  is_emergency?: boolean;
  checked_out_at?: string;
  checked_in_at?: string;
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

export interface UserInOutTimeReportRow {
  user_id: string;
  user_name: string;
  email: string;
  role: UserRole;
  department?: string;
  date: string;
  entry_id?: string;
  in_time?: string;
  out_time?: string;
  updated_at?: string;
}
