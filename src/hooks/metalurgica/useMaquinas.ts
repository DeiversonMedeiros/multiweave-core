import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import type { Maquina } from '@/types/metalurgica';
import { EntityFilters } from '@/services/generic/entityService';

export function useMaquinas(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'maquinas', selectedCompany?.id, filters],
    queryFn: () => metalurgicaService.listMaquinas(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateMaquina() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<Maquina>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.createMaquina(selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'maquinas'] });
    },
  });
}

export function useUpdateMaquina() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Maquina> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.updateMaquina(selectedCompany.id, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'maquinas'] });
    },
  });
}

