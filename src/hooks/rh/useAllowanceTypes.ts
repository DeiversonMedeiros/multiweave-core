import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AllowanceTypesService } from '@/services/rh/allowanceTypesService';
import { AllowanceType } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export function useAllowanceTypes() {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['rh', 'allowance_types', selectedCompany?.id],
    queryFn: () => AllowanceTypesService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAllowanceType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (data: Partial<AllowanceType>) => 
      AllowanceTypesService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'allowance_types'] });
    },
  });
}

export function useUpdateAllowanceType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllowanceType> }) => 
      AllowanceTypesService.update(id, data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'allowance_types'] });
    },
  });
}

export function useDeleteAllowanceType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (id: string) => 
      AllowanceTypesService.delete(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'allowance_types'] });
    },
  });
}

export default useAllowanceTypes;

