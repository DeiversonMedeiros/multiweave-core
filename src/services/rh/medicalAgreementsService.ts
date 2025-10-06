// =====================================================
// SERVIÇO PARA CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
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
import { EntityService } from '@/services/generic/entityService';

const SCHEMA = 'rh';

// =====================================================
// CONVÊNIOS MÉDICOS
// =====================================================

export async function getMedicalAgreements(
  companyId: string,
  filters: MedicalAgreementFilters = {}
): Promise<{ data: MedicalAgreement[]; totalCount: number }> {
  try {
    const result = await EntityService.list<MedicalAgreement>({
      schema: SCHEMA,
      table: 'medical_agreements',
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
    console.error('Erro no serviço de convênios médicos:', error);
    throw error;
  }
}

export async function getMedicalAgreementById(
  companyId: string,
  id: string
): Promise<MedicalAgreement | null> {
  try {
    return await EntityService.getById<MedicalAgreement>({
      schema: SCHEMA,
      table: 'medical_agreements',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro ao buscar convênio médico com ID ${id}:`, error);
    throw error;
  }
}

export async function createMedicalAgreement(
  agreementData: MedicalAgreementCreateData
): Promise<MedicalAgreement> {
  try {
    return await EntityService.create<MedicalAgreement>({
      schema: SCHEMA,
      table: 'medical_agreements',
      companyId: agreementData.company_id,
      data: agreementData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de convênio médico:', error);
    throw error;
  }
}

export async function updateMedicalAgreement(
  agreementData: MedicalAgreementUpdateData
): Promise<MedicalAgreement> {
  try {
    return await EntityService.update<MedicalAgreement>({
      schema: SCHEMA,
      table: 'medical_agreements',
      companyId: agreementData.company_id,
      id: agreementData.id,
      data: agreementData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de convênio médico com ID ${agreementData.id}:`, error);
    throw error;
  }
}

export async function deleteMedicalAgreement(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'medical_agreements',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de convênio médico com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// PLANOS MÉDICOS
// =====================================================

export async function getMedicalPlans(
  companyId: string,
  filters: MedicalPlanFilters = {}
): Promise<{ data: MedicalPlan[]; totalCount: number }> {
  try {
    const result = await EntityService.list<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId,
      filters,
      orderBy: 'nome',
      orderDirection: 'ASC',
      foreignTable: 'rh.medical_agreements(id, nome, tipo)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de planos médicos:', error);
    throw error;
  }
}

export async function getMedicalPlanById(
  companyId: string,
  id: string
): Promise<MedicalPlan | null> {
  try {
    return await EntityService.getById<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId,
      id,
      foreignTable: 'rh.medical_agreements(id, nome, tipo)'
    });
  } catch (error) {
    console.error(`Erro ao buscar plano médico com ID ${id}:`, error);
    throw error;
  }
}

export async function createMedicalPlan(
  planData: MedicalPlanCreateData
): Promise<MedicalPlan> {
  try {
    return await EntityService.create<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId: planData.company_id,
      data: planData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de plano médico:', error);
    throw error;
  }
}

export async function updateMedicalPlan(
  planData: MedicalPlanUpdateData
): Promise<MedicalPlan> {
  try {
    return await EntityService.update<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId: planData.company_id,
      id: planData.id,
      data: planData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de plano médico com ID ${planData.id}:`, error);
    throw error;
  }
}

export async function deleteMedicalPlan(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de plano médico com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// ADESÕES DOS FUNCIONÁRIOS
// =====================================================

export async function getEmployeeMedicalPlans(
  companyId: string,
  filters: EmployeeMedicalPlanFilters = {}
): Promise<{ data: EmployeeMedicalPlan[]; totalCount: number }> {
  try {
    const result = await EntityService.list<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId,
      filters,
      orderBy: 'data_inicio',
      orderDirection: 'DESC',
      foreignTable: 'rh.employees(id, nome, matricula), rh.medical_plans(id, nome, categoria)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de adesões médicas:', error);
    throw error;
  }
}

export async function getEmployeeMedicalPlanById(
  companyId: string,
  id: string
): Promise<EmployeeMedicalPlan | null> {
  try {
    return await EntityService.getById<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId,
      id,
      foreignTable: 'rh.employees(id, nome, matricula), rh.medical_plans(id, nome, categoria)'
    });
  } catch (error) {
    console.error(`Erro ao buscar adesão médica com ID ${id}:`, error);
    throw error;
  }
}

export async function createEmployeeMedicalPlan(
  employeePlanData: EmployeeMedicalPlanCreateData
): Promise<EmployeeMedicalPlan> {
  try {
    return await EntityService.create<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId: employeePlanData.company_id,
      data: employeePlanData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de adesão médica:', error);
    throw error;
  }
}

export async function updateEmployeeMedicalPlan(
  employeePlanData: EmployeeMedicalPlanUpdateData
): Promise<EmployeeMedicalPlan> {
  try {
    return await EntityService.update<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId: employeePlanData.company_id,
      id: employeePlanData.id,
      data: employeePlanData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de adesão médica com ID ${employeePlanData.id}:`, error);
    throw error;
  }
}

