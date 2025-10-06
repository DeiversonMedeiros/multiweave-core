// =====================================================
// HOOK PARA EXAMES PERIÓDICOS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPeriodicExams, 
  getPeriodicExamById, 
  createPeriodicExam, 
  updatePeriodicExam, 
  deletePeriodicExam,
  getEmployeeExams,
  getExpiredExams,
  getExamsByType,
  markExamAsCompleted,
  rescheduleExam,
  getExamStats,
  PeriodicExamFilters,
  PeriodicExamCreateData,
  PeriodicExamUpdateData
} from '@/services/rh/periodicExamsService';

// =====================================================
// QUERY KEYS
// =====================================================

const queryKeys = {
  all: ['periodicExams'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (companyId: string, filters: PeriodicExamFilters) => [...queryKeys.lists(), companyId, filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  employee: (employeeId: string, companyId: string) => [...queryKeys.all, 'employee', employeeId, companyId] as const,
  expired: (companyId: string, daysAhead: number) => [...queryKeys.all, 'expired', companyId, daysAhead] as const,
  byType: (companyId: string, tipoExame: string) => [...queryKeys.all, 'byType', companyId, tipoExame] as const,
  stats: (companyId: string) => [...queryKeys.all, 'stats', companyId] as const,
};

// =====================================================
// HOOKS PRINCIPAIS
// =====================================================

export function usePeriodicExams(companyId: string, filters: PeriodicExamFilters = {}) {
  return useQuery({
    queryKey: queryKeys.list(companyId, filters),
    queryFn: () => getPeriodicExams(companyId, filters),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function usePeriodicExam(id: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => getPeriodicExamById(id, companyId),
    enabled: !!id && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useEmployeeExams(employeeId: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.employee(employeeId, companyId),
    queryFn: () => getEmployeeExams(employeeId, companyId),
    enabled: !!employeeId && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useExpiredExams(companyId: string, daysAhead: number = 30) {
  return useQuery({
    queryKey: queryKeys.expired(companyId, daysAhead),
    queryFn: () => getExpiredExams(companyId, daysAhead),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useExamsByType(companyId: string, tipoExame: string) {
  return useQuery({
    queryKey: queryKeys.byType(companyId, tipoExame),
    queryFn: () => getExamsByType(companyId, tipoExame),
    enabled: !!companyId && !!tipoExame,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useExamStats(companyId: string) {
  return useQuery({
    queryKey: queryKeys.stats(companyId),
    queryFn: () => getExamStats(companyId),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function usePeriodicExamMutations(companyId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: PeriodicExamCreateData) => createPeriodicExam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PeriodicExamUpdateData) => updatePeriodicExam(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deletePeriodicExam(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: ({ 
      id, 
      dataRealizacao, 
      resultado, 
      observacoes 
    }: { 
      id: string; 
      dataRealizacao: string; 
      resultado: string; 
      observacoes?: string; 
    }) => markExamAsCompleted(id, companyId, dataRealizacao, resultado, observacoes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ 
      id, 
      novaDataAgendamento, 
      observacoes 
    }: { 
      id: string; 
      novaDataAgendamento: string; 
      observacoes?: string; 
    }) => rescheduleExam(id, companyId, novaDataAgendamento, observacoes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    markCompletedMutation,
    rescheduleMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || markCompletedMutation.isPending || rescheduleMutation.isPending,
  };
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

export function useExamCalendar(companyId: string, year: number, month: number) {
  return useQuery({
    queryKey: [...queryKeys.all, 'calendar', companyId, year, month],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const { data } = await getPeriodicExams(companyId, {
        data_inicio: startDate.toISOString().split('T')[0],
        data_fim: endDate.toISOString().split('T')[0]
      });
      
      // Organizar exames por dia
      const calendar = Array.from({ length: endDate.getDate() }, (_, i) => ({
        day: i + 1,
        exams: data.filter(exam => {
          const examDate = new Date(exam.data_agendamento);
          return examDate.getDate() === i + 1;
        })
      }));

      return calendar;
    },
    enabled: !!companyId && !!year && !!month,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useExamNotifications(companyId: string) {
  return useQuery({
    queryKey: [...queryKeys.all, 'notifications', companyId],
    queryFn: async () => {
      const [expiredExams, upcomingExams] = await Promise.all([
        getExpiredExams(companyId, 0), // Exames já vencidos
        getExpiredExams(companyId, 7)  // Exames que vencem em 7 dias
      ]);

      const notifications = {
        expired: expiredExams.length,
        expiring_soon: upcomingExams.length - expiredExams.length,
        total: expiredExams.length + (upcomingExams.length - expiredExams.length)
      };

      return notifications;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}
