// =====================================================
// SERVIÇO DE BENEFÍCIOS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  Benefit, 
  BenefitCreateData, 
  BenefitUpdateData, 
  BenefitFilters,
  EmployeeBenefit,
  EmployeeBenefitCreateData,
  EmployeeBenefitUpdateData,
  EmployeeBenefitFilters,
  BenefitHistory,
  BenefitHistoryFilters
} from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD - BENEFÍCIOS
// =====================================================

export async function getBenefits(
  companyId: string,
  filters: BenefitFilters = {}
): Promise<{ data: Benefit[]; totalCount: number }> {
  try {
    const result = await EntityService.list<Benefit>({
      schema: 'rh',
      table: 'benefits',
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
    console.error('Erro no serviço de benefícios:', error);
    throw error;
  }
}

export async function getBenefitById(
  id: string,
  companyId: string
): Promise<Benefit | null> {
  try {
    return await EntityService.getById<Benefit>({
      schema: 'rh',
      table: 'benefits',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios:', error);
    throw error;
  }
}

export async function createBenefit(
  benefitData: BenefitCreateData
): Promise<Benefit> {
  try {
    return await EntityService.create<Benefit>({
      schema: 'rh',
      table: 'benefits',
      companyId: benefitData.company_id,
      data: benefitData
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios:', error);
    throw error;
  }
}

export async function updateBenefit(
  benefitData: BenefitUpdateData
): Promise<Benefit> {
  try {
    const { id, company_id, ...updateData } = benefitData;

    return await EntityService.update<Benefit>({
      schema: 'rh',
      table: 'benefits',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios:', error);
    throw error;
  }
}

export async function deleteBenefit(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'benefits',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CRUD - BENEFÍCIOS DO FUNCIONÁRIO
// =====================================================

export async function getEmployeeBenefits(
  companyId: string,
  filters: EmployeeBenefitFilters = {}
): Promise<{ data: EmployeeBenefit[]; totalCount: number }> {
  try {
    const result = await EntityService.list<EmployeeBenefit>({
      schema: 'rh',
      table: 'employee_benefits',
      companyId,
      filters,
      orderBy: 'data_inicio',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de benefícios do funcionário:', error);
    throw error;
  }
}

export async function getEmployeeBenefitById(
  id: string,
  companyId: string
): Promise<EmployeeBenefit | null> {
  try {
    return await EntityService.getById<EmployeeBenefit>({
      schema: 'rh',
      table: 'employee_benefits',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios do funcionário:', error);
    throw error;
  }
}

export async function createEmployeeBenefit(
  employeeBenefitData: EmployeeBenefitCreateData
): Promise<EmployeeBenefit> {
  try {
    return await EntityService.create<EmployeeBenefit>({
      schema: 'rh',
      table: 'employee_benefits',
      companyId: employeeBenefitData.company_id,
      data: employeeBenefitData
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios do funcionário:', error);
    throw error;
  }
}

export async function updateEmployeeBenefit(
  employeeBenefitData: EmployeeBenefitUpdateData
): Promise<EmployeeBenefit> {
  try {
    const { id, company_id, ...updateData } = employeeBenefitData;

    return await EntityService.update<EmployeeBenefit>({
      schema: 'rh',
      table: 'employee_benefits',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios do funcionário:', error);
    throw error;
  }
}

export async function deleteEmployeeBenefit(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'employee_benefits',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de benefícios do funcionário:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getBenefitTypeLabel(tipo: string): string {
  const tipos = {
    vale_alimentacao: 'Vale Alimentação',
    vale_refeicao: 'Vale Refeição',
    vale_transporte: 'Vale Transporte',
    plano_saude: 'Plano de Saúde',
    plano_odonto: 'Plano Odontológico',
    seguro_vida: 'Seguro de Vida',
    auxilio_creche: 'Auxílio Creche',
    auxilio_educacao: 'Auxílio Educação',
    gympass: 'Gympass',
    outros: 'Outros'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getBenefitTypeColor(tipo: string): string {
  const cores = {
    vale_alimentacao: 'bg-green-100 text-green-800',
    vale_refeicao: 'bg-orange-100 text-orange-800',
    vale_transporte: 'bg-blue-100 text-blue-800',
    plano_saude: 'bg-red-100 text-red-800',
    plano_odonto: 'bg-purple-100 text-purple-800',
    seguro_vida: 'bg-gray-100 text-gray-800',
    auxilio_creche: 'bg-pink-100 text-pink-800',
    auxilio_educacao: 'bg-indigo-100 text-indigo-800',
    gympass: 'bg-yellow-100 text-yellow-800',
    outros: 'bg-gray-100 text-gray-800'
  };
  return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getBenefitCalculationTypeLabel(tipo: string): string {
  const tipos = {
    valor_fixo: 'Valor Fixo',
    percentual_salario: 'Percentual do Salário',
    tabela_faixas: 'Tabela de Faixas'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getBenefitCategoryLabel(categoria: string): string {
  const categorias = {
    geral: 'Geral',
    executivo: 'Executivo',
    operacional: 'Operacional',
    terceirizado: 'Terceirizado'
  };
  return categorias[categoria as keyof typeof categorias] || categoria;
}

export function getEmployeeBenefitStatusLabel(status: string): string {
  const statusMap = {
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
    finalizado: 'Finalizado'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getEmployeeBenefitStatusColor(status: string): string {
  const cores = {
    ativo: 'bg-green-100 text-green-800',
    suspenso: 'bg-yellow-100 text-yellow-800',
    cancelado: 'bg-red-100 text-red-800',
    finalizado: 'bg-gray-100 text-gray-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DOS BENEFÍCIOS
// =====================================================

export async function getEmployeeBenefitsByEmployee(
  employeeId: string,
  companyId: string
): Promise<EmployeeBenefit[]> {
  try {
    const result = await EntityService.list<EmployeeBenefit>({
      schema: 'rh',
      table: 'employee_benefits',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'data_inicio',
      orderDirection: 'DESC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar benefícios do funcionário:', error);
    throw error;
  }
}

export async function getActiveBenefits(
  companyId: string
): Promise<Benefit[]> {
  try {
    const result = await EntityService.list<Benefit>({
      schema: 'rh',
      table: 'benefits',
      companyId,
      filters: { ativo: true },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar benefícios ativos:', error);
    throw error;
  }
}

export async function getBenefitsByType(
  companyId: string,
  tipo: string
): Promise<Benefit[]> {
  try {
    const result = await EntityService.list<Benefit>({
      schema: 'rh',
      table: 'benefits',
      companyId,
      filters: { tipo: tipo },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar benefícios por tipo:', error);
    throw error;
  }
}

export async function getBenefitStats(companyId: string) {
  try {
    const [benefitsResult, employeeBenefitsResult] = await Promise.all([
      getBenefits(companyId),
      getEmployeeBenefits(companyId)
    ]);

    const benefits = benefitsResult.data;
    const employeeBenefits = employeeBenefitsResult.data;

    const stats = {
      total_benefits: benefits.length,
      active_benefits: benefits.filter(b => b.ativo).length,
      total_employee_benefits: employeeBenefits.length,
      active_employee_benefits: employeeBenefits.filter(eb => eb.status === 'ativo').length,
      by_type: benefits.reduce((acc, benefit) => {
        acc[benefit.tipo] = (acc[benefit.tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_category: benefits.reduce((acc, benefit) => {
        acc[benefit.categoria] = (acc[benefit.categoria] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_status: employeeBenefits.reduce((acc, eb) => {
        acc[eb.status] = (acc[eb.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      total_monthly_cost: employeeBenefits
        .filter(eb => eb.status === 'ativo' && eb.valor_beneficio)
        .reduce((sum, eb) => sum + (eb.valor_beneficio || 0), 0)
    };

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos benefícios:', error);
    throw error;
  }
}

export async function calculateBenefitValue(
  benefit: Benefit,
  employeeSalary?: number
): Promise<number> {
  try {
    if (benefit.tipo_calculo === 'valor_fixo') {
      return benefit.valor_mensal || 0;
    } else if (benefit.tipo_calculo === 'percentual_salario' && employeeSalary && benefit.valor_percentual) {
      return (employeeSalary * benefit.valor_percentual) / 100;
    } else if (benefit.tipo_calculo === 'tabela_faixas') {
      // Implementar lógica para tabela de faixas
      return benefit.valor_mensal || 0;
    }
    return 0;
  } catch (error) {
    console.error('Erro ao calcular valor do benefício:', error);
    throw error;
  }
}

export async function validateBenefitAssignment(
  employeeId: string,
  benefitId: string,
  companyId: string
): Promise<{ valid: boolean; message: string }> {
  try {
    // Verificar se o funcionário já possui este benefício ativo
    const existingBenefits = await getEmployeeBenefits(companyId, {
      employee_id: employeeId,
      benefit_id: benefitId,
      status: 'ativo'
    });

    if (existingBenefits.data.length > 0) {
      return {
        valid: false,
        message: 'Funcionário já possui este benefício ativo'
      };
    }

    // Verificar se o benefício está ativo
    const benefit = await getBenefitById(benefitId, companyId);
    if (!benefit || !benefit.ativo) {
      return {
        valid: false,
        message: 'Benefício não está ativo'
      };
    }

    return {
      valid: true,
      message: 'Benefício pode ser atribuído'
    };
  } catch (error) {
    console.error('Erro ao validar atribuição de benefício:', error);
    return {
      valid: false,
      message: 'Erro ao validar atribuição'
    };
  }
}