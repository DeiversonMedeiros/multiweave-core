import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventConsolidationService } from '@/services/rh/eventConsolidationService';
import { EventConsolidation } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export function useEventConsolidations() {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['rh', 'event_consolidations', selectedCompany?.id],
    queryFn: () => EventConsolidationService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEventConsolidation() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (data: Partial<EventConsolidation>) => 
      EventConsolidationService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'event_consolidations'] });
    },
  });
}

export function useUpdateEventConsolidation() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventConsolidation> }) => 
      EventConsolidationService.update(id, data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'event_consolidations'] });
    },
  });
}

export function useDeleteEventConsolidation() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (id: string) => 
      EventConsolidationService.delete(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'event_consolidations'] });
    },
  });
}

export default useEventConsolidations;

