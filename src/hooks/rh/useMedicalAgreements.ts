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
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

const getQueryKey = (entity: string, companyId: string, filters?: any) => [entity, companyId, filters];

// =====================================================
// CONVÊNIOS MÉDICOS
// =====================================================

export function useMedicalAgreements(filters?: MedicalAgreementFilters) {
  const { companyId } = useCompany();
  return useQuery<MedicalAgreement[], Error>({
    queryKey: getQueryKey('medicalAgreements', companyId!, filters),
    queryFn: () => getMedicalAgreements(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useMedicalAgreement(id: string) {
  const { companyId } = useCompany();
  return useQuery<MedicalAgreement, Error>({
    queryKey: getQueryKey('medicalAgreement', companyId!, { id }),
    queryFn: () => getMedicalAgreementById(companyId!, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateMedicalAgreement() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<MedicalAgreement, Error, MedicalAgreementCreateData>({
    mutationFn: (newData) => createMedicalAgreement({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalAgreements', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<MedicalAgreement, Error, MedicalAgreementUpdateData>({
    mutationFn: (updatedData) => updateMedicalAgreement({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalAgreements', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteMedicalAgreement(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalAgreements', companyId!) });
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
  const { companyId } = useCompany();
  return useQuery<MedicalPlan[], Error>({
    queryKey: getQueryKey('medicalPlans', companyId!, filters),
    queryFn: () => getMedicalPlans(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useMedicalPlan(id: string) {
  const { companyId } = useCompany();
  return useQuery<MedicalPlan, Error>({
    queryKey: getQueryKey('medicalPlan', companyId!, { id }),
    queryFn: () => getMedicalPlanById(companyId!, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateMedicalPlan() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<MedicalPlan, Error, MedicalPlanCreateData>({
    mutationFn: (newData) => createMedicalPlan({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<MedicalPlan, Error, MedicalPlanUpdateData>({
    mutationFn: (updatedData) => updateMedicalPlan({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteMedicalPlan(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useQuery<EmployeeMedicalPlan[], Error>({
    queryKey: getQueryKey('employeeMedicalPlans', companyId!, filters),
    queryFn: () => getEmployeeMedicalPlans(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useEmployeeMedicalPlan(id: string) {
  const { companyId } = useCompany();
  return useQuery<EmployeeMedicalPlan, Error>({
    queryKey: getQueryKey('employeeMedicalPlan', companyId!, { id }),
    queryFn: () => getEmployeeMedicalPlanById(companyId!, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEmployeeMedicalPlan() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<EmployeeMedicalPlan, Error, EmployeeMedicalPlanCreateData>({
    mutationFn: (newData) => createEmployeeMedicalPlan({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeMedicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<EmployeeMedicalPlan, Error, EmployeeMedicalPlanUpdateData>({
    mutationFn: (updatedData) => updateEmployeeMedicalPlan({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeMedicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteEmployeeMedicalPlan(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeMedicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useQuery<EmployeePlanDependent[], Error>({
    queryKey: getQueryKey('employeePlanDependents', companyId!, filters),
    queryFn: () => getEmployeePlanDependents(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useEmployeePlanDependent(id: string) {
  const { companyId } = useCompany();
  return useQuery<EmployeePlanDependent, Error>({
    queryKey: getQueryKey('employeePlanDependent', companyId!, { id }),
    queryFn: () => getEmployeePlanDependentById(companyId!, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEmployeePlanDependent() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<EmployeePlanDependent, Error, EmployeePlanDependentCreateData>({
    mutationFn: (newData) => createEmployeePlanDependent({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeePlanDependents', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<EmployeePlanDependent, Error, EmployeePlanDependentUpdateData>({
    mutationFn: (updatedData) => updateEmployeePlanDependent({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeePlanDependents', companyId!) });
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
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteEmployeePlanDependent(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeePlanDependents', companyId!) });
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
  const { companyId } = useCompany();
  return useQuery<MedicalPlanPricingHistory[], Error>({
    queryKey: getQueryKey('medicalPlanPricingHistory', companyId!, filters),
    queryFn: () => getMedicalPlanPricingHistory(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useCreateMedicalPlanPricingHistory() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<MedicalPlanPricingHistory, Error, MedicalPlanPricingHistoryCreateData>({
    mutationFn: (newData) => createMedicalPlanPricingHistory({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlanPricingHistory', companyId!) });
      queryClient.invalidateQueries({ queryKey: getQueryKey('medicalPlans', companyId!) });
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
  const { companyId } = useCompany();
  return useQuery<any, Error>({
    queryKey: getQueryKey('medicalAgreementsStats', companyId!),
    queryFn: () => getMedicalAgreementsStats(companyId!),
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
