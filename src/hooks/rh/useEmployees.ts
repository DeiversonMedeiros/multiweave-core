import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeesService } from '@/services/rh/employeesService';
import { 
  Employee, 
  EmployeeInsert, 
  EmployeeUpdate,
  EmployeeFilters
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar funcionários
 */
export function useEmployees(filters?: EmployeeFilters) {
  const { selectedCompany } = useCompany();

  // Serializar filtros para garantir que a query key seja estável
  const filtersKey = filters ? JSON.stringify(filters) : 'no-filters';

  return useQuery({
    queryKey: ['rh', 'employees', selectedCompany?.id, filtersKey],
    queryFn: async () => {
      console.log('🔍 [useEmployees] Buscando funcionários com filtros:', filters);
      const result = await EmployeesService.list(selectedCompany?.id || '', filters);
      console.log('✅ [useEmployees] Resultado recebido:', {
        dataCount: result.data?.length || 0,
        count: result.count || 0
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 0, // Sempre considerar dados como stale para forçar refetch
    gcTime: 5 * 60 * 1000, // 5 minutos de cache
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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
    ...queryConfig.semiStatic,
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
    ...queryConfig.semiStatic,
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
    ...queryConfig.semiStatic,
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
    ...queryConfig.semiStatic,
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
    ...queryConfig.semiStatic,
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
      
      const [totalEmployeesResult, activeEmployees] = await Promise.all([
        EmployeesService.list(selectedCompany.id),
        EmployeesService.getActive(selectedCompany.id)
      ]);

      const totalEmployees = totalEmployeesResult.data || [];

      return {
        total: totalEmployees.length,
        active: activeEmployees.length,
        inactive: totalEmployees.length - activeEmployees.length
      };
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.dashboard,
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