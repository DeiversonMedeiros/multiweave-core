import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DependentsService } from '@/services/rh/dependentsService';
import { 
  Dependent, 
  DependentCreateData, 
  DependentUpdateData, 
  DependentFilters,
  DependentWithEmployee
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// HOOKS PARA DEPENDENTES
// =====================================================

/**
 * Hook para listar dependentes
 */
export function useDependents(filters?: DependentFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents', companyId, filters],
    queryFn: () => DependentsService.list(companyId, filters),
    enabled: !!companyId,
  });
}

/**
 * Hook para listar dependentes com informações do funcionário
 */
export function useDependentsWithEmployee(filters?: DependentFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-with-employee', companyId, filters],
    queryFn: () => DependentsService.listWithEmployee(companyId, filters),
    enabled: !!companyId,
  });
}

/**
 * Hook para buscar um dependente por ID
 */
export function useDependent(id: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependent', id, companyId],
    queryFn: () => DependentsService.getById(id, companyId),
    enabled: !!id && !!companyId,
  });
}

/**
 * Hook para buscar dependentes de um funcionário
 */
export function useDependentsByEmployee(employeeId: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-by-employee', employeeId, companyId],
    queryFn: () => DependentsService.getByEmployeeId(employeeId, companyId),
    enabled: !!employeeId && !!companyId,
  });
}

/**
 * Hook para buscar dependentes ativos de um funcionário
 */
export function useActiveDependentsByEmployee(employeeId: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['active-dependents-by-employee', employeeId, companyId],
    queryFn: () => DependentsService.getActiveByEmployeeId(employeeId, companyId),
    enabled: !!employeeId && !!companyId,
  });
}

/**
 * Hook para criar dependente
 */
export function useCreateDependent() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: DependentCreateData) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar um dependente.');
      }
      return DependentsService.create(data, companyId);
    },
    onSuccess: (newDependent) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['dependents', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependents-with-employee', companyId] });
      queryClient.invalidateQueries({ 
        queryKey: ['dependents-by-employee', newDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-dependents-by-employee', newDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ queryKey: ['dependent-stats', companyId] });

      toast({
        title: 'Sucesso',
        description: 'Dependente cadastrado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cadastrar dependente',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para atualizar dependente
 */
export function useUpdateDependent() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DependentUpdateData }) => 
      DependentsService.update(id, data, companyId),
    onSuccess: (updatedDependent) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['dependents', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependents-with-employee', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependent', updatedDependent.id, companyId] });
      queryClient.invalidateQueries({ 
        queryKey: ['dependents-by-employee', updatedDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-dependents-by-employee', updatedDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ queryKey: ['dependent-stats', companyId] });

      toast({
        title: 'Sucesso',
        description: 'Dependente atualizado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar dependente',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para deletar dependente (soft delete)
 */
export function useDeleteDependent() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => 
      DependentsService.delete(id, companyId, motivo),
    onSuccess: (_, { id }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['dependents', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependents-with-employee', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependent', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependent-stats', companyId] });

      toast({
        title: 'Sucesso',
        description: 'Dependente excluído com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir dependente',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para ativar dependente
 */
export function useActivateDependent() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => DependentsService.activate(id, companyId),
    onSuccess: (activatedDependent) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['dependents', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependents-with-employee', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependent', activatedDependent.id, companyId] });
      queryClient.invalidateQueries({ 
        queryKey: ['dependents-by-employee', activatedDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-dependents-by-employee', activatedDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ queryKey: ['dependent-stats', companyId] });

      toast({
        title: 'Sucesso',
        description: 'Dependente ativado com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao ativar dependente',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para suspender dependente
 */
export function useSuspendDependent() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => 
      DependentsService.suspend(id, companyId, motivo),
    onSuccess: (suspendedDependent) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['dependents', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependents-with-employee', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dependent', suspendedDependent.id, companyId] });
      queryClient.invalidateQueries({ 
        queryKey: ['dependents-by-employee', suspendedDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-dependents-by-employee', suspendedDependent.employee_id, companyId] 
      });
      queryClient.invalidateQueries({ queryKey: ['dependent-stats', companyId] });

      toast({
        title: 'Sucesso',
        description: 'Dependente suspenso com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao suspender dependente',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook para buscar dependentes por parentesco
 */
export function useDependentsByParentesco(parentesco: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-by-parentesco', parentesco, companyId],
    queryFn: () => DependentsService.getByParentesco(parentesco, companyId),
    enabled: !!parentesco && !!companyId,
  });
}

/**
 * Hook para buscar dependentes com deficiência
 */
export function useDependentsWithDeficiency() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-with-deficiency', companyId],
    queryFn: () => DependentsService.getWithDeficiency(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para buscar dependentes que necessitam cuidados especiais
 */
export function useDependentsWithSpecialCare() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-with-special-care', companyId],
    queryFn: () => DependentsService.getWithSpecialCare(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para buscar dependentes por faixa etária
 */
export function useDependentsByAgeRange(minAge: number, maxAge: number) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-by-age-range', minAge, maxAge, companyId],
    queryFn: () => DependentsService.getByAgeRange(minAge, maxAge, companyId),
    enabled: !!companyId && minAge >= 0 && maxAge >= minAge,
  });
}

/**
 * Hook para buscar dependentes que fazem aniversário em um mês específico
 */
export function useDependentsByBirthMonth(month: number) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependents-by-birth-month', month, companyId],
    queryFn: () => DependentsService.getByBirthMonth(month, companyId),
    enabled: !!companyId && month >= 1 && month <= 12,
  });
}

/**
 * Hook para buscar dependentes que vão fazer aniversário nos próximos N dias
 */
export function useUpcomingBirthdays(days: number = 30) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['upcoming-birthdays', days, companyId],
    queryFn: () => DependentsService.getUpcomingBirthdays(days, companyId),
    enabled: !!companyId && days > 0,
  });
}

/**
 * Hook para contar dependentes por funcionário
 */
export function useDependentCountByEmployee(employeeId: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependent-count-by-employee', employeeId, companyId],
    queryFn: () => DependentsService.countByEmployee(employeeId, companyId),
    enabled: !!employeeId && !!companyId,
  });
}

/**
 * Hook para buscar estatísticas de dependentes
 */
export function useDependentStats() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependent-stats', companyId],
    queryFn: () => DependentsService.getStats(companyId),
    enabled: !!companyId,
  });
}

/**
 * Hook para validar se um CPF já está cadastrado
 */
export function useValidateCpf() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useMutation({
    mutationFn: ({ cpf, excludeId }: { cpf: string; excludeId?: string }) => 
      DependentsService.isCpfAlreadyRegistered(cpf, companyId, excludeId),
  });
}

