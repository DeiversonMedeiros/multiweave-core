import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UnitsService } from '@/services/rh/unitsService';
import { 
  Unit, 
  UnitInsert, 
  UnitUpdate 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar departamentos
 */
export function useUnits() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'units', selectedCompany?.id],
    queryFn: () => UnitsService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar departamento por ID
 */
export function useUnit(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'units', id, selectedCompany?.id],
    queryFn: () => UnitsService.getById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar departamentos ativos
 */
export function useActiveUnits() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'units', 'active', selectedCompany?.id],
    queryFn: () => UnitsService.getActive(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar departamento
 */
export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unit: UnitInsert) => UnitsService.create(unit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'units'] });
    },
    onError: (error) => {
      console.error('Erro ao criar departamento:', error);
    },
  });
}

/**
 * Hook para atualizar departamento
 */
export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, unit }: { id: string; unit: UnitUpdate }) => 
      UnitsService.update(id, unit),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'units'] });
      queryClient.setQueryData(['rh', 'units', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar departamento:', error);
    },
  });
}

/**
 * Hook para excluir departamento
 */
export function useDeleteUnit() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => UnitsService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'units'] });
      queryClient.removeQueries({ queryKey: ['rh', 'units', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir departamento:', error);
    },
  });
}

/**
 * Hook para ativar/desativar departamento
 */
export function useToggleUnitStatus() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      UnitsService.toggleStatus(id, isActive, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'units'] });
      queryClient.setQueryData(['rh', 'units', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao alterar status do departamento:', error);
    },
  });
}

export default useUnits;
