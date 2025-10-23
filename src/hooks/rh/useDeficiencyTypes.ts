import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeficiencyTypesService } from '@/services/rh/deficiencyTypesService';
import { DeficiencyType } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export function useDeficiencyTypes() {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['rh', 'deficiency_types', selectedCompany?.id],
    queryFn: () => DeficiencyTypesService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDeficiencyType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (data: Partial<DeficiencyType>) => 
      DeficiencyTypesService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'deficiency_types'] });
    },
  });
}

export function useUpdateDeficiencyType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DeficiencyType> }) => 
      DeficiencyTypesService.update(id, data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'deficiency_types'] });
    },
  });
}

export function useDeleteDeficiencyType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (id: string) => 
      DeficiencyTypesService.delete(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'deficiency_types'] });
    },
  });
}

export default useDeficiencyTypes;

