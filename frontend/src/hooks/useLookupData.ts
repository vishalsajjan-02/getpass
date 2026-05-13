import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface NamedLookup {
  name: string;
}

export const useGatepassReasons = () => {
  return useQuery({
    queryKey: ['gatepass-reasons'],
    queryFn: () => api.get<NamedLookup[]>('/gatepasses/reasons'),
  });
};

export const useUserRoles = () => {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: () => api.get<NamedLookup[]>('/users/roles'),
  });
};
