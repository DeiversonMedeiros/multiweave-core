import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCompany } from '@/lib/company-context';
import {
  materialKitsService,
  CreateMaterialKitInput,
  UpdateMaterialKitInput,
  MaterialKitWithItems,
} from '@/services/compras/materialKitsService';

const QUERY_KEY = ['compras', 'kits-materiais'];

export function useMaterialKits(ativo?: boolean) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: [...QUERY_KEY, selectedCompany?.id, ativo],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      const result = await materialKitsService.list(selectedCompany.id, ativo !== undefined ? { ativo } : undefined);
      return result.data ?? [];
    },
    enabled: !!selectedCompany?.id,
  });
}

export function useMaterialKitWithItems(kitId: string | null) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: [...QUERY_KEY, 'detail', selectedCompany?.id, kitId],
    queryFn: async (): Promise<MaterialKitWithItems | null> => {
      if (!selectedCompany?.id || !kitId) return null;
      return materialKitsService.getKitWithItems(selectedCompany.id, kitId);
    },
    enabled: !!selectedCompany?.id && !!kitId,
  });
}

export function useCreateMaterialKit() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (input: CreateMaterialKitInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return materialKitsService.create(selectedCompany.id, input);
    },
    onSuccess: () => {
      toast.success('Kit criado com sucesso');
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar kit');
    },
  });
}

export function useUpdateMaterialKit() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ kitId, input }: { kitId: string; input: UpdateMaterialKitInput }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return materialKitsService.update(selectedCompany.id, kitId, input);
    },
    onSuccess: () => {
      toast.success('Kit atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar kit');
    },
  });
}

export function useDeleteMaterialKit() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (kitId: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return materialKitsService.delete(selectedCompany.id, kitId);
    },
    onSuccess: () => {
      toast.success('Kit excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir kit');
    },
  });
}

/** Retorna itens do kit prontos para adicionar à requisição (com quantidades já multiplicadas) */
export function useKitItemsForRequisition(kitId: string | null, quantidadeKits: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: [...QUERY_KEY, 'requisition-items', selectedCompany?.id, kitId, quantidadeKits],
    queryFn: async () => {
      if (!selectedCompany?.id || !kitId || quantidadeKits < 1) return [];
      return materialKitsService.getKitItemsForRequisition(
        selectedCompany.id,
        kitId,
        quantidadeKits
      );
    },
    enabled: !!selectedCompany?.id && !!kitId && quantidadeKits >= 1,
  });
}
