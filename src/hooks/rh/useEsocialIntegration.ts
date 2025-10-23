import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EsocialIntegrationService } from '@/services/rh/esocialIntegrationService';
import { EsocialIntegration } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export function useEsocialIntegrations() {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['rh', 'esocial_integrations', selectedCompany?.id],
    queryFn: () => EsocialIntegrationService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEsocialIntegration() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (data: Partial<EsocialIntegration>) => 
      EsocialIntegrationService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'esocial_integrations'] });
    },
  });
}

export function useUpdateEsocialIntegration() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EsocialIntegration> }) => 
      EsocialIntegrationService.update(id, data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'esocial_integrations'] });
    },
  });
}

export function useDeleteEsocialIntegration() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (id: string) => 
      EsocialIntegrationService.delete(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'esocial_integrations'] });
    },
  });
}

export default useEsocialIntegrations;

