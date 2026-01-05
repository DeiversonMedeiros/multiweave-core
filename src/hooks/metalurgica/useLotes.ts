import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import type { Lote, LoteInput } from '@/types/metalurgica';
import { EntityFilters } from '@/services/generic/entityService';

export function useLotes(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'lotes', selectedCompany?.id, filters],
    queryFn: () => metalurgicaService.listLotes(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateLote() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: LoteInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.createLote(selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'lotes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_producao'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_servico'] });
    },
  });
}

export function useUpdateLote() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LoteInput> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.updateLote(selectedCompany.id, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'lotes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_producao'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_servico'] });
    },
  });
}

