// =====================================================
// SERVIÇO DE CÁLCULO DE BENEFÍCIOS COM DIAS REAIS
// =====================================================

import { supabase } from '@/integrations/supabase/client';

export interface BenefitCalculationParams {
  companyId: string;
  employeeId: string;
  benefitConfigId: string;
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface WorkingDaysCalculationParams {
  companyId: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Calcula dias trabalhados reais de um funcionário
 * Considera: escala de trabalho, feriados, férias, licença médica
 */
export async function calculateWorkingDays(
  params: WorkingDaysCalculationParams
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_working_days_for_benefits', {
      company_id_param: params.companyId,
      employee_id_param: params.employeeId,
      start_date_param: params.startDate.toISOString().split('T')[0],
      end_date_param: params.endDate.toISOString().split('T')[0]
    });

    if (error) {
      console.error('Erro ao calcular dias trabalhados:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Erro ao calcular dias trabalhados:', error);
    return 0;
  }
}

/**
 * Calcula valor de benefício diário baseado em dias trabalhados reais
 */
export async function calculateDailyBenefitValue(
  params: BenefitCalculationParams
): Promise<number> {
  try {
    // Se não tem datas, calcular para o mês atual
    let startDate: Date;
    let endDate: Date;

    if (params.startDate && params.endDate) {
      startDate = params.startDate;
      endDate = params.endDate;
    } else if (params.month && params.year) {
      startDate = new Date(params.year, params.month - 1, 1);
      endDate = new Date(params.year, params.month, 0); // Último dia do mês
    } else {
      // Mês atual
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const { data, error } = await supabase.rpc('calculate_daily_benefit_value', {
      company_id_param: params.companyId,
      employee_id_param: params.employeeId,
      benefit_config_id_param: params.benefitConfigId,
      start_date_param: startDate.toISOString().split('T')[0],
      end_date_param: endDate.toISOString().split('T')[0]
    });

    if (error) {
      console.error('Erro ao calcular valor do benefício diário:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Erro ao calcular valor do benefício diário:', error);
    return 0;
  }
}

/**
 * Calcula dias trabalhados para um mês específico
 */
export async function calculateWorkingDaysForMonth(
  companyId: string,
  employeeId: string,
  month: number,
  year: number
): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Último dia do mês

  return calculateWorkingDays({
    companyId,
    employeeId,
    startDate,
    endDate
  });
}

export const BenefitCalculationService = {
  calculateWorkingDays,
  calculateDailyBenefitValue,
  calculateWorkingDaysForMonth
};

