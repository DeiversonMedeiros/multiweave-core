// =====================================================
// HOOKS PARA SINDICATOS E GESTÃO SINDICAL
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getUnions,
  getUnionById,
  createUnion,
  updateUnion,
  deleteUnion,
  getEmployeeUnionMemberships,
  getEmployeeUnionMembershipById,
  createEmployeeUnionMembership,
  updateEmployeeUnionMembership,
  deleteEmployeeUnionMembership,
  getUnionContributions,
  createUnionContribution,
  updateUnionContribution,
  deleteUnionContribution,
  getCollectiveAgreements,
  createCollectiveAgreement,
  updateCollectiveAgreement,
  deleteCollectiveAgreement,
  getUnionNegotiations,
  createUnionNegotiation,
  updateUnionNegotiation,
  deleteUnionNegotiation,
  getUnionRepresentatives,
  createUnionRepresentative,
  updateUnionRepresentative,
  deleteUnionRepresentative,
  getUnionsStats,
} from '@/services/rh/unionsService';
import {
  Union,
  UnionCreateData,
  UnionUpdateData,
  UnionFilters,
  EmployeeUnionMembership,
  EmployeeUnionMembershipCreateData,
  EmployeeUnionMembershipUpdateData,
  EmployeeUnionMembershipFilters,
  UnionContribution,
  UnionContributionCreateData,
  UnionContributionUpdateData,
  UnionContributionFilters,
  CollectiveAgreement,
  CollectiveAgreementCreateData,
  CollectiveAgreementUpdateData,
  CollectiveAgreementFilters,
  UnionNegotiation,
  UnionNegotiationCreateData,
  UnionNegotiationUpdateData,
  UnionNegotiationFilters,
  UnionRepresentative,
  UnionRepresentativeCreateData,
  UnionRepresentativeUpdateData,
  UnionRepresentativeFilters,
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

const getQueryKey = (entity: string, companyId: string, filters?: any) => [entity, companyId, filters];

// =====================================================
// SINDICATOS
// =====================================================

export function useUnions(filters?: UnionFilters) {
  const { companyId } = useCompany();
  return useQuery<Union[], Error>({
    queryKey: getQueryKey('unions', companyId!, filters),
    queryFn: () => getUnions(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useUnion(id: string) {
  const { companyId } = useCompany();
  return useQuery<Union, Error>({
    queryKey: getQueryKey('union', companyId!, { id }),
    queryFn: () => getUnionById(companyId!, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateUnion() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<Union, Error, UnionCreateData>({
    mutationFn: (newData) => createUnion({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unions', companyId!) });
      toast.success('Sindicato criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar sindicato.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateUnion() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<Union, Error, UnionUpdateData>({
    mutationFn: (updatedData) => updateUnion({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unions', companyId!) });
      toast.success('Sindicato atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar sindicato.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteUnion() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteUnion(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unions', companyId!) });
      toast.success('Sindicato excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir sindicato.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// FILIAÇÕES SINDICAIS
// =====================================================

export function useEmployeeUnionMemberships(filters?: EmployeeUnionMembershipFilters) {
  const { companyId } = useCompany();
  return useQuery<EmployeeUnionMembership[], Error>({
    queryKey: getQueryKey('employeeUnionMemberships', companyId!, filters),
    queryFn: () => getEmployeeUnionMemberships(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useEmployeeUnionMembership(id: string) {
  const { companyId } = useCompany();
  return useQuery<EmployeeUnionMembership, Error>({
    queryKey: getQueryKey('employeeUnionMembership', companyId!, { id }),
    queryFn: () => getEmployeeUnionMembershipById(companyId!, id),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEmployeeUnionMembership() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<EmployeeUnionMembership, Error, EmployeeUnionMembershipCreateData>({
    mutationFn: (newData) => createEmployeeUnionMembership({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeUnionMemberships', companyId!) });
      toast.success('Filiação sindical criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar filiação sindical.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateEmployeeUnionMembership() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<EmployeeUnionMembership, Error, EmployeeUnionMembershipUpdateData>({
    mutationFn: (updatedData) => updateEmployeeUnionMembership({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeUnionMemberships', companyId!) });
      toast.success('Filiação sindical atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar filiação sindical.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteEmployeeUnionMembership() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteEmployeeUnionMembership(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('employeeUnionMemberships', companyId!) });
      toast.success('Filiação sindical excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir filiação sindical.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// CONTRIBUIÇÕES SINDICAIS
// =====================================================

export function useUnionContributions(filters?: UnionContributionFilters) {
  const { companyId } = useCompany();
  return useQuery<UnionContribution[], Error>({
    queryKey: getQueryKey('unionContributions', companyId!, filters),
    queryFn: () => getUnionContributions(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useCreateUnionContribution() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<UnionContribution, Error, UnionContributionCreateData>({
    mutationFn: (newData) => createUnionContribution({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionContributions', companyId!) });
      toast.success('Contribuição sindical criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar contribuição sindical.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateUnionContribution() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<UnionContribution, Error, UnionContributionUpdateData>({
    mutationFn: (updatedData) => updateUnionContribution({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionContributions', companyId!) });
      toast.success('Contribuição sindical atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar contribuição sindical.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteUnionContribution() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteUnionContribution(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionContributions', companyId!) });
      toast.success('Contribuição sindical excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir contribuição sindical.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// CONVENÇÕES COLETIVAS
// =====================================================

export function useCollectiveAgreements(filters?: CollectiveAgreementFilters) {
  const { companyId } = useCompany();
  return useQuery<CollectiveAgreement[], Error>({
    queryKey: getQueryKey('collectiveAgreements', companyId!, filters),
    queryFn: () => getCollectiveAgreements(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useCreateCollectiveAgreement() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<CollectiveAgreement, Error, CollectiveAgreementCreateData>({
    mutationFn: (newData) => createCollectiveAgreement({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('collectiveAgreements', companyId!) });
      toast.success('Convenção coletiva criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar convenção coletiva.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateCollectiveAgreement() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<CollectiveAgreement, Error, CollectiveAgreementUpdateData>({
    mutationFn: (updatedData) => updateCollectiveAgreement({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('collectiveAgreements', companyId!) });
      toast.success('Convenção coletiva atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar convenção coletiva.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteCollectiveAgreement() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCollectiveAgreement(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('collectiveAgreements', companyId!) });
      toast.success('Convenção coletiva excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir convenção coletiva.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// NEGOCIAÇÕES SINDICAIS
// =====================================================

export function useUnionNegotiations(filters?: UnionNegotiationFilters) {
  const { companyId } = useCompany();
  return useQuery<UnionNegotiation[], Error>({
    queryKey: getQueryKey('unionNegotiations', companyId!, filters),
    queryFn: () => getUnionNegotiations(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useCreateUnionNegotiation() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<UnionNegotiation, Error, UnionNegotiationCreateData>({
    mutationFn: (newData) => createUnionNegotiation({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionNegotiations', companyId!) });
      toast.success('Negociação sindical criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar negociação sindical.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateUnionNegotiation() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<UnionNegotiation, Error, UnionNegotiationUpdateData>({
    mutationFn: (updatedData) => updateUnionNegotiation({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionNegotiations', companyId!) });
      toast.success('Negociação sindical atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar negociação sindical.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteUnionNegotiation() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteUnionNegotiation(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionNegotiations', companyId!) });
      toast.success('Negociação sindical excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir negociação sindical.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// REPRESENTANTES SINDICAIS
// =====================================================

export function useUnionRepresentatives(filters?: UnionRepresentativeFilters) {
  const { companyId } = useCompany();
  return useQuery<UnionRepresentative[], Error>({
    queryKey: getQueryKey('unionRepresentatives', companyId!, filters),
    queryFn: () => getUnionRepresentatives(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useCreateUnionRepresentative() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<UnionRepresentative, Error, UnionRepresentativeCreateData>({
    mutationFn: (newData) => createUnionRepresentative({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionRepresentatives', companyId!) });
      toast.success('Representante sindical criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar representante sindical.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateUnionRepresentative() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<UnionRepresentative, Error, UnionRepresentativeUpdateData>({
    mutationFn: (updatedData) => updateUnionRepresentative({ ...updatedData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionRepresentatives', companyId!) });
      toast.success('Representante sindical atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar representante sindical.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteUnionRepresentative() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteUnionRepresentative(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey('unionRepresentatives', companyId!) });
      toast.success('Representante sindical excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir representante sindical.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// ESTATÍSTICAS
// =====================================================

export function useUnionsStats() {
  const { companyId } = useCompany();
  return useQuery<any, Error>({
    queryKey: getQueryKey('unionsStats', companyId!),
    queryFn: () => getUnionsStats(companyId!),
    enabled: !!companyId,
  });
}

// =====================================================
// HOOKS UTILITÁRIOS
// =====================================================

export function useUnionTypes() {
  return [
    { value: 'patronal', label: 'Patronal' },
    { value: 'trabalhadores', label: 'Trabalhadores' },
    { value: 'categoria', label: 'Categoria' },
    { value: 'profissional', label: 'Profissional' },
    { value: 'misto', label: 'Misto' }
  ];
}

export function useMembershipStatuses() {
  return [
    { value: 'ativo', label: 'Ativo' },
    { value: 'suspenso', label: 'Suspenso' },
    { value: 'desfiliado', label: 'Desfiliado' },
    { value: 'transferido', label: 'Transferido' }
  ];
}

export function useContributionTypes() {
  return [
    { value: 'mensalidade', label: 'Mensalidade' },
    { value: 'contribuicao_assistencial', label: 'Contribuição Assistencial' },
    { value: 'contribuicao_confederativa', label: 'Contribuição Confederativa' },
    { value: 'taxa_negociacao', label: 'Taxa de Negociação' },
    { value: 'outras', label: 'Outras' }
  ];
}

export function useContributionStatuses() {
  return [
    { value: 'pendente', label: 'Pendente' },
    { value: 'pago', label: 'Pago' },
    { value: 'atrasado', label: 'Atrasado' },
    { value: 'isento', label: 'Isento' },
    { value: 'cancelado', label: 'Cancelado' }
  ];
}

export function useAgreementTypes() {
  return [
    { value: 'convencao_coletiva', label: 'Convenção Coletiva' },
    { value: 'acordo_coletivo', label: 'Acordo Coletivo' },
    { value: 'acordo_individual', label: 'Acordo Individual' },
    { value: 'dissidio', label: 'Dissídio' },
    { value: 'norma_regulamentar', label: 'Norma Regulamentar' }
  ];
}

export function useNegotiationTypes() {
  return [
    { value: 'salarial', label: 'Salarial' },
    { value: 'beneficios', label: 'Benefícios' },
    { value: 'condicoes_trabalho', label: 'Condições de Trabalho' },
    { value: 'seguranca', label: 'Segurança' },
    { value: 'outras', label: 'Outras' }
  ];
}

export function useNegotiationStatuses() {
  return [
    { value: 'agendada', label: 'Agendada' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'suspensa', label: 'Suspensa' },
    { value: 'cancelada', label: 'Cancelada' }
  ];
}

export function useRepresentativeStatuses() {
  return [
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
    { value: 'suspenso', label: 'Suspenso' }
  ];
}
