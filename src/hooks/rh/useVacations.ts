import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VacationsService } from '@/services/rh/vacationsService';
import { Vacation, VacationInsert, VacationUpdate } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar férias e licenças
 */
export function useVacations(params: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  type?: string;
} = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'vacations', selectedCompany?.id, params],
    queryFn: () => VacationsService.list({
      ...params,
      companyId: selectedCompany?.id || ''
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar férias por ID
 */
export function useVacationById(id: string) {
  return useQuery({
    queryKey: ['rh', 'vacations', id],
    queryFn: () => VacationsService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar férias pendentes de aprovação
 */
export function usePendingVacations() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'vacations', 'pending', selectedCompany?.id],
    queryFn: () => VacationsService.getPendingApprovals(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 2 * 60 * 1000, // Refetch a cada 2 minutos
  });
}

/**
 * Hook para buscar férias por funcionário
 */
export function useVacationsByEmployee(employeeId: string, year?: number) {
  return useQuery({
    queryKey: ['rh', 'vacations', 'employee', employeeId, year],
    queryFn: () => VacationsService.getByEmployee(employeeId, year),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar próximas férias
 */
export function useUpcomingVacations(days: number = 30) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'vacations', 'upcoming', selectedCompany?.id, days],
    queryFn: () => VacationsService.getUpcomingVacations(selectedCompany?.id || '', days),
    enabled: !!selectedCompany?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para buscar estatísticas de férias
 */
export function useVacationsStats(year: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'vacations', 'stats', selectedCompany?.id, year],
    queryFn: () => VacationsService.getStats(selectedCompany?.id || '', year),
    enabled: !!selectedCompany?.id && !!year,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar férias/licença
 */
export function useCreateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vacation: VacationInsert) => VacationsService.create(vacation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
    },
    onError: (error) => {
      console.error('Erro ao criar férias:', error);
    },
  });
}

/**
 * Hook para atualizar férias/licença
 */
export function useUpdateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, vacation }: { id: string; vacation: VacationUpdate }) => 
      VacationsService.update(id, vacation),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
      queryClient.setQueryData(['rh', 'vacations', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar férias:', error);
    },
  });
}

/**
 * Hook para excluir férias/licença
 */
export function useDeleteVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => VacationsService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
      queryClient.removeQueries({ queryKey: ['rh', 'vacations', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir férias:', error);
    },
  });
}

/**
 * Hook para aprovar férias
 */
export function useApproveVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvedBy, comments }: { 
      id: string; 
      approvedBy: string; 
      comments?: string 
    }) => VacationsService.approve(id, approvedBy, comments),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
      queryClient.setQueryData(['rh', 'vacations', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao aprovar férias:', error);
    },
  });
}

/**
 * Hook para rejeitar férias
 */
export function useRejectVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rejectedBy, reason }: { 
      id: string; 
      rejectedBy: string; 
      reason: string 
    }) => VacationsService.reject(id, rejectedBy, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
      queryClient.setQueryData(['rh', 'vacations', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao rejeitar férias:', error);
    },
  });
}

// =====================================================
// HOOKS AUXILIARES
// =====================================================

/**
 * Hook para calcular dias de férias disponíveis
 */
export function useAvailableVacationDays(employeeId: string, year: number) {
  return useQuery({
    queryKey: ['rh', 'vacations', 'available-days', employeeId, year],
    queryFn: () => VacationsService.calculateAvailableVacationDays(employeeId, year),
    enabled: !!employeeId && !!year,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para validar conflito de datas
 */
export function useValidateDateConflict() {
  return useMutation({
    mutationFn: (params: {
      employeeId: string;
      startDate: string;
      endDate: string;
      excludeId?: string;
    }) => VacationsService.validateDateConflict(params),
    onError: (error) => {
      console.error('Erro ao validar conflito de datas:', error);
    },
  });
}

export default useVacations;
