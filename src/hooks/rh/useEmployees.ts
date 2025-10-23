import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeesService } from '@/services/rh/employeesService';
import { 
  Employee, 
  EmployeeInsert, 
  EmployeeUpdate 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar funcionários
 */
export function useEmployees() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', selectedCompany?.id],
    queryFn: async () => {
      const data = await EmployeesService.list(selectedCompany?.id || '');
      return { data };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar funcionário por ID
 */
export function useEmployee(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', id],
    queryFn: () => EmployeesService.getById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funcionário por user_id
 */
export function useEmployeeByUserId(userId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'by-user', userId],
    queryFn: async () => {
      try {
        return await EmployeesService.getByUserId(userId, selectedCompany?.id || '');
      } catch (error) {
        console.error('Erro ao buscar funcionário por user_id:', error);
        return null;
      }
    },
    enabled: !!userId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funcionários ativos
 */
export function useActiveEmployees() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'active', selectedCompany?.id],
    queryFn: () => EmployeesService.getActive(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funcionários por departamento
 */
export function useEmployeesByDepartment(departmentId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'by-department', departmentId],
    queryFn: () => EmployeesService.getByDepartment(departmentId, selectedCompany?.id || ''),
    enabled: !!departmentId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funcionários por cargo
 */
export function useEmployeesByPosition(positionId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'by-position', positionId],
    queryFn: () => EmployeesService.getByPosition(positionId, selectedCompany?.id || ''),
    enabled: !!positionId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para estatísticas de funcionários
 */
export function useEmployeeStats() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'stats', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return null;
      
      const [totalEmployees, activeEmployees] = await Promise.all([
        EmployeesService.list(selectedCompany.id),
        EmployeesService.getActive(selectedCompany.id)
      ]);

      return {
        total: totalEmployees.length,
        active: activeEmployees.length,
        inactive: totalEmployees.length - activeEmployees.length
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar funcionário
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (employee: EmployeeInsert) => 
      EmployeesService.create(employee, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
    },
    onError: (error) => {
      console.error('Erro ao criar funcionário:', error);
    },
  });
}

/**
 * Hook para atualizar funcionário
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, employee }: { id: string; employee: EmployeeUpdate }) => 
      EmployeesService.update(id, employee, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
      queryClient.setQueryData(['rh', 'employees', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar funcionário:', error);
    },
  });
}

/**
 * Hook para excluir funcionário
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      EmployeesService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
      queryClient.removeQueries({ queryKey: ['rh', 'employees', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir funcionário:', error);
    },
  });
}

export default useEmployees;