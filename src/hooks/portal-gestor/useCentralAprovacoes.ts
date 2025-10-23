import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { 
  getAprovacoes, 
  approveRequest, 
  rejectRequest,
  AprovacaoFilters 
} from '@/services/portal-gestor/centralAprovacoesService';

// =====================================================
// HOOKS PARA CENTRAL DE APROVAÇÕES
// =====================================================

/**
 * Hook para buscar aprovações com filtros
 */
export function useAprovacoes(filters: AprovacaoFilters = {}) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['central-aprovacoes', companyId, filters],
    queryFn: () => getAprovacoes(companyId, filters),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 2 * 60 * 1000, // Refetch a cada 2 minutos
  });
}

/**
 * Hook para aprovar solicitação
 */
export function useAprovarSolicitacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      tipo, 
      id, 
      observacoes 
    }: { 
      tipo: string; 
      id: string; 
      observacoes?: string; 
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      return await approveRequest({ tipo, id, observacoes });
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['central-aprovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-recent-activities'] });
    },
  });
}

/**
 * Hook para rejeitar solicitação
 */
export function useRejeitarSolicitacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      tipo, 
      id, 
      observacoes 
    }: { 
      tipo: string; 
      id: string; 
      observacoes: string; 
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      return await rejectRequest({ tipo, id, observacoes });
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['central-aprovacoes'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gestor-recent-activities'] });
    },
  });
}

/**
 * Hook combinado para gerenciar aprovações
 */
export function useCentralAprovacoes(filters: AprovacaoFilters = {}) {
  const aprovacoes = useAprovacoes(filters);
  const aprovar = useAprovarSolicitacao();
  const rejeitar = useRejeitarSolicitacao();

  return {
    aprovacoesData: aprovacoes.data || [],
    aprovar,
    rejeitar,
    isLoading: aprovacoes.isLoading || aprovar.isPending || rejeitar.isPending,
    error: aprovacoes.error || aprovar.error || rejeitar.error,
    refetch: aprovacoes.refetch
  };
}
