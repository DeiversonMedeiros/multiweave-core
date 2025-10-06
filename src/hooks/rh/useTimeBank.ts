// =====================================================
// HOOK PARA BANCO DE HORAS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTimeBankEntries, 
  getTimeBankEntryById, 
  createTimeBankEntry, 
  updateTimeBankEntry, 
  deleteTimeBankEntry,
  getEmployeeTimeBankBalance,
  approveTimeBankEntry,
  rejectTimeBankEntry,
  TimeBankFilters,
  TimeBankCreateData,
  TimeBankUpdateData
} from '@/services/rh/timeBankService';

// =====================================================
// QUERY KEYS
// =====================================================

const queryKeys = {
  all: ['timeBank'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (companyId: string, filters: TimeBankFilters) => [...queryKeys.lists(), companyId, filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  balance: (employeeId: string, companyId: string) => [...queryKeys.all, 'balance', employeeId, companyId] as const,
};

// =====================================================
// HOOKS PRINCIPAIS
// =====================================================

export function useTimeBankEntries(companyId: string, filters: TimeBankFilters = {}) {
  return useQuery({
    queryKey: queryKeys.list(companyId, filters),
    queryFn: () => getTimeBankEntries(companyId, filters),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTimeBankEntry(id: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => getTimeBankEntryById(id, companyId),
    enabled: !!id && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useEmployeeTimeBankBalance(employeeId: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.balance(employeeId, companyId),
    queryFn: () => getEmployeeTimeBankBalance(employeeId, companyId),
    enabled: !!employeeId && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useTimeBankMutations(companyId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: TimeBankCreateData) => createTimeBankEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TimeBankUpdateData) => updateTimeBankEntry(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteTimeBankEntry(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approvedBy, observacoes }: { id: string; approvedBy: string; observacoes?: string }) => 
      approveTimeBankEntry(id, companyId, approvedBy, observacoes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectedBy, observacoes }: { id: string; rejectedBy: string; observacoes?: string }) => 
      rejectTimeBankEntry(id, companyId, rejectedBy, observacoes),
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
    approveMutation,
    rejectMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || approveMutation.isPending || rejectMutation.isPending,
  };
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

export function useTimeBankStats(companyId: string) {
  return useQuery({
    queryKey: [...queryKeys.all, 'stats', companyId],
    queryFn: async () => {
      // Implementar lógica de estatísticas
      const { data } = await getTimeBankEntries(companyId, {});
      
      const stats = {
        total_entries: data.length,
        pending_approval: data.filter(entry => entry.status === 'pendente').length,
        approved: data.filter(entry => entry.status === 'aprovado').length,
        utilized: data.filter(entry => entry.status === 'utilizado').length,
        expired: data.filter(entry => entry.status === 'expirado').length,
        total_hours: data.reduce((sum, entry) => sum + entry.quantidade_horas, 0),
        by_type: {
          extra: data.filter(entry => entry.tipo_hora === 'extra').reduce((sum, entry) => sum + entry.quantidade_horas, 0),
          compensatoria: data.filter(entry => entry.tipo_hora === 'compensatoria').reduce((sum, entry) => sum + entry.quantidade_horas, 0),
          sobreaviso: data.filter(entry => entry.tipo_hora === 'sobreaviso').reduce((sum, entry) => sum + entry.quantidade_horas, 0),
          adicional_noturno: data.filter(entry => entry.tipo_hora === 'adicional_noturno').reduce((sum, entry) => sum + entry.quantidade_horas, 0),
        }
      };

      return stats;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useTimeBankByEmployee(employeeId: string, companyId: string, filters: TimeBankFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.all, 'employee', employeeId, companyId, filters],
    queryFn: () => getTimeBankEntries(companyId, { ...filters, employee_id: employeeId }),
    enabled: !!employeeId && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
