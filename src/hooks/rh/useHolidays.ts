// =====================================================
// HOOK PARA FERIADOS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getHolidays, 
  getHolidayById, 
  createHoliday, 
  updateHoliday, 
  deleteHoliday,
  getHolidaysByYear,
  getHolidaysByMonth,
  isHoliday,
  getWorkingDaysInMonth,
  importNationalHolidays,
  HolidayFilters,
  HolidayCreateData,
  HolidayUpdateData
} from '@/services/rh/holidaysService';

// =====================================================
// QUERY KEYS
// =====================================================

const queryKeys = {
  all: ['holidays'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (companyId: string, filters: HolidayFilters) => [...queryKeys.lists(), companyId, filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  byYear: (companyId: string, year: number) => [...queryKeys.all, 'year', companyId, year] as const,
  byMonth: (companyId: string, year: number, month: number) => [...queryKeys.all, 'month', companyId, year, month] as const,
  isHoliday: (companyId: string, date: string) => [...queryKeys.all, 'isHoliday', companyId, date] as const,
  workingDays: (companyId: string, year: number, month: number) => [...queryKeys.all, 'workingDays', companyId, year, month] as const,
};

// =====================================================
// HOOKS PRINCIPAIS
// =====================================================

export function useHolidays(companyId: string, filters: HolidayFilters = {}) {
  return useQuery({
    queryKey: queryKeys.list(companyId, filters),
    queryFn: () => getHolidays(companyId, filters),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useHoliday(id: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => getHolidayById(id, companyId),
    enabled: !!id && !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useHolidaysByYear(companyId: string, year: number) {
  return useQuery({
    queryKey: queryKeys.byYear(companyId, year),
    queryFn: () => getHolidaysByYear(companyId, year),
    enabled: !!companyId && !!year,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useHolidaysByMonth(companyId: string, year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.byMonth(companyId, year, month),
    queryFn: () => getHolidaysByMonth(companyId, year, month),
    enabled: !!companyId && !!year && !!month,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useIsHoliday(companyId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.isHoliday(companyId, date),
    queryFn: () => isHoliday(companyId, date),
    enabled: !!companyId && !!date,
    staleTime: 60 * 60 * 1000, // 1 hora
  });
}

export function useWorkingDaysInMonth(companyId: string, year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.workingDays(companyId, year, month),
    queryFn: () => getWorkingDaysInMonth(companyId, year, month),
    enabled: !!companyId && !!year && !!month,
    staleTime: 60 * 60 * 1000, // 1 hora
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useHolidayMutations(companyId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: HolidayCreateData) => createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: HolidayUpdateData) => updateHoliday(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteHoliday(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const importNationalMutation = useMutation({
    mutationFn: (year: number) => importNationalHolidays(companyId, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    importNationalMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || importNationalMutation.isPending,
  };
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

export function useHolidayStats(companyId: string) {
  return useQuery({
    queryKey: [...queryKeys.all, 'stats', companyId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const { data } = await getHolidays(companyId, { ano: currentYear });
      
      const stats = {
        total_holidays: data.length,
        by_type: {
          nacional: data.filter(holiday => holiday.tipo === 'nacional').length,
          estadual: data.filter(holiday => holiday.tipo === 'estadual').length,
          municipal: data.filter(holiday => holiday.tipo === 'municipal').length,
          pontos_facultativos: data.filter(holiday => holiday.tipo === 'pontos_facultativos').length,
          outros: data.filter(holiday => holiday.tipo === 'outros').length,
        },
        active: data.filter(holiday => holiday.ativo).length,
        inactive: data.filter(holiday => !holiday.ativo).length,
      };

      return stats;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useHolidayCalendar(companyId: string, year: number) {
  return useQuery({
    queryKey: [...queryKeys.all, 'calendar', companyId, year],
    queryFn: async () => {
      const { data } = await getHolidaysByYear(companyId, year);
      
      // Organizar feriados por mês
      const calendar = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        holidays: data.filter(holiday => new Date(holiday.data).getMonth() === i)
      }));

      return calendar;
    },
    enabled: !!companyId && !!year,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}
