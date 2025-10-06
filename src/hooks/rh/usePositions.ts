import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PositionsService } from '@/services/rh/positionsService';
import { 
  Position, 
  PositionInsert, 
  PositionUpdate 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar cargos
 */
export function usePositions() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'positions', selectedCompany?.id],
    queryFn: () => PositionsService.list({ 
      companyId: selectedCompany?.id || ''
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar cargo por ID
 */
export function usePosition(id: string) {
  return useQuery({
    queryKey: ['rh', 'positions', id],
    queryFn: () => PositionsService.getById(id),
    enabled: !!id,
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
    queryFn: () => PositionsService.getActive(selectedCompany?.id || ''),
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

  return useMutation({
    mutationFn: (position: PositionInsert) => PositionsService.create(position),
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

  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: PositionUpdate }) => 
      PositionsService.update(id, position),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
      queryClient.setQueryData(['rh', 'positions', variables.id], data);
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

  return useMutation({
    mutationFn: (id: string) => PositionsService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
      queryClient.removeQueries({ queryKey: ['rh', 'positions', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir cargo:', error);
    },
  });
}

/**
 * Hook para ativar/desativar cargo
 */
export function useTogglePositionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      PositionsService.toggleStatus(id, isActive),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'positions'] });
      queryClient.setQueryData(['rh', 'positions', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao alterar status do cargo:', error);
    },
  });
}

export default usePositions;
