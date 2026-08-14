import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface CompanyHoliday {
  id: string;
  name: string;
  description: string;
  holiday_date: string;
  year: number;
  is_fixed: boolean;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CompanyHolidayInput = {
  name: string;
  description?: string;
  holiday_date: string;
  is_fixed?: boolean;
  is_paid?: boolean;
  sort_order?: number;
};

const HOLIDAYS_KEY = 'company-holidays';

export const useCompanyHolidays = (year?: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [HOLIDAYS_KEY, year ?? 'all'],
    queryFn: () =>
      api.get<CompanyHoliday[]>(
        year ? `/company-holidays?year=${encodeURIComponent(String(year))}` : '/company-holidays',
      ),
    enabled: options?.enabled !== false,
  });
};

export const useCreateCompanyHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompanyHolidayInput) => api.post<CompanyHoliday>('/company-holidays', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HOLIDAYS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
    },
  });
};

export const useUpdateCompanyHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: CompanyHolidayInput & { id: string; is_active?: boolean }) =>
      api.put<CompanyHoliday>(`/company-holidays/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HOLIDAYS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
    },
  });
};

export const useDeleteCompanyHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/company-holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HOLIDAYS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['user-in-out-time'] });
    },
  });
};
