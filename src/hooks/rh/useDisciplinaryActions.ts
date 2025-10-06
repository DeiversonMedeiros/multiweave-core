// =====================================================
// HOOK PARA AÇÕES DISCIPLINARES
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getDisciplinaryActions, 
  getDisciplinaryActionById, 
  createDisciplinaryAction, 
  updateDisciplinaryAction, 
  deleteDisciplinaryAction,
  getEmployeeDisciplinaryActions,
  getActionsBySeverity,
  approveDisciplinaryAction,
  archiveDisciplinaryAction,
  cancelDisciplinaryAction,
  getDisciplinaryActionStats,
  DisciplinaryActionFilters,
  DisciplinaryActionCreateData,
  DisciplinaryActionUpdateData
} from '@/services/rh/disciplinaryActionsService';

// =====================================================
// QUERY KEYS
// =====================================================

const queryKeys = {
  all: ['disciplinaryActions'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (companyId: string, filters: DisciplinaryActionFilters) => [...queryKeys.lists(), companyId, filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  employee: (employeeId: string, companyId: string) => [...queryKeys.all, 'employee', employeeId, companyId] as const,
  bySeverity: (companyId: string, severity: string) => [...queryKeys.all, 'bySeverity', companyId, severity] as const,
  stats: (companyId: string) => [...queryKeys.all, 'stats', companyId] as const,
};

// =====================================================
// HOOKS PRINCIPAIS
// =====================================================

export function useDisciplinaryActions(companyId: string, filters: DisciplinaryActionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.list(companyId, filters),
    queryFn: () => getDisciplinaryActions(companyId, filters),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useDisciplinaryAction(id: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => getDisciplinaryActionById(id, companyId),
    enabled: !!id && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useEmployeeDisciplinaryActions(employeeId: string, companyId: string) {
  return useQuery({
    queryKey: queryKeys.employee(employeeId, companyId),
    queryFn: () => getEmployeeDisciplinaryActions(employeeId, companyId),
    enabled: !!employeeId && !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useActionsBySeverity(companyId: string, severity: string) {
  return useQuery({
    queryKey: queryKeys.bySeverity(companyId, severity),
    queryFn: () => getActionsBySeverity(companyId, severity),
    enabled: !!companyId && !!severity,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useDisciplinaryActionStats(companyId: string) {
  return useQuery({
    queryKey: queryKeys.stats(companyId),
    queryFn: () => getDisciplinaryActionStats(companyId),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useDisciplinaryActionMutations(companyId: string) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: DisciplinaryActionCreateData) => createDisciplinaryAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DisciplinaryActionUpdateData) => updateDisciplinaryAction(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteDisciplinaryAction(id, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ 
      id, 
      aprovadoPor, 
      observacoes 
    }: { 
      id: string; 
      aprovadoPor: string; 
      observacoes?: string; 
    }) => approveDisciplinaryAction(id, companyId, aprovadoPor, observacoes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ 
      id, 
      motivoArquivamento 
    }: { 
      id: string; 
      motivoArquivamento: string; 
    }) => archiveDisciplinaryAction(id, companyId, motivoArquivamento),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ 
      id, 
      motivoCancelamento 
    }: { 
      id: string; 
      motivoCancelamento: string; 
    }) => cancelDisciplinaryAction(id, companyId, motivoCancelamento),
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
    archiveMutation,
    cancelMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || approveMutation.isPending || archiveMutation.isPending || cancelMutation.isPending,
  };
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

export function useDisciplinaryActionHistory(companyId: string, year: number) {
  return useQuery({
    queryKey: [...queryKeys.all, 'history', companyId, year],
    queryFn: async () => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      
      const { data } = await getDisciplinaryActions(companyId, {
        data_inicio: startDate.toISOString().split('T')[0],
        data_fim: endDate.toISOString().split('T')[0]
      });
      
      // Organizar ações por mês
      const history = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        actions: data.filter(action => {
          const actionDate = new Date(action.data_ocorrencia);
          return actionDate.getMonth() === i;
        })
      }));

      return history;
    },
    enabled: !!companyId && !!year,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useDisciplinaryActionAlerts(companyId: string) {
  return useQuery({
    queryKey: [...queryKeys.all, 'alerts', companyId],
    queryFn: async () => {
      const { data } = await getDisciplinaryActions(companyId, {});
      
      const alerts = {
        recent_actions: data.filter(action => {
          const actionDate = new Date(action.data_ocorrencia);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return actionDate >= sevenDaysAgo;
        }).length,
        high_severity: data.filter(action => 
          action.gravidade === 'grave' || action.gravidade === 'gravissima'
        ).length,
        pending_approval: data.filter(action => 
          action.status === 'ativo' && !action.aprovado_por
        ).length,
        total: data.length
      };

      return alerts;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}
