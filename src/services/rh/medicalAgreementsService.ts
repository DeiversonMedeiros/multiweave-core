// =====================================================
// SERVIÇO PARA CONVÊNIOS MÉDICOS E ODONTOLÓGICOS
// =====================================================

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
  agreementData: Omit<MedicalAgreementCreateData, 'company_id'>,
  companyId: string
): Promise<MedicalAgreement> {
  try {
    const dataWithCompanyId = {
      ...agreementData,
      company_id: companyId
    };
    return await EntityService.create<MedicalAgreement>({
      schema: SCHEMA,
      table: 'medical_agreements',
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de criação de convênio médico:', error);
    throw error;
  }
}

export async function updateMedicalAgreement(
  agreementData: Omit<MedicalAgreementUpdateData, 'company_id'>,
  companyId: string
): Promise<MedicalAgreement> {
  try {
    const dataWithCompanyId = {
      ...agreementData,
      company_id: companyId
    };
    return await EntityService.update<MedicalAgreement>({
      schema: SCHEMA,
      table: 'medical_agreements',
      companyId,
      id: agreementData.id,
      data: dataWithCompanyId
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
    const plan = await EntityService.getById<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId,
      id
    });
    
    // Se o plano foi encontrado e tem agreement_id, buscar o convênio
    if (plan && plan.agreement_id) {
      try {
        const agreement = await getMedicalAgreementById(companyId, plan.agreement_id);
        if (agreement) {
          plan.agreement = agreement;
        }
      } catch (error) {
        console.warn(`Erro ao buscar convênio para o plano ${id}:`, error);
        // Continuar mesmo se não conseguir buscar o convênio
      }
    }
    
    return plan;
  } catch (error) {
    console.error(`Erro ao buscar plano médico com ID ${id}:`, error);
    throw error;
  }
}

export async function createMedicalPlan(
  planData: Omit<MedicalPlanCreateData, 'company_id'>,
  companyId: string
): Promise<MedicalPlan> {
  try {
    const dataWithCompanyId = {
      ...planData,
      company_id: companyId
    };
    return await EntityService.create<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de criação de plano médico:', error);
    throw error;
  }
}

export async function updateMedicalPlan(
  planData: Omit<MedicalPlanUpdateData, 'company_id'>,
  companyId: string
): Promise<MedicalPlan> {
  try {
    const dataWithCompanyId = {
      ...planData,
      company_id: companyId
    };
    return await EntityService.update<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      companyId,
      id: planData.id,
      data: dataWithCompanyId
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
      foreignTable: 'rh.employees(id, nome, matricula), rh.medical_plans(id, nome, categoria, agreement_id)'
    });
    
    // Garantir que os planos venham com os agreements populados
    if (result.data && result.data.length > 0) {
      const plansWithAgreements = await Promise.all(
        result.data.map(async (employeePlan) => {
          // Se o plano não veio populado ou não tem agreement, buscar separadamente
          if (employeePlan.plan_id && (!employeePlan.plan || !employeePlan.plan.agreement)) {
            const plan = await getMedicalPlanById(companyId, employeePlan.plan_id);
            if (plan) {
              employeePlan.plan = plan;
            }
          }
          return employeePlan;
        })
      );
      
      return {
        data: plansWithAgreements,
        totalCount: result.totalCount,
      };
    }
    
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
    const result = await EntityService.getById<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId,
      id
    });
    
    console.log('📋 [getEmployeeMedicalPlanById] Resultado:', {
      id: result?.id,
      plan_id: result?.plan_id,
      hasPlan: !!result?.plan,
      plan: result?.plan
    });
    
    // Se o plan não veio populado, buscar separadamente
    if (result && result.plan_id && !result.plan) {
      console.log('🔄 [getEmployeeMedicalPlanById] Plan não veio populado, buscando separadamente...');
      const plan = await getMedicalPlanById(companyId, result.plan_id);
      if (plan) {
        result.plan = plan;
        console.log('✅ [getEmployeeMedicalPlanById] Plan carregado:', plan);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`❌ [getEmployeeMedicalPlanById] Erro ao buscar adesão médica com ID ${id}:`, error);
    throw error;
  }
}

