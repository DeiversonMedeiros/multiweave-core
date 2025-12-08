// =====================================================
// HOOKS PARA CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getMedicalAgreements,
  getMedicalAgreementById,
  createMedicalAgreement,
  updateMedicalAgreement,
  deleteMedicalAgreement,
  getMedicalPlans,
  getMedicalPlanById,
  createMedicalPlan,
  updateMedicalPlan,
  deleteMedicalPlan,
  getEmployeeMedicalPlans,
  getEmployeeMedicalPlanById,
  createEmployeeMedicalPlan,
  updateEmployeeMedicalPlan,
  deleteEmployeeMedicalPlan,
  getEmployeePlanDependents,
  getEmployeePlanDependentById,
  createEmployeePlanDependent,
  updateEmployeePlanDependent,
  deleteEmployeePlanDependent,
  getMedicalPlanPricingHistory,
  createMedicalPlanPricingHistory,
  getMedicalAgreementsStats,
  getMedicalPlanAgeRanges,
  getMedicalPlanAgeRangeById,
  createMedicalPlanAgeRange,
  updateMedicalPlanAgeRange,
  deleteMedicalPlanAgeRange,
  getPlanValueByAge,
  calculateAge,
} from '@/services/rh/medicalAgreementsService';
import {
  MedicalAgreement,
  MedicalAgreementCreateData,
  MedicalAgreementUpdateData,
  MedicalAgreementFilters,
  MedicalPlan,
  MedicalPlanCreateData,
  MedicalPlanUpdateData,
  MedicalPlanFilters,
  EmployeeMedicalPlan,
  EmployeeMedicalPlanCreateData,
  EmployeeMedicalPlanUpdateData,
  EmployeeMedicalPlanFilters,
  EmployeePlanDependent,
  EmployeePlanDependentCreateData,
  EmployeePlanDependentUpdateData,
  EmployeePlanDependentFilters,
  MedicalPlanPricingHistory,
  MedicalPlanPricingHistoryCreateData,
  MedicalPlanPricingHistoryFilters,
  MedicalPlanAgeRange,
  MedicalPlanAgeRangeCreateData,
  MedicalPlanAgeRangeUpdateData,
  MedicalPlanAgeRangeFilters,
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

const getQueryKey = (entity: string, companyId: string, filters?: any) => [entity, companyId, filters];

// =====================================================
// CONVÊNIOS MÉDICOS
// =====================================================

export function useMedicalAgreements(filters?: MedicalAgreementFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalAgreement[], Error>({
    queryKey: getQueryKey('medicalAgreements', companyId, filters),
    queryFn: () => getMedicalAgreements(companyId, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useMedicalAgreement(id: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalAgreement, Error>({
    queryKey: getQueryKey('medicalAgreement', companyId, { id }),
    queryFn: () => getMedicalAgreementById(companyId, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateMedicalAgreement() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalAgreement, Error, Omit<MedicalAgreementCreateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalAgreementCreateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar um convênio médico.');
      }
      return createMedicalAgreement(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalAgreements', companyId) });
      toast.success('Convênio médico criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar convênio médico.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateMedicalAgreement() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalAgreement, Error, Omit<MedicalAgreementUpdateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalAgreementUpdateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de atualizar um convênio médico.');
      }
      return updateMedicalAgreement(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalAgreements', companyId) });
      toast.success('Convênio médico atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar convênio médico.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteMedicalAgreement() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de excluir um convênio médico.');
      }
      return deleteMedicalAgreement(companyId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalAgreements', companyId) });
      toast.success('Convênio médico excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir convênio médico.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// PLANOS MÉDICOS
// =====================================================

export function useMedicalPlans(filters?: MedicalPlanFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalPlan[], Error>({
    queryKey: getQueryKey('medicalPlans', companyId, filters),
    queryFn: () => getMedicalPlans(companyId, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useMedicalPlan(id: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalPlan, Error>({
    queryKey: getQueryKey('medicalPlan', companyId, { id }),
    queryFn: () => getMedicalPlanById(companyId, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateMedicalPlan() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalPlan, Error, Omit<MedicalPlanCreateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalPlanCreateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar um plano médico.');
      }
      return createMedicalPlan(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Plano médico criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar plano médico.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateMedicalPlan() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalPlan, Error, Omit<MedicalPlanUpdateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalPlanUpdateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de atualizar um plano médico.');
      }
      return updateMedicalPlan(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Plano médico atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar plano médico.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteMedicalPlan() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de excluir um plano médico.');
      }
      return deleteMedicalPlan(companyId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Plano médico excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir plano médico.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// ADESÕES DOS FUNCIONÁRIOS
// =====================================================

export function useEmployeeMedicalPlans(filters?: EmployeeMedicalPlanFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<EmployeeMedicalPlan[], Error>({
    queryKey: getQueryKey('employeeMedicalPlans', companyId, filters),
    queryFn: () => getEmployeeMedicalPlans(companyId, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useEmployeeMedicalPlan(id: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<EmployeeMedicalPlan, Error>({
    queryKey: getQueryKey('employeeMedicalPlan', companyId, { id }),
    queryFn: () => getEmployeeMedicalPlanById(companyId, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEmployeeMedicalPlan() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<EmployeeMedicalPlan, Error, Omit<EmployeeMedicalPlanCreateData, 'company_id'>>({
    mutationFn: (data: Omit<EmployeeMedicalPlanCreateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar uma adesão médica.');
      }
      return createEmployeeMedicalPlan(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeMedicalPlans', companyId) });
      toast.success('Adesão médica criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar adesão médica.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateEmployeeMedicalPlan() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<EmployeeMedicalPlan, Error, Omit<EmployeeMedicalPlanUpdateData, 'company_id'>>({
    mutationFn: (data: Omit<EmployeeMedicalPlanUpdateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de atualizar uma adesão médica.');
      }
      return updateEmployeeMedicalPlan(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeMedicalPlans', companyId) });
      toast.success('Adesão médica atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar adesão médica.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteEmployeeMedicalPlan() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de excluir uma adesão médica.');
      }
      return deleteEmployeeMedicalPlan(companyId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeMedicalPlans', companyId) });
      toast.success('Adesão médica excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir adesão médica.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// DEPENDENTES DOS PLANOS
// =====================================================

export function useEmployeePlanDependents(filters?: EmployeePlanDependentFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<EmployeePlanDependent[], Error>({
    queryKey: getQueryKey('employeePlanDependents', companyId, filters),
    queryFn: () => getEmployeePlanDependents(companyId, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useEmployeePlanDependent(id: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<EmployeePlanDependent, Error>({
    queryKey: getQueryKey('employeePlanDependent', companyId, { id }),
    queryFn: () => getEmployeePlanDependentById(companyId, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEmployeePlanDependent() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<EmployeePlanDependent, Error, Omit<EmployeePlanDependentCreateData, 'company_id'>>({
    mutationFn: (data: Omit<EmployeePlanDependentCreateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar um dependente.');
      }
      return createEmployeePlanDependent(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeePlanDependents', companyId) });
      toast.success('Dependente criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar dependente.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateEmployeePlanDependent() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<EmployeePlanDependent, Error, Omit<EmployeePlanDependentUpdateData, 'company_id'>>({
    mutationFn: (data: Omit<EmployeePlanDependentUpdateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de atualizar um dependente.');
      }
      return updateEmployeePlanDependent(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeePlanDependents', companyId) });
      toast.success('Dependente atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar dependente.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteEmployeePlanDependent() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de excluir um dependente.');
      }
      return deleteEmployeePlanDependent(companyId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeePlanDependents', companyId) });
      toast.success('Dependente excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir dependente.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// HISTÓRICO DE PREÇOS
// =====================================================

export function useMedicalPlanPricingHistory(filters?: MedicalPlanPricingHistoryFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalPlanPricingHistory[], Error>({
    queryKey: getQueryKey('medicalPlanPricingHistory', companyId, filters),
    queryFn: () => getMedicalPlanPricingHistory(companyId, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useCreateMedicalPlanPricingHistory() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalPlanPricingHistory, Error, Omit<MedicalPlanPricingHistoryCreateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalPlanPricingHistoryCreateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar um histórico de preços.');
      }
      return createMedicalPlanPricingHistory(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlanPricingHistory', companyId) });
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Histórico de preços criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar histórico de preços.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// ESTATÍSTICAS
// =====================================================

export function useMedicalAgreementsStats() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<any, Error>({
    queryKey: getQueryKey('medicalAgreementsStats', companyId),
    queryFn: () => getMedicalAgreementsStats(companyId),
    enabled: !!companyId,
  });
}

// =====================================================
// HOOKS UTILITÁRIOS
// =====================================================

export function useAgreementTypes() {
  return [
    { value: 'medico', label: 'Médico' },
    { value: 'odontologico', label: 'Odontológico' },
    { value: 'ambos', label: 'Médico + Odontológico' }
  ];
}

export function usePlanCategories() {
  return [
    { value: 'basico', label: 'Básico' },
    { value: 'intermediario', label: 'Intermediário' },
    { value: 'premium', label: 'Premium' },
    { value: 'executivo', label: 'Executivo' },
    { value: 'familia', label: 'Família' },
    { value: 'individual', label: 'Individual' }
  ];
}

export function usePlanStatuses() {
  return [
    { value: 'ativo', label: 'Ativo' },
    { value: 'suspenso', label: 'Suspenso' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'transferido', label: 'Transferido' }
  ];
}

export function useDependentParentescos() {
  return [
    { value: 'conjuge', label: 'Cônjuge' },
    { value: 'filho', label: 'Filho' },
    { value: 'filha', label: 'Filha' },
    { value: 'pai', label: 'Pai' },
    { value: 'mae', label: 'Mãe' },
    { value: 'outros', label: 'Outros' }
  ];
}

// =====================================================
// FAIXAS ETÁRIAS DE PLANOS MÉDICOS
// =====================================================

export function useMedicalPlanAgeRanges(filters?: MedicalPlanAgeRangeFilters) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalPlanAgeRange[], Error>({
    queryKey: getQueryKey('medicalPlanAgeRanges', companyId, filters),
    queryFn: () => getMedicalPlanAgeRanges(companyId, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useMedicalPlanAgeRange(id: string) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useQuery<MedicalPlanAgeRange, Error>({
    queryKey: getQueryKey('medicalPlanAgeRange', companyId, { id }),
    queryFn: () => getMedicalPlanAgeRangeById(companyId, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateMedicalPlanAgeRange() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalPlanAgeRange, Error, Omit<MedicalPlanAgeRangeCreateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalPlanAgeRangeCreateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de criar uma faixa etária.');
      }
      return createMedicalPlanAgeRange(data, companyId);
    },
    onSuccess: (_, variables) => {
      // Invalidar todas as queries de faixas etárias (com e sem filtros)
      queryClient.invalidateQueries({ 
        queryKey: ['medicalPlanAgeRanges', companyId],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Faixa etária criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar faixa etária.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateMedicalPlanAgeRange() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<MedicalPlanAgeRange, Error, Omit<MedicalPlanAgeRangeUpdateData, 'company_id'>>({
    mutationFn: (data: Omit<MedicalPlanAgeRangeUpdateData, 'company_id'>) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de atualizar uma faixa etária.');
      }
      return updateMedicalPlanAgeRange(data, companyId);
    },
    onSuccess: () => {
      // Invalidar todas as queries de faixas etárias (com e sem filtros)
      queryClient.invalidateQueries({ 
        queryKey: ['medicalPlanAgeRanges', companyId],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Faixa etária atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar faixa etária.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteMedicalPlanAgeRange() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';
  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      if (!companyId) {
        throw new Error('Empresa não selecionada. Por favor, selecione uma empresa antes de excluir uma faixa etária.');
      }
      return deleteMedicalPlanAgeRange(companyId, id);
    },
    onSuccess: () => {
      // Invalidar todas as queries de faixas etárias (com e sem filtros)
      queryClient.invalidateQueries({ 
        queryKey: ['medicalPlanAgeRanges', companyId],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId) });
      toast.success('Faixa etária excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir faixa etária.', {
        description: error.message,
      });
    },
  });
}
