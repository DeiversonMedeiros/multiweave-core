// =====================================================
// SERVIÇO PARA SINDICATOS E GESTÃO SINDICAL
// =====================================================

import { supabase } from '@/integrations/supabase/client';
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
import { EntityService } from '@/services/generic/entityService';

const SCHEMA = 'rh';

// =====================================================
// SINDICATOS
// =====================================================

export async function getUnions(
  companyId: string,
  filters: UnionFilters = {}
): Promise<{ data: Union[]; totalCount: number }> {
  try {
    const result = await EntityService.list<Union>({
      schema: SCHEMA,
      table: 'unions',
      companyId,
      filters,
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de sindicatos:', error);
    throw error;
  }
}

export async function getUnionById(
  companyId: string,
  id: string
): Promise<Union | null> {
  try {
    return await EntityService.getById<Union>({
      schema: SCHEMA,
      table: 'unions',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro ao buscar sindicato com ID ${id}:`, error);
    throw error;
  }
}

export async function createUnion(
  unionData: UnionCreateData
): Promise<Union> {
  try {
    return await EntityService.create<Union>({
      schema: SCHEMA,
      table: 'unions',
      companyId: unionData.company_id,
      data: unionData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de sindicato:', error);
    throw error;
  }
}

export async function updateUnion(
  unionData: UnionUpdateData
): Promise<Union> {
  try {
    return await EntityService.update<Union>({
      schema: SCHEMA,
      table: 'unions',
      companyId: unionData.company_id,
      id: unionData.id,
      data: unionData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de sindicato com ID ${unionData.id}:`, error);
    throw error;
  }
}

export async function deleteUnion(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'unions',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de sindicato com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// FILIAÇÕES SINDICAIS
// =====================================================

export async function getEmployeeUnionMemberships(
  companyId: string,
  filters: EmployeeUnionMembershipFilters = {}
): Promise<{ data: EmployeeUnionMembership[]; totalCount: number }> {
  try {
    const result = await EntityService.list<EmployeeUnionMembership>({
      schema: SCHEMA,
      table: 'employee_union_memberships',
      companyId,
      filters,
      orderBy: 'data_filiacao',
      orderDirection: 'DESC',
      foreignTable: 'rh.employees(id, nome, matricula), rh.unions(id, nome, sigla)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de filiações sindicais:', error);
    throw error;
  }
}

export async function getEmployeeUnionMembershipById(
  companyId: string,
  id: string
): Promise<EmployeeUnionMembership | null> {
  try {
    return await EntityService.getById<EmployeeUnionMembership>({
      schema: SCHEMA,
      table: 'employee_union_memberships',
      companyId,
      id,
      foreignTable: 'rh.employees(id, nome, matricula), rh.unions(id, nome, sigla)'
    });
  } catch (error) {
    console.error(`Erro ao buscar filiação sindical com ID ${id}:`, error);
    throw error;
  }
}

export async function createEmployeeUnionMembership(
  membershipData: EmployeeUnionMembershipCreateData
): Promise<EmployeeUnionMembership> {
  try {
    return await EntityService.create<EmployeeUnionMembership>({
      schema: SCHEMA,
      table: 'employee_union_memberships',
      companyId: membershipData.company_id,
      data: membershipData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de filiação sindical:', error);
    throw error;
  }
}

export async function updateEmployeeUnionMembership(
  membershipData: EmployeeUnionMembershipUpdateData
): Promise<EmployeeUnionMembership> {
  try {
    return await EntityService.update<EmployeeUnionMembership>({
      schema: SCHEMA,
      table: 'employee_union_memberships',
      companyId: membershipData.company_id,
      id: membershipData.id,
      data: membershipData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de filiação sindical com ID ${membershipData.id}:`, error);
    throw error;
  }
}

export async function deleteEmployeeUnionMembership(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'employee_union_memberships',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de filiação sindical com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// CONTRIBUIÇÕES SINDICAIS
// =====================================================

export async function getUnionContributions(
  companyId: string,
  filters: UnionContributionFilters = {}
): Promise<{ data: UnionContribution[]; totalCount: number }> {
  try {
    const result = await EntityService.list<UnionContribution>({
      schema: SCHEMA,
      table: 'union_contributions',
      companyId,
      filters,
      orderBy: 'mes_referencia',
      orderDirection: 'DESC',
      foreignTable: 'rh.employees(id, nome, matricula), rh.unions(id, nome, sigla)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de contribuições sindicais:', error);
    throw error;
  }
}

export async function createUnionContribution(
  contributionData: UnionContributionCreateData
): Promise<UnionContribution> {
  try {
    return await EntityService.create<UnionContribution>({
      schema: SCHEMA,
      table: 'union_contributions',
      companyId: contributionData.company_id,
      data: contributionData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de contribuição sindical:', error);
    throw error;
  }
}

export async function updateUnionContribution(
  contributionData: UnionContributionUpdateData
): Promise<UnionContribution> {
  try {
    return await EntityService.update<UnionContribution>({
      schema: SCHEMA,
      table: 'union_contributions',
      companyId: contributionData.company_id,
      id: contributionData.id,
      data: contributionData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de contribuição sindical com ID ${contributionData.id}:`, error);
    throw error;
  }
}

export async function deleteUnionContribution(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'union_contributions',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de contribuição sindical com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// CONVENÇÕES COLETIVAS
// =====================================================

export async function getCollectiveAgreements(
  companyId: string,
  filters: CollectiveAgreementFilters = {}
): Promise<{ data: CollectiveAgreement[]; totalCount: number }> {
  try {
    const result = await EntityService.list<CollectiveAgreement>({
      schema: SCHEMA,
      table: 'collective_agreements',
      companyId,
      filters,
      orderBy: 'data_vigencia_inicio',
      orderDirection: 'DESC',
      foreignTable: 'rh.unions(id, nome, sigla)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de convenções coletivas:', error);
    throw error;
  }
}

export async function createCollectiveAgreement(
  agreementData: CollectiveAgreementCreateData
): Promise<CollectiveAgreement> {
  try {
    return await EntityService.create<CollectiveAgreement>({
      schema: SCHEMA,
      table: 'collective_agreements',
      companyId: agreementData.company_id,
      data: agreementData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de convenção coletiva:', error);
    throw error;
  }
}

export async function updateCollectiveAgreement(
  agreementData: CollectiveAgreementUpdateData
): Promise<CollectiveAgreement> {
  try {
    return await EntityService.update<CollectiveAgreement>({
      schema: SCHEMA,
      table: 'collective_agreements',
      companyId: agreementData.company_id,
      id: agreementData.id,
      data: agreementData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de convenção coletiva com ID ${agreementData.id}:`, error);
    throw error;
  }
}

export async function deleteCollectiveAgreement(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'collective_agreements',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de convenção coletiva com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// NEGOCIAÇÕES SINDICAIS
// =====================================================

export async function getUnionNegotiations(
  companyId: string,
  filters: UnionNegotiationFilters = {}
): Promise<{ data: UnionNegotiation[]; totalCount: number }> {
  try {
    const result = await EntityService.list<UnionNegotiation>({
      schema: SCHEMA,
      table: 'union_negotiations',
      companyId,
      filters,
      orderBy: 'data_inicio',
      orderDirection: 'DESC',
      foreignTable: 'rh.unions(id, nome, sigla)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de negociações sindicais:', error);
    throw error;
  }
}

export async function createUnionNegotiation(
  negotiationData: UnionNegotiationCreateData
): Promise<UnionNegotiation> {
  try {
    return await EntityService.create<UnionNegotiation>({
      schema: SCHEMA,
      table: 'union_negotiations',
      companyId: negotiationData.company_id,
      data: negotiationData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de negociação sindical:', error);
    throw error;
  }
}

export async function updateUnionNegotiation(
  negotiationData: UnionNegotiationUpdateData
): Promise<UnionNegotiation> {
  try {
    return await EntityService.update<UnionNegotiation>({
      schema: SCHEMA,
      table: 'union_negotiations',
      companyId: negotiationData.company_id,
      id: negotiationData.id,
      data: negotiationData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de negociação sindical com ID ${negotiationData.id}:`, error);
    throw error;
  }
}

export async function deleteUnionNegotiation(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'union_negotiations',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de negociação sindical com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// REPRESENTANTES SINDICAIS
// =====================================================

export async function getUnionRepresentatives(
  companyId: string,
  filters: UnionRepresentativeFilters = {}
): Promise<{ data: UnionRepresentative[]; totalCount: number }> {
  try {
    const result = await EntityService.list<UnionRepresentative>({
      schema: SCHEMA,
      table: 'union_representatives',
      companyId,
      filters,
      orderBy: 'data_inicio',
      orderDirection: 'DESC',
      foreignTable: 'rh.employees(id, nome, matricula), rh.unions(id, nome, sigla)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de representantes sindicais:', error);
    throw error;
  }
}

export async function createUnionRepresentative(
  representativeData: UnionRepresentativeCreateData
): Promise<UnionRepresentative> {
  try {
    return await EntityService.create<UnionRepresentative>({
      schema: SCHEMA,
      table: 'union_representatives',
      companyId: representativeData.company_id,
      data: representativeData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de representante sindical:', error);
    throw error;
  }
}

export async function updateUnionRepresentative(
  representativeData: UnionRepresentativeUpdateData
): Promise<UnionRepresentative> {
  try {
    return await EntityService.update<UnionRepresentative>({
      schema: SCHEMA,
      table: 'union_representatives',
      companyId: representativeData.company_id,
      id: representativeData.id,
      data: representativeData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de representante sindical com ID ${representativeData.id}:`, error);
    throw error;
  }
}

export async function deleteUnionRepresentative(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'union_representatives',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de representante sindical com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR');
}

export function getUnionTypeLabel(tipo: string): string {
  const types = {
    patronal: 'Patronal',
    trabalhadores: 'Trabalhadores',
    categoria: 'Categoria',
    profissional: 'Profissional',
    misto: 'Misto'
  };
  return types[tipo as keyof typeof types] || tipo;
}

export function getUnionTypeColor(tipo: string): string {
  const colors = {
    patronal: 'bg-blue-100 text-blue-800',
    trabalhadores: 'bg-green-100 text-green-800',
    categoria: 'bg-purple-100 text-purple-800',
    profissional: 'bg-orange-100 text-orange-800',
    misto: 'bg-gray-100 text-gray-800'
  };
  return colors[tipo as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getMembershipStatusLabel(status: string): string {
  const statuses = {
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    desfiliado: 'Desfiliado',
    transferido: 'Transferido'
  };
  return statuses[status as keyof typeof statuses] || status;
}

export function getMembershipStatusColor(status: string): string {
  const colors = {
    ativo: 'bg-green-100 text-green-800',
    suspenso: 'bg-yellow-100 text-yellow-800',
    desfiliado: 'bg-red-100 text-red-800',
    transferido: 'bg-blue-100 text-blue-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getContributionTypeLabel(tipo: string): string {
  const types = {
    mensalidade: 'Mensalidade',
    contribuicao_assistencial: 'Contribuição Assistencial',
    contribuicao_confederativa: 'Contribuição Confederativa',
    taxa_negociacao: 'Taxa de Negociação',
    outras: 'Outras'
  };
  return types[tipo as keyof typeof types] || tipo;
}

export function getContributionStatusLabel(status: string): string {
  const statuses = {
    pendente: 'Pendente',
    pago: 'Pago',
    atrasado: 'Atrasado',
    isento: 'Isento',
    cancelado: 'Cancelado'
  };
  return statuses[status as keyof typeof statuses] || status;
}

export function getContributionStatusColor(status: string): string {
  const colors = {
    pendente: 'bg-yellow-100 text-yellow-800',
    pago: 'bg-green-100 text-green-800',
    atrasado: 'bg-red-100 text-red-800',
    isento: 'bg-blue-100 text-blue-800',
    cancelado: 'bg-gray-100 text-gray-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getAgreementTypeLabel(tipo: string): string {
  const types = {
    convencao_coletiva: 'Convenção Coletiva',
    acordo_coletivo: 'Acordo Coletivo',
    acordo_individual: 'Acordo Individual',
    dissidio: 'Dissídio',
    norma_regulamentar: 'Norma Regulamentar'
  };
  return types[tipo as keyof typeof types] || tipo;
}

export function getNegotiationTypeLabel(tipo: string): string {
  const types = {
    salarial: 'Salarial',
    beneficios: 'Benefícios',
    condicoes_trabalho: 'Condições de Trabalho',
    seguranca: 'Segurança',
    outras: 'Outras'
  };
  return types[tipo as keyof typeof types] || tipo;
}

export function getNegotiationStatusLabel(status: string): string {
  const statuses = {
    agendada: 'Agendada',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    suspensa: 'Suspensa',
    cancelada: 'Cancelada'
  };
  return statuses[status as keyof typeof statuses] || status;
}

export function getNegotiationStatusColor(status: string): string {
  const colors = {
    agendada: 'bg-blue-100 text-blue-800',
    em_andamento: 'bg-yellow-100 text-yellow-800',
    concluida: 'bg-green-100 text-green-800',
    suspensa: 'bg-orange-100 text-orange-800',
    cancelada: 'bg-red-100 text-red-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export async function getUnionsStats(companyId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_unions_stats', { p_company_id: companyId });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching unions stats:', error);
    throw error;
  }
}
