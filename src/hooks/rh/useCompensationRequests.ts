import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CompensationRequestsService } from '@/services/rh/compensationRequestsService';
import { CompensationRequest } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar solicitações de compensação
 */
export function useCompensationRequests() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'compensation_requests', selectedCompany?.id],
    queryFn: () => CompensationRequestsService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar solicitação de compensação por ID
 */
export function useCompensationRequest(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'compensation_requests', id],
    queryFn: () => CompensationRequestsService.getById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar solicitação de compensação
 */
export function useCreateCompensationRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: Partial<CompensationRequest>) => 
      CompensationRequestsService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'compensation_requests'] });
    },
    onError: (error) => {
      console.error('Erro ao criar solicitação de compensação:', error);
    },
  });
}

/**
 * Hook para atualizar solicitação de compensação
 */
export function useUpdateCompensationRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompensationRequest> }) => 
      CompensationRequestsService.update(id, data, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'compensation_requests'] });
      queryClient.setQueryData(['rh', 'compensation_requests', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar solicitação de compensação:', error);
    },
  });
}

/**
 * Hook para excluir solicitação de compensação
 */
export function useDeleteCompensationRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      CompensationRequestsService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'compensation_requests'] });
      queryClient.removeQueries({ queryKey: ['rh', 'compensation_requests', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir solicitação de compensação:', error);
    },
  });
}

/**
 * Hook para aprovar solicitação de compensação
 */
export function useApproveCompensationRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, aprovadoPor, observacoes }: { id: string; aprovadoPor: string; observacoes?: string }) => 
      CompensationRequestsService.approve(id, selectedCompany?.id || '', aprovadoPor, observacoes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'compensation_requests'] });
    },
    onError: (error) => {
      console.error('Erro ao aprovar solicitação de compensação:', error);
    },
  });
}

/**
 * Hook para rejeitar solicitação de compensação
 */
export function useRejectCompensationRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, motivoRejeicao, aprovadoPor }: { id: string; motivoRejeicao: string; aprovadoPor: string }) => 
      CompensationRequestsService.reject(id, selectedCompany?.id || '', motivoRejeicao, aprovadoPor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'compensation_requests'] });
    },
    onError: (error) => {
      console.error('Erro ao rejeitar solicitação de compensação:', error);
    },
  });
}

/**
 * Hook para marcar compensação como realizada
 */
export function useMarkCompensationAsRealized() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      CompensationRequestsService.markAsRealized(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'compensation_requests'] });
    },
    onError: (error) => {
      console.error('Erro ao marcar compensação como realizada:', error);
    },
  });
}

/**
 * Hook para validar solicitação de compensação
 */
export function useValidateCompensationRequest() {
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: Partial<CompensationRequest>) => 
      CompensationRequestsService.validate(data, selectedCompany?.id || ''),
    onError: (error) => {
      console.error('Erro ao validar solicitação de compensação:', error);
    },
  });
}

export default useCompensationRequests;
