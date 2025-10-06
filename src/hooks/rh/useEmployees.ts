import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmployeesService } from '@/services/rh/employeesService';
import { 
  Employee, 
  EmployeeInsert, 
  EmployeeUpdate, 
  EmployeeFilters 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar funcionários
 */
export function useEmployees(filters?: EmployeeFilters, page?: number, pageSize?: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', selectedCompany?.id, filters, page, pageSize],
    queryFn: () => EmployeesService.list({ 
      companyId: selectedCompany?.id || '', 
      filters, 
      page, 
      pageSize 
    }),
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
    queryKey: ['rh', 'employees', 'department', departmentId, selectedCompany?.id],
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
    queryKey: ['rh', 'employees', 'position', positionId, selectedCompany?.id],
    queryFn: () => EmployeesService.getByPosition(positionId, selectedCompany?.id || ''),
    enabled: !!positionId && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funcionário por CPF
 */
export function useEmployeeByCpf(cpf: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'cpf', cpf, selectedCompany?.id],
    queryFn: () => EmployeesService.getByCpf(cpf, selectedCompany?.id || ''),
    enabled: !!cpf && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar funcionário por matrícula
 */
export function useEmployeeByMatricula(matricula: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'matricula', matricula, selectedCompany?.id],
    queryFn: () => EmployeesService.getByMatricula(matricula, selectedCompany?.id || ''),
    enabled: !!matricula && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar estatísticas dos funcionários
 */
export function useEmployeeStats() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'stats', selectedCompany?.id],
    queryFn: () => EmployeesService.getStats(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
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

  return useMutation({
    mutationFn: (employee: EmployeeInsert) => EmployeesService.create(employee),
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees', 'stats'] });
      
      // Adicionar o novo funcionário ao cache
      queryClient.setQueryData(['rh', 'employees', data.id], data);
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

  return useMutation({
    mutationFn: ({ id, employee }: { id: string; employee: EmployeeUpdate }) => 
      EmployeesService.update(id, employee, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees', 'stats'] });
      
      // Atualizar o funcionário no cache
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

  return useMutation({
    mutationFn: (id: string) => EmployeesService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees', 'stats'] });
      
      // Remover o funcionário do cache
      queryClient.removeQueries({ queryKey: ['rh', 'employees', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir funcionário:', error);
    },
  });
}

/**
 * Hook para alterar status do funcionário
 */
export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' | 'afastado' | 'demitido' }) => 
      EmployeesService.toggleStatus(id, status, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'employees', 'stats'] });
      
      // Atualizar o funcionário no cache
      queryClient.setQueryData(['rh', 'employees', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao alterar status do funcionário:', error);
    },
  });
}

// =====================================================
// HOOKS DE VALIDAÇÃO
// =====================================================

/**
 * Hook para validar CPF
 */
export function useValidateCpf() {
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ cpf, excludeId }: { cpf: string; excludeId?: string }) => 
      EmployeesService.validateCpf(cpf, selectedCompany?.id || '', excludeId),
    onError: (error) => {
      console.error('Erro ao validar CPF:', error);
    },
  });
}

/**
 * Hook para validar matrícula
 */
export function useValidateMatricula() {
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ matricula, excludeId }: { matricula: string; excludeId?: string }) => 
      EmployeesService.validateMatricula(matricula, selectedCompany?.id || '', excludeId),
    onError: (error) => {
      console.error('Erro ao validar matrícula:', error);
    },
  });
}

/**
 * Hook para gerar próxima matrícula
 */
export function useGenerateNextMatricula() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'next-matricula', selectedCompany?.id],
    queryFn: () => EmployeesService.generateNextMatricula(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE UTILIDADE
// =====================================================

/**
 * Hook para buscar funcionários com filtros em tempo real
 */
export function useEmployeesWithFilters(filters: EmployeeFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'filtered', selectedCompany?.id, filters],
    queryFn: () => EmployeesService.list({ 
      companyId: selectedCompany?.id || '', 
      filters 
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar funcionários com paginação
 */
export function useEmployeesWithPagination(
  filters?: EmployeeFilters, 
  page: number = 1, 
  pageSize: number = 10
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'employees', 'paginated', selectedCompany?.id, filters, page, pageSize],
    queryFn: () => EmployeesService.list({ 
      companyId: selectedCompany?.id || '', 
      filters, 
      page, 
      pageSize 
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export default useEmployees;