export async function deleteEmployeeMedicalPlan(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de adesão médica com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// DEPENDENTES DOS PLANOS
// =====================================================

export async function getEmployeePlanDependents(
  companyId: string,
  filters: EmployeePlanDependentFilters = {}
): Promise<{ data: EmployeePlanDependent[]; totalCount: number }> {
  try {
    const result = await EntityService.list<EmployeePlanDependent>({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId,
      filters,
      orderBy: 'nome',
      orderDirection: 'ASC',
      foreignTable: 'rh.employee_medical_plans(id, data_inicio, status)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de dependentes médicos:', error);
    throw error;
  }
}

export async function getEmployeePlanDependentById(
  companyId: string,
  id: string
): Promise<EmployeePlanDependent | null> {
  try {
    return await EntityService.getById<EmployeePlanDependent>({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId,
      id,
      foreignTable: 'rh.employee_medical_plans(id, data_inicio, status)'
    });
  } catch (error) {
    console.error(`Erro ao buscar dependente médico com ID ${id}:`, error);
    throw error;
  }
}

export async function createEmployeePlanDependent(
  dependentData: EmployeePlanDependentCreateData
): Promise<EmployeePlanDependent> {
  try {
    return await EntityService.create<EmployeePlanDependent>({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId: dependentData.company_id,
      data: dependentData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de dependente médico:', error);
    throw error;
  }
}

export async function updateEmployeePlanDependent(
  dependentData: EmployeePlanDependentUpdateData
): Promise<EmployeePlanDependent> {
  try {
    return await EntityService.update<EmployeePlanDependent>({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId: dependentData.company_id,
      id: dependentData.id,
      data: dependentData
    });
  } catch (error) {
    console.error(`Erro no serviço de atualização de dependente médico com ID ${dependentData.id}:`, error);
    throw error;
  }
}

export async function deleteEmployeePlanDependent(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId,
      id
    });
  } catch (error) {
    console.error(`Erro no serviço de exclusão de dependente médico com ID ${id}:`, error);
    throw error;
  }
}

// =====================================================
// HISTÓRICO DE PREÇOS
// =====================================================

export async function getMedicalPlanPricingHistory(
  companyId: string,
  filters: MedicalPlanPricingHistoryFilters = {}
): Promise<{ data: MedicalPlanPricingHistory[]; totalCount: number }> {
  try {
    const result = await EntityService.list<MedicalPlanPricingHistory>({
      schema: SCHEMA,
      table: 'medical_plan_pricing_history',
      companyId,
      filters,
      orderBy: 'data_vigencia',
      orderDirection: 'DESC',
      foreignTable: 'rh.medical_plans(id, nome), public.users(id, full_name)'
    });
    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de histórico de preços médicos:', error);
    throw error;
  }
}

export async function createMedicalPlanPricingHistory(
  pricingData: MedicalPlanPricingHistoryCreateData
): Promise<MedicalPlanPricingHistory> {
  try {
    return await EntityService.create<MedicalPlanPricingHistory>({
      schema: SCHEMA,
      table: 'medical_plan_pricing_history',
      companyId: pricingData.company_id,
      data: pricingData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de histórico de preços médicos:', error);
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

export function getAgreementTypeLabel(tipo: string): string {
  const types = {
    medico: 'Médico',
    odontologico: 'Odontológico',
    ambos: 'Médico + Odontológico'
  };
  return types[tipo as keyof typeof types] || tipo;
}

export function getAgreementTypeColor(tipo: string): string {
  const colors = {
    medico: 'bg-blue-100 text-blue-800',
    odontologico: 'bg-green-100 text-green-800',
    ambos: 'bg-purple-100 text-purple-800'
  };
  return colors[tipo as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getPlanCategoryLabel(categoria: string): string {
  const categories = {
    basico: 'Básico',
    intermediario: 'Intermediário',
    premium: 'Premium',
    executivo: 'Executivo',
    familia: 'Família',
    individual: 'Individual'
  };
  return categories[categoria as keyof typeof categories] || categoria;
}

export function getPlanCategoryColor(categoria: string): string {
  const colors = {
    basico: 'bg-gray-100 text-gray-800',
    intermediario: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    executivo: 'bg-gold-100 text-gold-800',
    familia: 'bg-green-100 text-green-800',
    individual: 'bg-orange-100 text-orange-800'
  };
  return colors[categoria as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getPlanStatusLabel(status: string): string {
  const statuses = {
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
    transferido: 'Transferido'
  };
  return statuses[status as keyof typeof statuses] || status;
}

export function getPlanStatusColor(status: string): string {
  const colors = {
    ativo: 'bg-green-100 text-green-800',
    suspenso: 'bg-yellow-100 text-yellow-800',
    cancelado: 'bg-red-100 text-red-800',
    transferido: 'bg-blue-100 text-blue-800'
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getDependentParentescoLabel(parentesco: string): string {
  const parentescos = {
    conjuge: 'Cônjuge',
    filho: 'Filho',
    filha: 'Filha',
    pai: 'Pai',
    mae: 'Mãe',
    outros: 'Outros'
  };
  return parentescos[parentesco as keyof typeof parentescos] || parentesco;
}

export async function getMedicalAgreementsStats(companyId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_medical_agreements_stats', { p_company_id: companyId });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching medical agreements stats:', error);
    throw error;
  }
}
