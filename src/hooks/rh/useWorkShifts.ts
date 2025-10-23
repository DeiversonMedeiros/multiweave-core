import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EntityService } from '@/services/generic/entityService';
import { WorkShift, WorkShiftInsert, WorkShiftUpdate } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar turnos de trabalho
 */
export function useWorkShifts(companyId?: string) {
  const { selectedCompany } = useCompany();
  const id = companyId || selectedCompany?.id;

  console.log('🔍 [DEBUG] useWorkShifts - companyId recebido:', companyId);
  console.log('🔍 [DEBUG] useWorkShifts - selectedCompany?.id:', selectedCompany?.id);
  console.log('🔍 [DEBUG] useWorkShifts - id final:', id);

  const query = useQuery({
    queryKey: ['rh', 'work_shifts', id],
    queryFn: async () => {
      console.log('🔍 [DEBUG] useWorkShifts - queryFn chamado para companyId:', id);
      console.log('🔍 [DEBUG] useWorkShifts - queryFn - chamando EntityService.list diretamente');
      
      // Chamar EntityService.list diretamente para evitar problemas com hooks dentro de hooks
      const result = await EntityService.list({
        schema: 'rh',
        table: 'work_shifts',
        companyId: id || '',
        filters: {},
        page: 1,
        pageSize: 100,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      console.log('🔍 [DEBUG] useWorkShifts - queryFn - EntityService.list retornou:', result);
      return result;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  console.log('🔍 [DEBUG] useWorkShifts - query.status:', query.status);
  console.log('🔍 [DEBUG] useWorkShifts - query.isLoading:', query.isLoading);
  console.log('🔍 [DEBUG] useWorkShifts - query.isFetching:', query.isFetching);
  console.log('🔍 [DEBUG] useWorkShifts - query.isEnabled:', !!id);

  console.log('🔍 [DEBUG] useWorkShifts - query.data:', query.data);
  console.log('🔍 [DEBUG] useWorkShifts - workShifts:', query.data?.data || []);

  // Retornar no formato esperado pelo WorkShiftsPage
  return {
    workShifts: query.data?.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    ...query
  };
}

/**
 * Hook para buscar turno por ID
 */
export function useWorkShift(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'work_shifts', id],
    queryFn: () => useRHData('work_shifts', selectedCompany?.id || '', { id }),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar turnos ativos
 */
export function useActiveWorkShifts() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'work_shifts', 'active', selectedCompany?.id],
    queryFn: () => useRHData('work_shifts', selectedCompany?.id || '', { status: 'ativo' }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar turno de trabalho
 */
export function useCreateWorkShift() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (workShift: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('🔍 [DEBUG] Dados do workShift recebidos:', workShift);
      console.log('🔍 [DEBUG] selectedCompany?.id:', selectedCompany?.id);
      
      const { EntityService } = await import('@/services/generic/entityService');
      return EntityService.create({
        schema: 'rh',
        table: 'work_shifts',
        companyId: selectedCompany?.id || '',
        data: workShift
      });
    },
    onSuccess: () => {
      console.log('🔍 [DEBUG] useCreateWorkShift - onSuccess chamado');
      console.log('🔍 [DEBUG] useCreateWorkShift - invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['rh', 'work_shifts'] });
      console.log('🔍 [DEBUG] useCreateWorkShift - queries invalidadas');
    },
    onError: (error) => {
      console.error('Erro ao criar turno de trabalho:', error);
    },
  });
}

/**
 * Hook para atualizar turno de trabalho
 */
export function useUpdateWorkShift() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkShift> }) => {
      const { EntityService } = await import('@/services/generic/entityService');
      return EntityService.update({
        schema: 'rh',
        table: 'work_shifts',
        companyId: selectedCompany?.id || '',
        id,
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work_shifts'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar turno de trabalho:', error);
    },
  });
}

/**
 * Hook para excluir turno de trabalho
 */
export function useDeleteWorkShift() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      const { EntityService } = await import('@/services/generic/entityService');
      return EntityService.delete({
        schema: 'rh',
        table: 'work_shifts',
        companyId: selectedCompany?.id || '',
        id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work_shifts'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir turno de trabalho:', error);
    },
  });
}

/**
 * Hook para alterar status do turno
 */
export function useChangeWorkShiftStatus() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) => {
      const { EntityService } = await import('@/services/generic/entityService');
      return EntityService.update({
        schema: 'rh',
        table: 'work_shifts',
        companyId: selectedCompany?.id || '',
        id,
        data: { status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work_shifts'] });
    },
    onError: (error) => {
      console.error('Erro ao alterar status do turno:', error);
    },
  });
}

// =====================================================
// HOOK DE MUTAÇÕES COMBINADO (COMPATIBILIDADE)
// =====================================================

/**
 * Hook que combina todas as mutações para compatibilidade com WorkShiftsPage
 */
export function useWorkShiftMutations(companyId?: string) {
  const { selectedCompany } = useCompany();
  const id = companyId || selectedCompany?.id;
  
  const createMutation = useCreateWorkShift();
  const updateMutation = useUpdateWorkShift();
  const deleteMutation = useDeleteWorkShift();
  const changeStatusMutation = useChangeWorkShiftStatus();

  return {
    createMutation: createMutation.mutateAsync,
    updateMutation: updateMutation.mutateAsync,
    deleteMutation: deleteMutation.mutateAsync,
    changeStatusMutation: changeStatusMutation.mutateAsync,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || changeStatusMutation.isPending,
  };
}