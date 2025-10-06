import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TimeRecordsService } from '@/services/rh/timeRecordsService';
import { 
  TimeRecord, 
  TimeRecordInsert, 
  TimeRecordUpdate 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar registros de ponto
 */
export function useTimeRecords(params: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'time-records', selectedCompany?.id, params],
    queryFn: () => TimeRecordsService.list({
      ...params,
      companyId: selectedCompany?.id || ''
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar registro por ID
 */
export function useTimeRecord(id: string) {
  return useQuery({
    queryKey: ['rh', 'time-records', id],
    queryFn: () => TimeRecordsService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar registro do dia atual
 */
export function useTodayTimeRecord(employeeId: string) {
  return useQuery({
    queryKey: ['rh', 'time-records', 'today', employeeId],
    queryFn: () => TimeRecordsService.getTodayRecords(employeeId),
    enabled: !!employeeId,
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  });
}

/**
 * Hook para buscar registros pendentes de aprovação
 */
export function usePendingTimeRecords() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'time-records', 'pending', selectedCompany?.id],
    queryFn: () => TimeRecordsService.getPendingApprovals(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 1 * 60 * 1000, // Refetch a cada minuto
  });
}

/**
 * Hook para buscar estatísticas de ponto
 */
export function useTimeRecordsStats(startDate: string, endDate: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'time-records', 'stats', selectedCompany?.id, startDate, endDate],
    queryFn: () => TimeRecordsService.getStats(selectedCompany?.id || '', startDate, endDate),
    enabled: !!selectedCompany?.id && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar registro de ponto
 */
export function useCreateTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record: TimeRecordInsert) => TimeRecordsService.create(record),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao criar registro de ponto:', error);
    },
  });
}

/**
 * Hook para atualizar registro de ponto
 */
export function useUpdateTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, record }: { id: string; record: TimeRecordUpdate }) => 
      TimeRecordsService.update(id, record),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar registro de ponto:', error);
    },
  });
}

/**
 * Hook para excluir registro de ponto
 */
export function useDeleteTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TimeRecordsService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.removeQueries({ queryKey: ['rh', 'time-records', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir registro de ponto:', error);
    },
  });
}

/**
 * Hook para aprovar registro de ponto
 */
export function useApproveTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) => 
      TimeRecordsService.approve(id, observacoes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao aprovar registro:', error);
    },
  });
}

/**
 * Hook para rejeitar registro de ponto
 */
export function useRejectTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes: string }) => 
      TimeRecordsService.reject(id, observacoes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao rejeitar registro:', error);
    },
  });
}

// =====================================================
// HOOKS DE AÇÃO RÁPIDA
// =====================================================

/**
 * Hook para registrar entrada
 */
export function useRegisterEntry() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerEntry(employeeId, selectedCompany?.id || ''),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar entrada:', error);
    },
  });
}

/**
 * Hook para registrar saída
 */
export function useRegisterExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerExit(employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar saída:', error);
    },
  });
}

/**
 * Hook para registrar entrada do almoço
 */
export function useRegisterLunchEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerLunchEntry(employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar entrada do almoço:', error);
    },
  });
}

/**
 * Hook para registrar saída do almoço
 */
export function useRegisterLunchExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerLunchExit(employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar saída do almoço:', error);
    },
  });
}

export default useTimeRecords;
