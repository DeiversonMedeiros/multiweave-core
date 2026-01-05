import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import type { Inspecao, InspecaoInput } from '@/types/metalurgica';
import { EntityFilters } from '@/services/generic/entityService';

export function useInspecoes(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'inspecoes', selectedCompany?.id, filters],
    queryFn: () => metalurgicaService.listInspecoes(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateInspecao() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: InspecaoInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.createInspecao(selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'inspecoes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'lotes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'certificados'] });
    },
  });
}

