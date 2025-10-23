import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Position } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar cargos/posições
 */
export function usePositions() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'positions', selectedCompany?.id],
    queryFn: () => useRHData('positions', selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar cargo por ID
 */
export function usePosition(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'positions', id],
    queryFn: () => useRHData('positions', selectedCompany?.id || '', { id }),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar cargos ativos
 */
export function useActivePositions() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'positions', 'active', selectedCompany?.id],
    queryFn: () => useRHData('positions', selectedCompany?.id || '', { is_active: true }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar cargos por nível hierárquico
 */
export function usePositionsByLevel(level: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'positions', 'level', level, selectedCompany?.id],
    queryFn: () => useRHData('positions', selectedCompany?.id || '', { nivel_hierarquico: level }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar cargo
 */
export function useCreatePosition() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (position: Omit<Position, 'id' | 'created_at' | 'updated_at'>) => 
      useCreateEntity('rh', 'positions')(position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
    },
    onError: (error) => {
      console.error('Erro ao criar cargo:', error);
    },
  });
}

/**
 * Hook para atualizar cargo
 */
export function useUpdatePosition() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Position> }) => 
      useUpdateEntity('rh', 'positions')({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar cargo:', error);
    },
  });
}

/**
 * Hook para excluir cargo
 */
export function useDeletePosition() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      useDeleteEntity('rh', 'positions')(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir cargo:', error);
    },
  });
}

/**
 * Hook para alterar status do cargo
 */
export function useChangePositionStatus() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      useUpdateEntity('rh', 'positions')({ 
        id, 
        data: { is_active } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
    },
    onError: (error) => {
      console.error('Erro ao alterar status do cargo:', error);
    },
  });
}