/**
 * Hook para buscar dependente por CPF
 */
export function useDependentByCpf(cpf: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['dependent-by-cpf', cpf, companyId],
    queryFn: () => DependentsService.getByCpf(cpf, companyId),
    enabled: !!cpf && !!companyId,
  });
}

/**
 * Hook personalizado para gerenciar estado de dependentes
 */
export function useDependentManagement(employeeId?: string) {
  const [filters, setFilters] = useState<DependentFilters>({});
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Queries - usar useDependentsWithEmployee para incluir informações do funcionário
  const dependentsQuery = useDependentsWithEmployee(filters);
  const dependentsByEmployeeQuery = employeeId ? useDependentsByEmployee(employeeId) : null;
  const statsQuery = useDependentStats();

  // Mutations
  const createMutation = useCreateDependent();
  const updateMutation = useUpdateDependent();
  const deleteMutation = useDeleteDependent();
  const activateMutation = useActivateDependent();
  const suspendMutation = useSuspendDependent();

  // Funções de controle
  const handleCreate = (data: DependentCreateData) => {
    createMutation.mutate(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdate = (id: string, data: DependentUpdateData) => {
    updateMutation.mutate({ id, data });
    setIsEditModalOpen(false);
    setSelectedDependent(null);
  };

  const handleDelete = (id: string, motivo?: string) => {
    deleteMutation.mutate({ id, motivo });
    setIsDeleteModalOpen(false);
    setSelectedDependent(null);
  };

  const handleActivate = (id: string) => {
    activateMutation.mutate(id);
  };

  const handleSuspend = (id: string, motivo?: string) => {
    suspendMutation.mutate({ id, motivo });
  };

  const openCreateModal = () => {
    setSelectedDependent(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedDependent(null);
  };

  return {
    // Estado
    filters,
    selectedDependent,
    isCreateModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    
    // Queries
    dependents: dependentsQuery.data || [],
    dependentsByEmployee: dependentsByEmployeeQuery?.data || [],
    stats: statsQuery.data,
    isLoading: dependentsQuery.isLoading || statsQuery.isLoading,
    isError: dependentsQuery.isError || statsQuery.isError,
    
    // Mutations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isActivating: activateMutation.isPending,
    isSuspending: suspendMutation.isPending,
    
    // Funções
    setFilters,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleActivate,
    handleSuspend,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModals,
  };
}
