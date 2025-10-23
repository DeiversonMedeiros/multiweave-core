import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { ESocialEvent, ESocialEventFilters } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// QUERY KEYS
// =====================================================

const queryKeys = {
  all: ['esocial-events'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (companyId: string, filters: ESocialEventFilters) => [...queryKeys.lists(), companyId, filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.details(), id] as const,
  batches: () => [...queryKeys.all, 'batches'] as const,
  batch: (companyId: string) => [...queryKeys.batches(), companyId] as const,
};

// =====================================================
// HOOKS PRINCIPAIS
// =====================================================

export function useESocialEvents(filters: ESocialEventFilters = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: queryKeys.list(selectedCompany?.id || '', filters),
    queryFn: async () => {
      if (!selectedCompany?.id) return { data: [], totalCount: 0 };
      
      const result = await EntityService.list<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        filters,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      return result;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useESocialEvent(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: async () => {
      if (!selectedCompany?.id || !id) return null;
      
      const result = await EntityService.list<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      return result.data[0] || null;
    },
    enabled: !!selectedCompany?.id && !!id,
  });
}

export function useESocialBatches() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: queryKeys.batch(selectedCompany?.id || ''),
    queryFn: async () => {
      if (!selectedCompany?.id) return { data: [], totalCount: 0 };
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'esocial_batches',
        companyId: selectedCompany.id,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      return result;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useCreateESocialEvent() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<ESocialEvent>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.create<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        data: {
          ...data,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}

export function useUpdateESocialEvent() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ESocialEvent> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.update<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        id,
        data: {
          ...data,
          updated_at: new Date().toISOString(),
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}

export function useDeleteESocialEvent() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.delete({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}

export function useSendToESocial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      // Simular envio para eSocial
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar status do evento
      return await EntityService.update<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        id: eventId,
        data: {
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}

export function useProcessESocialEvents() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: { period: string; employeeIds?: string[] }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      // Simular processamento de eventos eSocial
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Aqui seria implementada a lógica real de processamento
      // Por enquanto, vamos simular a criação de alguns eventos
      const mockEvents = [
        {
          tipo_evento: 'S-1000',
          codigo_evento: 'S1000-001',
          descricao: 'Informações do Empregador/Contribuinte',
          status: 'pending',
          period: data.period,
        },
        {
          tipo_evento: 'S-1200',
          codigo_evento: 'S1200-001',
          descricao: 'Remuneração RGPS',
          status: 'pending',
          period: data.period,
        }
      ];

      // Criar eventos simulados
      for (const event of mockEvents) {
        await EntityService.create<ESocialEvent>({
          schema: 'rh',
          table: 'esocial_events',
          companyId: selectedCompany.id,
          data: {
            ...event,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        });
      }
      
      return { processed: mockEvents.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
    },
  });
}

// =====================================================
// HOOKS DE ESTATÍSTICAS
// =====================================================

export function useESocialStats() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['esocial-stats', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return null;
      
      // Buscar estatísticas dos eventos
      const eventsResult = await EntityService.list<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: selectedCompany.id,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      const events = eventsResult.data;
      
      // Calcular estatísticas
      const stats = {
        total: events.length,
        pending: events.filter(e => e.status === 'pending').length,
        sent: events.filter(e => e.status === 'sent').length,
        accepted: events.filter(e => e.status === 'accepted').length,
        rejected: events.filter(e => e.status === 'rejected').length,
        error: events.filter(e => e.status === 'error').length,
        byType: events.reduce((acc, event) => {
          acc[event.tipo_evento] = (acc[event.tipo_evento] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return stats;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}