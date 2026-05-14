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
  created_at: string;
  updated_at: string;
}

export interface GatepassStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  active: number;
  completed: number;
}

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.get<Profile[]>('/users'),
  });
};

export const useGatepassStats = () => {
  return useQuery({
    queryKey: ['gatepass-stats'],
    queryFn: () => api.get<GatepassStats>('/gatepasses/stats'),
  });
};
