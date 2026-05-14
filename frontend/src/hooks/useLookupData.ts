import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface NamedLookup {
  name: string;
}

export interface GatepassReasonLookup {
  id: string;
  name: string;
}

export interface RoleLookup {
  role_id: string;
  name: string;
}

export interface ManagerOption {
  id: string;
  name: string;
}

export interface DepartmentOption {
  department_id: string;
  name: string;
}

export const useGatepassReasons = () => {
  return useQuery({
    queryKey: ['gatepass-reasons'],
    queryFn: () => api.get<GatepassReasonLookup[]>('/gatepasses/reasons'),
  });
};

export const useUserRoles = () => {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: () => api.get<RoleLookup[]>('/users/roles'),
  });
};

export const useManagers = () => {
  return useQuery({
    queryKey: ['managers'],
    queryFn: () => api.get<ManagerOption[]>('/users/managers'),
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get<DepartmentOption[]>('/users/departments'),
  });
};
