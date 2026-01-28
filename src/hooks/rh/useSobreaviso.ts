import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SobreavisoService } from '@/services/rh/sobreavisoService';
import { SobreavisoEscala } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Lista escalas de sobreaviso da empresa
 */
export function useSobreavisoEscalas() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'sobreaviso_escalas', selectedCompany?.id],
    queryFn: () => SobreavisoService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Busca escala de sobreaviso por ID
 */
export function useSobreavisoEscala(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'sobreaviso_escalas', id],
    queryFn: () =>
      SobreavisoService.getById(id!, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Criar escala de sobreaviso
 */
export function useCreateSobreavisoEscala() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: Partial<SobreavisoEscala>) =>
      SobreavisoService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'sobreaviso_escalas'] });
    },
    onError: (error) => {
      console.error('Erro ao criar escala de sobreaviso:', error);
    },
  });
}

/**
 * Atualizar escala de sobreaviso
 */
export function useUpdateSobreavisoEscala() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SobreavisoEscala>;
    }) =>
      SobreavisoService.update(id, data, selectedCompany?.id || ''),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'sobreaviso_escalas'] });
      queryClient.setQueryData(
        ['rh', 'sobreaviso_escalas', variables.id],
        (prev: SobreavisoEscala | undefined) =>
          prev ? { ...prev, ...variables.data } : undefined
      );
    },
    onError: (error) => {
      console.error('Erro ao atualizar escala de sobreaviso:', error);
    },
  });
}

/**
 * Excluir escala de sobreaviso
 */
export function useDeleteSobreavisoEscala() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) =>
      SobreavisoService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'sobreaviso_escalas'] });
      queryClient.removeQueries({ queryKey: ['rh', 'sobreaviso_escalas', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir escala de sobreaviso:', error);
    },
  });
}
