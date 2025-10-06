import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayrollService } from '@/services/rh/payrollService';
import { Payroll, PayrollInsert, PayrollUpdate } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar folhas de pagamento
 */
export function usePayroll(params: {
  month?: number;
  year?: number;
  status?: string;
} = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'payroll', selectedCompany?.id, params],
    queryFn: () => PayrollService.list({
      ...params,
      companyId: selectedCompany?.id || ''
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar folha por ID
 */
export function usePayrollById(id: string) {
  return useQuery({
    queryKey: ['rh', 'payroll', id],
    queryFn: () => PayrollService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar folha por funcionário e período
 */
export function usePayrollByEmployee(employeeId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['rh', 'payroll', 'employee', employeeId, month, year],
    queryFn: () => PayrollService.getByEmployeeAndPeriod(employeeId, month, year),
    enabled: !!employeeId && !!month && !!year,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar estatísticas de folha
 */
export function usePayrollStats(month: number, year: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'payroll', 'stats', selectedCompany?.id, month, year],
    queryFn: () => PayrollService.getStats(selectedCompany?.id || '', month, year),
    enabled: !!selectedCompany?.id && !!month && !!year,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar folha de pagamento
 */
export function useCreatePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payroll: PayrollInsert) => PayrollService.create(payroll),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'payroll'] });
    },
    onError: (error) => {
      console.error('Erro ao criar folha de pagamento:', error);
    },
  });
}

/**
 * Hook para atualizar folha de pagamento
 */
export function useUpdatePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payroll }: { id: string; payroll: PayrollUpdate }) => 
      PayrollService.update(id, payroll),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'payroll'] });
      queryClient.setQueryData(['rh', 'payroll', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar folha de pagamento:', error);
    },
  });
}

/**
 * Hook para excluir folha de pagamento
 */
export function useDeletePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PayrollService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'payroll'] });
      queryClient.removeQueries({ queryKey: ['rh', 'payroll', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir folha de pagamento:', error);
    },
  });
}

// =====================================================
// HOOKS DE PROCESSAMENTO
// =====================================================

/**
 * Hook para processar folha de um funcionário
 */
export function useProcessEmployeePayroll() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ employeeId, month, year }: { 
      employeeId: string; 
      month: number; 
      year: number 
    }) => PayrollService.processEmployeePayroll({
      employeeId,
      month,
      year,
      companyId: selectedCompany?.id || ''
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'payroll'] });
    },
    onError: (error) => {
      console.error('Erro ao processar folha do funcionário:', error);
    },
  });
}

/**
 * Hook para processar folha de todos os funcionários
 */
export function useProcessAllPayroll() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => 
      PayrollService.processAllPayroll({
        companyId: selectedCompany?.id || '',
        month,
        year
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'payroll'] });
    },
    onError: (error) => {
      console.error('Erro ao processar folha de pagamento:', error);
    },
  });
}

export default usePayroll;
