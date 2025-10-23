import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { EventApprovalService, EventApprovalFilters, ApprovalHistory } from '@/services/rh/eventApprovalService';
import { toast } from 'sonner';

// =====================================================
// HOOKS PARA APROVAÇÃO DE EVENTOS
// =====================================================

/**
 * Hook para aprovar eventos
 */
export function useApproveEvents() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventIds, 
      approvedBy 
    }: { 
      eventIds: string[]; 
      approvedBy: string; 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await EventApprovalService.approveEvents(
        eventIds,
        approvedBy,
        selectedCompany.id
      );
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-events'] });
      queryClient.invalidateQueries({ queryKey: ['event-consolidation'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });

      if (result.success) {
        toast.success(`${result.approvedCount} eventos aprovados com sucesso`);
      } else {
        toast.error(`Erro ao aprovar eventos: ${result.errors.join(', ')}`);
      }
    },
    onError: (error) => {
      console.error('Erro ao aprovar eventos:', error);
      toast.error('Erro ao aprovar eventos');
    }
  });
}

/**
 * Hook para rejeitar eventos
 */
export function useRejectEvents() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventIds, 
      rejectedBy, 
      reason 
    }: { 
      eventIds: string[]; 
      rejectedBy: string; 
      reason: string; 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await EventApprovalService.rejectEvents(
        eventIds,
        rejectedBy,
        reason,
        selectedCompany.id
      );
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-events'] });
      queryClient.invalidateQueries({ queryKey: ['event-consolidation'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });

      if (result.success) {
        toast.success(`${result.rejectedCount} eventos rejeitados com sucesso`);
      } else {
        toast.error(`Erro ao rejeitar eventos: ${result.errors.join(', ')}`);
      }
    },
    onError: (error) => {
      console.error('Erro ao rejeitar eventos:', error);
      toast.error('Erro ao rejeitar eventos');
    }
  });
}

/**
 * Hook para validar eventos
 */
export function useValidateEvents() {
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await EventApprovalService.validateEvents(
        eventIds,
        selectedCompany.id
      );
    },
    onError: (error) => {
      console.error('Erro ao validar eventos:', error);
      toast.error('Erro ao validar eventos');
    }
  });
}

/**
 * Hook para buscar eventos com filtros
 */
export function useEvents(filters: EventApprovalFilters = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payroll-events', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) {
        return [];
      }

      return await EventApprovalService.getEvents(
        selectedCompany.id,
        filters
      );
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar histórico de aprovação
 */
export function useApprovalHistory(eventId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['approval-history', eventId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !eventId) {
        return [];
      }

      return await EventApprovalService.getApprovalHistory(
        eventId,
        selectedCompany.id
      );
    },
    enabled: !!selectedCompany?.id && !!eventId,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para estatísticas de aprovação
 */
export function useApprovalStats(period?: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['approval-stats', selectedCompany?.id, period],
    queryFn: async () => {
      if (!selectedCompany?.id) {
        return {
          totalEvents: 0,
          pendingEvents: 0,
          approvedEvents: 0,
          rejectedEvents: 0,
          processedEvents: 0,
        };
      }

      return await EventApprovalService.getApprovalStats(
        selectedCompany.id,
        period
      );
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para aprovação em lote com validação
 */
export function useBatchApproveEvents() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventIds, 
      approvedBy 
    }: { 
      eventIds: string[]; 
      approvedBy: string; 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await EventApprovalService.approveEventsBatch(
        eventIds,
        approvedBy,
        selectedCompany.id
      );
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-events'] });
      queryClient.invalidateQueries({ queryKey: ['event-consolidation'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });

      if (result.success) {
        toast.success(`${result.approvedCount} eventos aprovados com sucesso`);
        if (result.errors.length > 0) {
          toast.warning(`Avisos: ${result.errors.join(', ')}`);
        }
      } else {
        toast.error(`Erro ao aprovar eventos: ${result.errors.join(', ')}`);
      }
    },
    onError: (error) => {
      console.error('Erro ao aprovar eventos em lote:', error);
      toast.error('Erro ao aprovar eventos em lote');
    }
  });
}

/**
 * Hook para rejeição em lote com validação
 */
export function useBatchRejectEvents() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      eventIds, 
      rejectedBy, 
      reason 
    }: { 
      eventIds: string[]; 
      rejectedBy: string; 
      reason: string; 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await EventApprovalService.rejectEventsBatch(
        eventIds,
        rejectedBy,
        reason,
        selectedCompany.id
      );
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-events'] });
      queryClient.invalidateQueries({ queryKey: ['event-consolidation'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });

      if (result.success) {
        toast.success(`${result.rejectedCount} eventos rejeitados com sucesso`);
      } else {
        toast.error(`Erro ao rejeitar eventos: ${result.errors.join(', ')}`);
      }
    },
    onError: (error) => {
      console.error('Erro ao rejeitar eventos em lote:', error);
      toast.error('Erro ao rejeitar eventos em lote');
    }
  });
}

/**
 * Hook para consolidar eventos
 */
export function useConsolidateEvents() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      // TODO: Implementar lógica de consolidação
      // Por enquanto, apenas simular o processo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        consolidatedCount: eventIds.length,
        errors: []
      };
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-events'] });
      queryClient.invalidateQueries({ queryKey: ['event-consolidation'] });

      if (result.success) {
        toast.success(`${result.consolidatedCount} eventos consolidados com sucesso`);
      } else {
        toast.error(`Erro ao consolidar eventos: ${result.errors.join(', ')}`);
      }
    },
    onError: (error) => {
      console.error('Erro ao consolidar eventos:', error);
      toast.error('Erro ao consolidar eventos');
    }
  });
}
