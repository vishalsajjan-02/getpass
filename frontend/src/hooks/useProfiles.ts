import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'gatekeeper' | 'employee' | 'guest';
  role_id?: string;
  department?: string;
  department_id?: string;
  manager_id?: string;
  employee_id?: string | null;
  leave_balance?: number;
  can_self_punch?: boolean;
  has_face?: boolean;
  face_image_url?: string | null;
  face_registered_at?: string | null;
  created_at: string;
  updated_at: string;
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

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.get<Profile[]>('/users'),
  });
};

export const useGatepassStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['gatepass-stats'],
    queryFn: () => api.get<GatepassStats>('/gatepasses/stats'),
    enabled: options?.enabled !== false,
  });
};
