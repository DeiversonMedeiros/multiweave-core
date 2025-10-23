import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getEmployeeBenefitAssignments, 
  getEmployeeBenefitAssignmentById,
  createEmployeeBenefitAssignment,
  updateEmployeeBenefitAssignment,
  deleteEmployeeBenefitAssignment,
  validateBenefitAssignment,
  getEmployeeBenefits,
  getBenefitEmployees,
  calculateBenefitValue,
  EmployeeBenefitAssignmentFilters
} from '@/services/rh/employeeBenefitAssignmentsService';
import { EmployeeBenefitAssignment, EmployeeBenefitAssignmentCreateData, EmployeeBenefitAssignmentUpdateData } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS PARA VÍNCULOS FUNCIONÁRIO-BENEFÍCIO
// =====================================================

/**
 * Hook para buscar vínculos de benefícios
 */
export function useEmployeeBenefitAssignments(filters: EmployeeBenefitAssignmentFilters = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['employee-benefit-assignments', selectedCompany?.id, filters],
    queryFn: () => getEmployeeBenefitAssignments(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
  });
}

/**
 * Hook para buscar vínculo por ID
 */
export function useEmployeeBenefitAssignment(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['employee-benefit-assignment', id, selectedCompany?.id],
    queryFn: () => getEmployeeBenefitAssignmentById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
  });
}

/**
 * Hook para criar vínculo de benefício
 */
export function useCreateEmployeeBenefitAssignment() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: EmployeeBenefitAssignmentCreateData) => 
      createEmployeeBenefitAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefit-assignments', selectedCompany?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefits', selectedCompany?.id] 
      });
    },
  });
}

/**
 * Hook para atualizar vínculo de benefício
 */
export function useUpdateEmployeeBenefitAssignment() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeBenefitAssignmentUpdateData }) => 
      updateEmployeeBenefitAssignment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefit-assignments', selectedCompany?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefit-assignment', id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefits', selectedCompany?.id] 
      });
    },
  });
}

/**
 * Hook para excluir vínculo de benefício
 */
export function useDeleteEmployeeBenefitAssignment() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      deleteEmployeeBenefitAssignment(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefit-assignments', selectedCompany?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['employee-benefits', selectedCompany?.id] 
      });
    },
  });
}

/**
 * Hook para validar vínculo de benefício
 */
export function useValidateBenefitAssignment() {
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ 
      employeeId, 
      benefitConfigId, 
      excludeId 
    }: { 
      employeeId: string; 
      benefitConfigId: string; 
      excludeId?: string; 
    }) => 
      validateBenefitAssignment(
        employeeId, 
        benefitConfigId, 
        selectedCompany?.id || '', 
        excludeId
      ),
  });
}

/**
 * Hook para buscar benefícios de um funcionário
 */
export function useEmployeeBenefits(employeeId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['employee-benefits', employeeId, selectedCompany?.id],
    queryFn: () => getEmployeeBenefits(employeeId, selectedCompany?.id || ''),
    enabled: !!employeeId && !!selectedCompany?.id,
  });
}

/**
 * Hook para buscar funcionários de um benefício
 */
export function useBenefitEmployees(benefitConfigId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['benefit-employees', benefitConfigId, selectedCompany?.id],
    queryFn: () => getBenefitEmployees(benefitConfigId, selectedCompany?.id || ''),
    enabled: !!benefitConfigId && !!selectedCompany?.id,
  });
}

/**
 * Hook para calcular valor do benefício
 */
export function useCalculateBenefitValue() {
  return useMutation({
    mutationFn: ({ 
      assignment, 
      employeeSalary 
    }: { 
      assignment: EmployeeBenefitAssignment; 
      employeeSalary?: number; 
    }) => 
      calculateBenefitValue(assignment, employeeSalary),
  });
}

/**
 * Hook para estatísticas de vínculos
 */
export function useEmployeeBenefitAssignmentsStats() {
  const { selectedCompany } = useCompany();
  const { data: assignments } = useEmployeeBenefitAssignments();

  const stats = React.useMemo(() => {
    if (!assignments?.data) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byBenefitType: {},
        byEmployee: {},
      };
    }

    const data = assignments.data;
    const active = data.filter(a => a.is_active).length;
    const inactive = data.filter(a => !a.is_active).length;

    // Agrupar por tipo de benefício
    const byBenefitType = data.reduce((acc, assignment) => {
      const type = assignment.benefit_config?.benefit_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Agrupar por funcionário
    const byEmployee = data.reduce((acc, assignment) => {
      const employeeId = assignment.employee_id;
      acc[employeeId] = (acc[employeeId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: data.length,
      active,
      inactive,
      byBenefitType,
      byEmployee,
    };
  }, [assignments?.data]);

  return {
    data: stats,
    isLoading: !assignments,
  };
}
