import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeeShiftsService } from '@/services/rh/employeeShiftsService';
import { EmployeeShift } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar turnos de funcionários
 */
export function useEmployeeShifts() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employee_shifts', selectedCompany?.id],
    queryFn: () => EmployeeShiftsService.list(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar turno de funcionário por ID
 */
export function useEmployeeShift(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employee_shifts', id],
    queryFn: () => EmployeeShiftsService.getById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar turno de funcionário
 */
export function useCreateEmployeeShift() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: Partial<EmployeeShift>) => 
      EmployeeShiftsService.create(data, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'employee_shifts'] });
    },
    onError: (error) => {
      console.error('Erro ao criar turno de funcionário:', error);
    },
  });
}

/**
 * Hook para atualizar turno de funcionário
 */
export function useUpdateEmployeeShift() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmployeeShift> }) => 
      EmployeeShiftsService.update(id, data, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'employee_shifts'] });
      queryClient.setQueryData(['rh', 'employee_shifts', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar turno de funcionário:', error);
    },
  });
}

/**
 * Hook para excluir turno de funcionário
 */
export function useDeleteEmployeeShift() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      EmployeeShiftsService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'employee_shifts'] });
      queryClient.removeQueries({ queryKey: ['rh', 'employee_shifts', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir turno de funcionário:', error);
    },
  });
}

export default useEmployeeShifts;
