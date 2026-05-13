export type UserRole = 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
export type GatepassStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  employee_id?: string;
  phone?: string;
  address?: string;
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
  purpose: string;
  destination?: string;
  date: string;
  out_time?: string;
  expected_return_time?: string;
  actual_return_time?: string;
  status: GatepassStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleOption {
  name: UserRole;
}

export interface GatepassReason {
  name: string;
}

export interface GatepassWithProfile extends Gatepass {
  profiles?: {
    name: string;
    email: string;
    department?: string;
    employee_id?: string;
  };
}

export interface GatepassStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  active: number;
  completed: number;
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
  department?: string;
  employee_id?: string;
  phone?: string;
  address?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  employee_id?: string;
  phone?: string;
  address?: string;
}

export interface CreateGatepassInput {
  purpose: string;
  destination?: string;
  date?: string;
  expected_return_time?: string;
  out_time?: string;
  is_emergency?: boolean;
}

export interface UpdateGatepassStatusInput {
  status: GatepassStatus;
  approved_by?: string;
  rejection_reason?: string;
  out_time?: string;
  actual_return_time?: string;
}
