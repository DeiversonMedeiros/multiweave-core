import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CidCodesService } from '@/services/rh/cidCodesService';
import { CidCode } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export function useCidCodes() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'cid_codes', selectedCompany?.id],
    queryFn: () => CidCodesService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCidCode(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'cid_codes', id],
    queryFn: () => CidCodesService.getById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCidCode() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: Partial<CidCode>) => 
      CidCodesService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'cid_codes'] });
    },
  });
}

export function useUpdateCidCode() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CidCode> }) => 
      CidCodesService.update(id, data, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'cid_codes'] });
      queryClient.setQueryData(['rh', 'cid_codes', variables.id], data);
    },
  });
}

export function useDeleteCidCode() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      CidCodesService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'cid_codes'] });
      queryClient.removeQueries({ queryKey: ['rh', 'cid_codes', id] });
    },
  });
}

export default useCidCodes;

