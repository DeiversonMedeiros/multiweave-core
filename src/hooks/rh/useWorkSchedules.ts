import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkSchedulesService } from '@/services/rh/workSchedulesService';
import { 
  WorkSchedule, 
  WorkScheduleInsert, 
  WorkScheduleUpdate 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar escalas de trabalho
 */
export function useWorkSchedules() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'work-schedules', selectedCompany?.id],
    queryFn: () => WorkSchedulesService.list({ 
      companyId: selectedCompany?.id || ''
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar escala por ID
 */
export function useWorkSchedule(id: string) {
  return useQuery({
    queryKey: ['rh', 'work-schedules', id],
    queryFn: () => WorkSchedulesService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar escalas ativas
 */
export function useActiveWorkSchedules() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'work-schedules', 'active', selectedCompany?.id],
    queryFn: () => WorkSchedulesService.getActive(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar estatísticas das escalas
 */
export function useWorkSchedulesStats() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'work-schedules', 'stats', selectedCompany?.id],
    queryFn: () => WorkSchedulesService.getStats(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar escala de trabalho
 */
export function useCreateWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schedule: WorkScheduleInsert) => WorkSchedulesService.create(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work-schedules'] });
    },
    onError: (error) => {
      console.error('Erro ao criar escala de trabalho:', error);
    },
  });
}

/**
 * Hook para atualizar escala de trabalho
 */
export function useUpdateWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, schedule }: { id: string; schedule: WorkScheduleUpdate }) => 
      WorkSchedulesService.update(id, schedule),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work-schedules'] });
      queryClient.setQueryData(['rh', 'work-schedules', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar escala de trabalho:', error);
    },
  });
}

/**
 * Hook para excluir escala de trabalho
 */
export function useDeleteWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => WorkSchedulesService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work-schedules'] });
      queryClient.removeQueries({ queryKey: ['rh', 'work-schedules', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir escala de trabalho:', error);
    },
  });
}

/**
 * Hook para ativar/desativar escala de trabalho
 */
export function useToggleWorkScheduleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      WorkSchedulesService.toggleStatus(id, isActive),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'work-schedules'] });
      queryClient.setQueryData(['rh', 'work-schedules', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao alterar status da escala:', error);
    },
  });
}

// =====================================================
// HOOKS AUXILIARES
// =====================================================

/**
 * Hook para validar nome da escala
 */
export function useValidateScheduleName() {
  return useMutation({
    mutationFn: ({ name, companyId, excludeId }: { 
      name: string; 
      companyId: string; 
      excludeId?: string 
    }) => WorkSchedulesService.validateName(name, companyId, excludeId),
    onError: (error) => {
      console.error('Erro ao validar nome da escala:', error);
    },
  });
}

export default useWorkSchedules;
