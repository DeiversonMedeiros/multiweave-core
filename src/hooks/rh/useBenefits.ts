// =====================================================
// HOOKS PARA BENEFÍCIOS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getBenefits,
  getBenefitById,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  getEmployeeBenefits,
  getEmployeeBenefitById,
  createEmployeeBenefit,
  updateEmployeeBenefit,
  deleteEmployeeBenefit,
  getEmployeeBenefitsByEmployee,
  getActiveBenefits,
  getBenefitsByType,
  getBenefitStats,
  calculateBenefitValue,
  validateBenefitAssignment
} from '@/services/rh/benefitsService';
import {
  Benefit,
  BenefitCreateData,
  BenefitUpdateData,
  BenefitFilters,
  EmployeeBenefit,
  EmployeeBenefitCreateData,
  EmployeeBenefitUpdateData,
  EmployeeBenefitFilters
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS PARA BENEFÍCIOS
// =====================================================

const getBenefitsQueryKey = (companyId: string, filters?: BenefitFilters) => ['benefits', companyId, filters];

export function useBenefits(filters?: BenefitFilters) {
  const { companyId } = useCompany();
  return useQuery<Benefit[], Error>({
    queryKey: getBenefitsQueryKey(companyId!, filters),
    queryFn: () => getBenefits(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useBenefit(id: string) {
  const { companyId } = useCompany();
  return useQuery<Benefit, Error>({
    queryKey: ['benefit', companyId, id],
    queryFn: () => getBenefitById(id, companyId!),
    enabled: !!id && !!companyId,
  });
}

export function useCreateBenefit() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<Benefit, Error, BenefitCreateData>({
    mutationFn: (newData) => createBenefit({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast.success('Benefício criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar benefício.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateBenefit() {
  const queryClient = useQueryClient();
  return useMutation<Benefit, Error, BenefitUpdateData>({
    mutationFn: (updatedData) => updateBenefit(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast.success('Benefício atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar benefício.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteBenefit() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteBenefit(id, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast.success('Benefício excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir benefício.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// HOOKS PARA BENEFÍCIOS DO FUNCIONÁRIO
// =====================================================

const getEmployeeBenefitsQueryKey = (companyId: string, filters?: EmployeeBenefitFilters) => ['employeeBenefits', companyId, filters];

export function useEmployeeBenefits(filters?: EmployeeBenefitFilters) {
  const { companyId } = useCompany();
  return useQuery<EmployeeBenefit[], Error>({
    queryKey: getEmployeeBenefitsQueryKey(companyId!, filters),
    queryFn: () => getEmployeeBenefits(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useEmployeeBenefit(id: string) {
  const { companyId } = useCompany();
  return useQuery<EmployeeBenefit, Error>({
    queryKey: ['employeeBenefit', companyId, id],
    queryFn: () => getEmployeeBenefitById(id, companyId!),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEmployeeBenefit() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<EmployeeBenefit, Error, EmployeeBenefitCreateData>({
    mutationFn: (newData) => createEmployeeBenefit({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeBenefits'] });
      toast.success('Benefício atribuído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atribuir benefício.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateEmployeeBenefit() {
  const queryClient = useQueryClient();
  return useMutation<EmployeeBenefit, Error, EmployeeBenefitUpdateData>({
    mutationFn: (updatedData) => updateEmployeeBenefit(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeBenefits'] });
      toast.success('Benefício atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar benefício.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteEmployeeBenefit() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteEmployeeBenefit(id, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeBenefits'] });
      toast.success('Benefício removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover benefício.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

export function useEmployeeBenefitsByEmployee(employeeId: string) {
  const { companyId } = useCompany();
  return useQuery<EmployeeBenefit[], Error>({
    queryKey: ['employeeBenefits', companyId, employeeId],
    queryFn: () => getEmployeeBenefitsByEmployee(employeeId, companyId!),
    enabled: !!employeeId && !!companyId,
  });
}

export function useActiveBenefits() {
  const { companyId } = useCompany();
  return useQuery<Benefit[], Error>({
    queryKey: ['activeBenefits', companyId],
    queryFn: () => getActiveBenefits(companyId!),
    enabled: !!companyId,
  });
}

export function useBenefitsByType(tipo: string) {
  const { companyId } = useCompany();
  return useQuery<Benefit[], Error>({
    queryKey: ['benefitsByType', companyId, tipo],
    queryFn: () => getBenefitsByType(companyId!, tipo),
    enabled: !!tipo && !!companyId,
  });
}

export function useBenefitStats() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['benefitStats', companyId],
    queryFn: () => getBenefitStats(companyId!),
    enabled: !!companyId,
  });
}

export function useCalculateBenefitValue() {
  return useMutation({
    mutationFn: ({ benefit, employeeSalary }: { benefit: Benefit; employeeSalary?: number }) => 
      calculateBenefitValue(benefit, employeeSalary),
    onError: (error) => {
      toast.error('Erro ao calcular valor do benefício.', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });
}

export function useValidateBenefitAssignment() {
  return useMutation({
    mutationFn: ({ employeeId, benefitId, companyId }: { employeeId: string; benefitId: string; companyId: string }) => 
      validateBenefitAssignment(employeeId, benefitId, companyId),
    onError: (error) => {
      toast.error('Erro ao validar atribuição.', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });
}

// =====================================================
// HOOKS DE UTILITÁRIOS
// =====================================================

export function useBenefitTypes() {
  return [
    { value: 'vale_alimentacao', label: 'Vale Alimentação' },
    { value: 'vale_refeicao', label: 'Vale Refeição' },
    { value: 'vale_transporte', label: 'Vale Transporte' },
    { value: 'plano_saude', label: 'Plano de Saúde' },
    { value: 'plano_odonto', label: 'Plano Odontológico' },
    { value: 'seguro_vida', label: 'Seguro de Vida' },
    { value: 'auxilio_creche', label: 'Auxílio Creche' },
    { value: 'auxilio_educacao', label: 'Auxílio Educação' },
    { value: 'gympass', label: 'Gympass' },
    { value: 'outros', label: 'Outros' }
  ];
}

export function useBenefitCalculationTypes() {
  return [
    { value: 'valor_fixo', label: 'Valor Fixo' },
    { value: 'percentual_salario', label: 'Percentual do Salário' },
    { value: 'tabela_faixas', label: 'Tabela de Faixas' }
  ];
}

export function useBenefitCategories() {
  return [
    { value: 'geral', label: 'Geral' },
    { value: 'executivo', label: 'Executivo' },
    { value: 'operacional', label: 'Operacional' },
    { value: 'terceirizado', label: 'Terceirizado' }
  ];
}

export function useEmployeeBenefitStatuses() {
  return [
    { value: 'ativo', label: 'Ativo' },
    { value: 'suspenso', label: 'Suspenso' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'finalizado', label: 'Finalizado' }
  ];
}