import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BankHoursAssignmentsService } from '@/services/rh/bankHoursAssignmentsService';
import { 
  BankHoursAssignment, 
  BankHoursAssignmentForm,
  BankHoursAssignmentSummary
} from '@/integrations/supabase/bank-hours-types-v2';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar vínculos de banco de horas
 */
export function useBankHoursAssignments() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-assignments', selectedCompany?.id],
    queryFn: async () => {
      const data = await BankHoursAssignmentsService.list(selectedCompany?.id || '');
      return { data };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar vínculo de um funcionário
 */
export function useBankHoursAssignmentByEmployee(employeeId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-assignments', 'by-employee', employeeId],
    queryFn: () => BankHoursAssignmentsService.getByEmployee(employeeId, selectedCompany?.id || ''),
    enabled: !!employeeId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar vínculos de um tipo
 */
export function useBankHoursAssignmentsByType(typeId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-assignments', 'by-type', typeId],
    queryFn: () => BankHoursAssignmentsService.getByType(typeId, selectedCompany?.id || ''),
    enabled: !!typeId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para funcionários sem vínculo
 */
export function useUnassignedEmployees() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-assignments', 'unassigned', selectedCompany?.id],
    queryFn: () => BankHoursAssignmentsService.getUnassignedEmployees(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para resumo dos vínculos
 */
export function useBankHoursAssignmentsSummary() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-assignments', 'summary', selectedCompany?.id],
    queryFn: () => BankHoursAssignmentsService.getSummary(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar vínculo de banco de horas
 */
export function useCreateBankHoursAssignment() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (assignment: BankHoursAssignmentForm) => 
      BankHoursAssignmentsService.create(assignment, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
    },
    onError: (error) => {
      console.error('Erro ao criar vínculo de banco de horas:', error);
    },
  });
}

/**
 * Hook para atualizar vínculo de banco de horas
 */
export function useUpdateBankHoursAssignment() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, assignment }: { id: string; assignment: Partial<BankHoursAssignmentForm> }) => 
      BankHoursAssignmentsService.update(id, assignment, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-assignments'] });
      queryClient.setQueryData(['rh', 'bank-hours-assignments', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar vínculo de banco de horas:', error);
    },
  });
}

/**
 * Hook para excluir vínculo de banco de horas
 */
export function useDeleteBankHoursAssignment() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      BankHoursAssignmentsService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-assignments'] });
      queryClient.removeQueries({ queryKey: ['rh', 'bank-hours-assignments', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir vínculo de banco de horas:', error);
    },
  });
}

/**
 * Hook para atribuir tipo padrão a funcionários
 */
export function useAssignDefaultType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (employeeIds: string[]) => 
      BankHoursAssignmentsService.assignDefaultType(employeeIds, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
    },
    onError: (error) => {
      console.error('Erro ao atribuir tipo padrão:', error);
    },
  });
}

/**
 * Hook para atribuir um tipo específico de banco de horas a funcionários em lote
 */
export function useAssignType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ employeeIds, typeId }: { employeeIds: string[]; typeId: string }) => 
      BankHoursAssignmentsService.assignType(employeeIds, typeId, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
    },
    onError: (error) => {
      console.error('Erro ao atribuir tipo de banco de horas:', error);
    },
  });
}

export default useBankHoursAssignments;
