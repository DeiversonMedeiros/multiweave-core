import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import type { OrdemProducao, OrdemProducaoInput } from '@/types/metalurgica';
import { EntityFilters } from '@/services/generic/entityService';

export function useOrdensProducao(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'ordens_producao', selectedCompany?.id, filters],
    queryFn: () => metalurgicaService.listOrdensProducao(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrdemProducao(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'ordens_producao', selectedCompany?.id, id],
    queryFn: () => metalurgicaService.getOrdemProducao(selectedCompany?.id || '', id),
    enabled: !!selectedCompany?.id && !!id,
  });
}

export function useCreateOrdemProducao() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: OrdemProducaoInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return await metalurgicaService.createOrdemProducao(selectedCompany.id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_producao'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'solicitacoes_materiais'] });
    },
  });
}

export function useUpdateOrdemProducao() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrdemProducaoInput> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.updateOrdemProducao(selectedCompany.id, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_producao'] });
    },
  });
}

export function useDeleteOrdemProducao() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.deleteOrdemProducao(selectedCompany.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_producao'] });
    },
  });
}

