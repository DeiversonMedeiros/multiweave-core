import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AbsenceTypesService } from '@/services/rh/absenceTypesService';
import { AbsenceType } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

export function useAbsenceTypes() {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['rh', 'absence_types', selectedCompany?.id],
    queryFn: () => AbsenceTypesService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAbsenceType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (data: Partial<AbsenceType>) => 
      AbsenceTypesService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'absence_types'] });
    },
  });
}

export function useUpdateAbsenceType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AbsenceType> }) => 
      AbsenceTypesService.update(id, data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'absence_types'] });
    },
  });
}

export function useDeleteAbsenceType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  return useMutation({
    mutationFn: (id: string) => 
      AbsenceTypesService.delete(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'absence_types'] });
    },
  });
}

export default useAbsenceTypes;