export async function createEmployeeMedicalPlan(
  employeePlanData: Omit<EmployeeMedicalPlanCreateData, 'company_id'>,
  companyId: string
): Promise<EmployeeMedicalPlan> {
  try {
    const dataWithCompanyId = {
      ...employeePlanData,
      company_id: companyId
    };
    return await EntityService.create<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de criação de adesão médica:', error);
    throw error;
  }
}

export async function updateEmployeeMedicalPlan(
  employeePlanData: Omit<EmployeeMedicalPlanUpdateData, 'company_id'>,
  companyId: string
): Promise<EmployeeMedicalPlan> {
  try {
    const dataWithCompanyId = {
      ...employeePlanData,
      company_id: companyId
    };
    return await EntityService.update<EmployeeMedicalPlan>({
      schema: SCHEMA,
      table: 'employee_medical_plans',
      companyId,
      id: employeePlanData.id,
      data: dataWithCompanyId
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
  dependentData: Omit<EmployeePlanDependentCreateData, 'company_id'>,
  companyId: string
): Promise<EmployeePlanDependent> {
  try {
    const dataWithCompanyId = {
      ...dependentData,
      company_id: companyId
    };
    return await EntityService.create<EmployeePlanDependent>({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de criação de dependente médico:', error);
    throw error;
  }
}

export async function updateEmployeePlanDependent(
  dependentData: Omit<EmployeePlanDependentUpdateData, 'company_id'>,
  companyId: string
): Promise<EmployeePlanDependent> {
  try {
    const dataWithCompanyId = {
      ...dependentData,
      company_id: companyId
    };
    return await EntityService.update<EmployeePlanDependent>({
      schema: SCHEMA,
      table: 'employee_plan_dependents',
      companyId,
      id: dependentData.id,
      data: dataWithCompanyId
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
  pricingData: Omit<MedicalPlanPricingHistoryCreateData, 'company_id'>,
  companyId: string
): Promise<MedicalPlanPricingHistory> {
  try {
    const dataWithCompanyId = {
      ...pricingData,
      company_id: companyId
    };
    return await EntityService.create<MedicalPlanPricingHistory>({
      schema: SCHEMA,
      table: 'medical_plan_pricing_history',
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de criação de histórico de preços médicos:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

// =====================================================
// FAIXAS ETÁRIAS DE PLANOS MÉDICOS
// =====================================================

export async function getMedicalPlanAgeRanges(
  companyId: string,
  filters: MedicalPlanAgeRangeFilters = {}
): Promise<{ data: MedicalPlanAgeRange[]; totalCount: number }> {
  try {
    console.log('🔍 [getMedicalPlanAgeRanges] Buscando faixas etárias:', {
      companyId,
      filters
    });
    
    // Buscar todas as faixas da empresa primeiro (sem filtros específicos)
    const result = await EntityService.list<MedicalPlanAgeRange>({
      schema: SCHEMA,
      table: 'medical_plan_age_ranges',
      companyId,
      filters: {}, // Buscar todas primeiro
      orderBy: 'ordem',
      orderDirection: 'ASC'
    });
    
    console.log('📦 [getMedicalPlanAgeRanges] Todas as faixas encontradas:', {
      totalCount: result.totalCount,
      dataLength: result.data.length,
      data: result.data.map(r => ({
        id: r.id,
        plan_id: r.plan_id,
        idade_min: r.idade_min,
        idade_max: r.idade_max,
        valor_titular: r.valor_titular,
        valor_dependente: r.valor_dependente,
        ativo: r.ativo
      }))
    });
    
    // Aplicar filtros manualmente
    let filteredData = result.data;
    
    if (filters.plan_id) {
      filteredData = filteredData.filter(range => range.plan_id === filters.plan_id);
      console.log('🔍 [getMedicalPlanAgeRanges] Após filtrar por plan_id:', {
        plan_id: filters.plan_id,
        filteredCount: filteredData.length
      });
    }
    
    if (filters.ativo !== undefined) {
      filteredData = filteredData.filter(range => range.ativo === filters.ativo);
      console.log('🔍 [getMedicalPlanAgeRanges] Após filtrar por ativo:', {
        ativo: filters.ativo,
        filteredCount: filteredData.length
      });
    }
    
    console.log('✅ [getMedicalPlanAgeRanges] Resultado final:', {
      totalCount: filteredData.length,
      dataLength: filteredData.length,
      data: filteredData.map(r => ({
        id: r.id,
        plan_id: r.plan_id,
        idade_min: r.idade_min,
        idade_max: r.idade_max,
        valor_titular: r.valor_titular,
        valor_dependente: r.valor_dependente,
        ativo: r.ativo
      }))
    });
    
    return {
      data: filteredData,
      totalCount: filteredData.length,
    };
  } catch (error) {
    console.error('❌ [getMedicalPlanAgeRanges] Erro ao buscar faixas etárias:', error);
    throw error;
  }
}

export async function getMedicalPlanAgeRangeById(
  companyId: string,
  id: string
): Promise<MedicalPlanAgeRange | null> {
  try {
    return await EntityService.getById<MedicalPlanAgeRange>({
      schema: SCHEMA,
      table: 'medical_plan_age_ranges',
      id,
      companyId
    });
  } catch (error) {
    console.error(`Erro ao buscar faixa etária com ID ${id}:`, error);
    throw error;
  }
}

export async function createMedicalPlanAgeRange(
  ageRangeData: Omit<MedicalPlanAgeRangeCreateData, 'company_id'>,
  companyId: string
): Promise<MedicalPlanAgeRange> {
  try {
    const dataWithCompanyId = {
      ...ageRangeData,
      company_id: companyId
    };
    return await EntityService.create<MedicalPlanAgeRange>({
      schema: SCHEMA,
      table: 'medical_plan_age_ranges',
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de criação de faixa etária:', error);
    throw error;
  }
}

export async function updateMedicalPlanAgeRange(
  ageRangeData: Omit<MedicalPlanAgeRangeUpdateData, 'company_id'>,
  companyId: string
): Promise<MedicalPlanAgeRange> {
  try {
    const { id, ...updateData } = ageRangeData;
    const dataWithCompanyId = {
      ...updateData,
      company_id: companyId
    };
    return await EntityService.update<MedicalPlanAgeRange>({
      schema: SCHEMA,
      table: 'medical_plan_age_ranges',
      id,
      companyId,
      data: dataWithCompanyId
    });
  } catch (error) {
    console.error('Erro no serviço de atualização de faixa etária:', error);
    throw error;
  }
}

export async function deleteMedicalPlanAgeRange(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: SCHEMA,
      table: 'medical_plan_age_ranges',
      id,
      companyId
    });
  } catch (error) {
    console.error(`Erro ao excluir faixa etária com ID ${id}:`, error);
    throw error;
  }
}

/**
 * Calcula a idade a partir de uma data de nascimento
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  console.log('🎂 [calculateAge] Entrada:', {
    birthDate,
    tipo: typeof birthDate,
    isString: typeof birthDate === 'string',
    isDate: birthDate instanceof Date
  });
  
  if (!birthDate) {
    console.warn('⚠️ [calculateAge] birthDate é null/undefined');
    return null;
  }
  
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  console.log('📅 [calculateAge] Data convertida:', {
    birth,
    isValid: !isNaN(birth.getTime()),
    timestamp: birth.getTime()
  });
  
  if (isNaN(birth.getTime())) {
    console.warn('⚠️ [calculateAge] Data inválida');
    return null;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  console.log('✅ [calculateAge] Idade calculada:', {
    age,
    today: today.toISOString(),
    birth: birth.toISOString(),
    monthDiff
  });
  
  return age;
}

/**
 * Obtém o valor do plano baseado na idade
 * Primeiro tenta buscar em faixas etárias específicas, depois usa valor padrão
 */
export async function getPlanValueByAge(
  planId: string,
  age: number | null,
  tipo: 'titular' | 'dependente' = 'titular',
  companyId: string
): Promise<number> {
  console.log('🎯 [getPlanValueByAge] INÍCIO - Parâmetros recebidos:', {
    planId,
    age,
    tipo,
    companyId,
    ageType: typeof age,
    ageIsNull: age === null,
    ageIsUndefined: age === undefined
  });
  
  try {
    // Se não tem idade, usar valor padrão
    if (age === null || age === undefined) {
      console.warn('⚠️ [getPlanValueByAge] Idade é null/undefined, buscando valor padrão do plano');
      const plan = await EntityService.getById<MedicalPlan>({
        schema: SCHEMA,
        table: 'medical_plans',
        id: planId,
        companyId
      });
      
      if (!plan) {
        console.warn('⚠️ [getPlanValueByAge] Plano não encontrado');
        return 0;
      }
      const valor = tipo === 'titular' ? plan.valor_titular : plan.valor_dependente;
      console.log('💰 [getPlanValueByAge] Valor padrão do plano:', valor);
      return valor;
    }
    
    console.log('🔍 [getPlanValueByAge] Buscando faixas etárias...');
    
    // Buscar faixas etárias do plano (sem filtro ativo primeiro para debug)
    const ageRangesResult = await getMedicalPlanAgeRanges(companyId, { 
      plan_id: planId
    });
    
    console.log('📦 [getPlanValueByAge] Resultado da busca de faixas:', {
      totalEncontradas: ageRangesResult.data.length,
      todasAsFaixas: ageRangesResult.data
    });
    
    // Filtrar apenas as ativas manualmente
    const ageRanges = {
      data: ageRangesResult.data.filter(range => {
        const isAtivo = range.ativo === true;
        console.log('🔍 [getPlanValueByAge] Verificando faixa:', {
          id: range.id,
          plan_id: range.plan_id,
          idade_min: range.idade_min,
          idade_max: range.idade_max,
          ativo: range.ativo,
          isAtivo,
          planIdMatch: range.plan_id === planId
        });
        return isAtivo;
      }),
      totalCount: ageRangesResult.data.filter(range => range.ativo === true).length
    };
    
    console.log('✅ [getPlanValueByAge] Faixas ativas filtradas:', {
      totalAgeRanges: ageRanges.data.length,
      ageRanges: ageRanges.data.map(r => ({
        id: r.id,
        plan_id: r.plan_id,
        idade_min: r.idade_min,
        idade_max: r.idade_max,
        valor_titular: r.valor_titular,
        valor_dependente: r.valor_dependente,
        ativo: r.ativo,
        idadeDentroDaFaixa: age >= r.idade_min && age <= r.idade_max
      }))
    });
    
    // Procurar faixa que contém a idade
    console.log('🔍 [getPlanValueByAge] Procurando faixa para idade:', age);
    const matchingRange = ageRanges.data.find(range => {
      const matches = age >= range.idade_min && age <= range.idade_max;
      console.log('🔍 [getPlanValueByAge] Comparando:', {
        idade: age,
        idade_min: range.idade_min,
        idade_max: range.idade_max,
        condicao1: `${age} >= ${range.idade_min}`,
        condicao1Result: age >= range.idade_min,
        condicao2: `${age} <= ${range.idade_max}`,
        condicao2Result: age <= range.idade_max,
        matches
      });
      return matches;
    });
    
    console.log('🎯 [getPlanValueByAge] Faixa encontrada:', matchingRange ? {
      id: matchingRange.id,
      idade_min: matchingRange.idade_min,
      idade_max: matchingRange.idade_max,
      valor_titular: matchingRange.valor_titular,
      valor_dependente: matchingRange.valor_dependente,
      valor_retornado: tipo === 'titular' ? matchingRange.valor_titular : matchingRange.valor_dependente
    } : '❌ Nenhuma faixa encontrada');
    
    if (matchingRange) {
      const valor = tipo === 'titular' 
        ? matchingRange.valor_titular 
        : matchingRange.valor_dependente;
      console.log('✅ [getPlanValueByAge] Retornando valor da faixa:', valor);
      return valor;
    }
    
    // Se não encontrou faixa específica, usar valor padrão do plano
    console.warn('⚠️ [getPlanValueByAge] Nenhuma faixa encontrada, usando valor padrão do plano');
    const plan = await EntityService.getById<MedicalPlan>({
      schema: SCHEMA,
      table: 'medical_plans',
      id: planId,
      companyId
    });
    
    if (!plan) {
      console.warn('⚠️ [getPlanValueByAge] Plano não encontrado, retornando 0');
      return 0;
    }
    
    const valorPadrao = tipo === 'titular' ? plan.valor_titular : plan.valor_dependente;
    console.log('💰 [getPlanValueByAge] Retornando valor padrão do plano:', valorPadrao);
    return valorPadrao;
  } catch (error) {
    console.error('❌ [getPlanValueByAge] Erro ao buscar valor do plano por idade:', error);
    console.error('❌ [getPlanValueByAge] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    // Em caso de erro, retornar valor padrão
    try {
      console.log('🔄 [getPlanValueByAge] Tentando buscar valor padrão do plano após erro...');
      const plan = await EntityService.getById<MedicalPlan>({
        schema: SCHEMA,
        table: 'medical_plans',
        id: planId,
        companyId
      });
      if (!plan) {
        console.warn('⚠️ [getPlanValueByAge] Plano não encontrado após erro, retornando 0');
        return 0;
      }
      const valorPadrao = tipo === 'titular' ? plan.valor_titular : plan.valor_dependente;
      console.log('💰 [getPlanValueByAge] Retornando valor padrão após erro:', valorPadrao);
      return valorPadrao;
    } catch (innerError) {
      console.error('❌ [getPlanValueByAge] Erro ao buscar valor padrão:', innerError);
      return 0;
    }
  }
}

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
    // Buscar estatísticas básicas usando EntityService
    const [agreementsResult, plansResult, employeePlansResult] = await Promise.all([
      EntityService.list<MedicalAgreement>({
        schema: SCHEMA,
        table: 'medical_agreements',
        companyId,
        filters: { ativo: true },
        orderBy: 'nome',
        orderDirection: 'ASC'
      }),
      EntityService.list<MedicalPlan>({
        schema: SCHEMA,
        table: 'medical_plans',
        companyId,
        filters: { ativo: true },
        orderBy: 'nome',
        orderDirection: 'ASC'
      }),
      EntityService.list<EmployeeMedicalPlan>({
        schema: SCHEMA,
        table: 'employee_medical_plans',
        companyId,
        filters: { status: 'ativo' },
        orderBy: 'data_inicio',
        orderDirection: 'DESC'
      })
    ]);

    const totalAgreements = agreementsResult.data?.length || 0;
    const totalPlans = plansResult.data?.length || 0;
    const activeEmployeePlans = employeePlansResult.data?.length || 0;
    const totalMonthlyValue = employeePlansResult.data?.reduce((sum, plan) => sum + (plan.valor_mensal || 0), 0) || 0;

    return {
      total_agreements: totalAgreements,
      total_plans: totalPlans,
      active_employee_plans: activeEmployeePlans,
      total_monthly_value: totalMonthlyValue
    };
  } catch (error) {
    console.error('Error fetching medical agreements stats:', error);
    throw error;
  }
}
