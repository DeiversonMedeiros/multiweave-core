import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import type { OrdemServico, OrdemServicoInput } from '@/types/metalurgica';
import { EntityFilters } from '@/services/generic/entityService';

export function useOrdensServico(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'ordens_servico', selectedCompany?.id, filters],
    queryFn: () => metalurgicaService.listOrdensServico(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateOrdemServico() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: OrdemServicoInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return await metalurgicaService.createOrdemServico(selectedCompany.id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_servico'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'solicitacoes_materiais'] });
    },
  });
}

export function useUpdateOrdemServico() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrdemServicoInput> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await metalurgicaService.updateOrdemServico(selectedCompany.id, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'ordens_servico'] });
    },
  });
}

