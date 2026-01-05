import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import type { Produto, ProdutoInput } from '@/types/metalurgica';
import { EntityFilters } from '@/services/generic/entityService';

export function useProdutos(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'produtos', selectedCompany?.id, filters],
    queryFn: () => metalurgicaService.listProdutos(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduto(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'produtos', selectedCompany?.id, id],
    queryFn: () => metalurgicaService.getProduto(selectedCompany?.id || '', id),
    enabled: !!selectedCompany?.id && !!id,
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: ProdutoInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.createProduto(selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'produtos'] });
    },
  });
}

export function useUpdateProduto() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProdutoInput> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.updateProduto(selectedCompany.id, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'produtos'] });
    },
  });
}

export function useDeleteProduto() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.deleteProduto(selectedCompany.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'produtos'] });
    },
  });
}

