// =====================================================
// SERVIÇO DE CONVÊNIOS MÉDICOS NA FOLHA DE PAGAMENTO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { MedicalAgreement, MedicalPlan, EmployeeMedicalPlan } from '@/integrations/supabase/rh-types';

export interface MedicalPlanDiscount {
  id: string;
  employee_id: string;
  plan_id: string;
  plan_name: string;
  agreement_name: string;
  plan_type: string;
  category: string;
  discount_type: string;
  monthly_value: number;
  final_value: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  enters_payroll: boolean;
}

export interface MedicalPlanBenefit {
  id: string;
  employee_id: string;
  plan_id: string;
  plan_name: string;
  agreement_name: string;
  plan_type: string;
  category: string;
  monthly_value: number;
  final_value: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  enters_payroll: boolean;
}

export const MedicalPlansPayrollService = {
  /**
   * Busca descontos de convênios médicos de um funcionário
   */
  getEmployeeMedicalDiscounts: async (
    companyId: string,
    employeeId?: string
  ): Promise<MedicalPlanDiscount[]> => {
    try {
      const { data, error } = await supabase.rpc('get_employee_medical_plan_discounts_only', {
        company_id_param: companyId,
        employee_id_param: employeeId || null
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar descontos de convênios médicos:', error);
      throw error;
    }
  },

  /**
   * Busca benefícios de convênios médicos de um funcionário
   */
  getEmployeeMedicalBenefits: async (
    companyId: string,
    employeeId?: string
  ): Promise<MedicalPlanBenefit[]> => {
    try {
      const { data, error } = await supabase.rpc('get_employee_medical_plan_discounts', {
        company_id_param: companyId,
        employee_id_param: employeeId || null
      });

      if (error) throw error;
      
      // Filtrar apenas os benefícios (proventos)
      return (data || []).filter(benefit => benefit.discount_type === 'provento');
    } catch (error) {
      console.error('Erro ao buscar benefícios de convênios médicos:', error);
      throw error;
    }
  },

  /**
   * Busca todos os convênios médicos de um funcionário (descontos + benefícios)
   */
  getAllEmployeeMedicalPlans: async (
    companyId: string,
    employeeId?: string
  ): Promise<MedicalPlanDiscount[]> => {
    try {
      const { data, error } = await supabase.rpc('get_employee_all_medical_plans', {
        company_id_param: companyId,
        employee_id_param: employeeId || null
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar convênios médicos:', error);
      throw error;
    }
  },

  /**
   * Calcula total de descontos de convênios médicos
   */
  calculateMedicalDiscountsTotal: async (
    companyId: string,
    employeeId: string
  ): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_medical_plan_discounts_total', {
        company_id_param: companyId,
        employee_id_param: employeeId
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Erro ao calcular total de descontos:', error);
      throw error;
    }
  },

  /**
   * Calcula total de benefícios de convênios médicos
   */
  calculateMedicalBenefitsTotal: async (
    companyId: string,
    employeeId: string
  ): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_medical_plan_benefits_total', {
        company_id_param: companyId,
        employee_id_param: employeeId
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Erro ao calcular total de benefícios:', error);
      throw error;
    }
  },

  /**
   * Calcula total geral de convênios médicos (benefícios - descontos)
   */
  calculateMedicalPlansNetTotal: async (
    companyId: string,
    employeeId: string
  ): Promise<{ benefits: number; discounts: number; net: number }> => {
    try {
      const [benefits, discounts] = await Promise.all([
        this.calculateMedicalBenefitsTotal(companyId, employeeId),
        this.calculateMedicalDiscountsTotal(companyId, employeeId)
      ]);

      return {
        benefits,
        discounts,
        net: benefits - discounts
      };
    } catch (error) {
      console.error('Erro ao calcular total líquido de convênios médicos:', error);
      throw error;
    }
  },

  /**
   * Verifica se funcionário tem convênios médicos ativos
   */
  hasActiveMedicalPlans: async (
    companyId: string,
    employeeId: string
  ): Promise<boolean> => {
    try {
      const plans = await this.getAllEmployeeMedicalPlans(companyId, employeeId);
      return plans.length > 0;
    } catch (error) {
      console.error('Erro ao verificar convênios médicos ativos:', error);
      return false;
    }
  },

  /**
   * Busca resumo de convênios médicos por categoria
   */
  getMedicalPlansSummary: async (
    companyId: string,
    employeeId?: string
  ): Promise<{
    convenio_medico: { count: number; total: number };
    convenio_odontologico: { count: number; total: number };
    seguro_vida: { count: number; total: number };
    outros: { count: number; total: number };
  }> => {
    try {
      const plans = await this.getAllEmployeeMedicalPlans(companyId, employeeId);
      
      const summary = {
        convenio_medico: { count: 0, total: 0 },
        convenio_odontologico: { count: 0, total: 0 },
        seguro_vida: { count: 0, total: 0 },
        outros: { count: 0, total: 0 }
      };

      plans.forEach(plan => {
        const category = plan.category as keyof typeof summary;
        if (summary[category]) {
          summary[category].count++;
          summary[category].total += plan.final_value;
        } else {
          summary.outros.count++;
          summary.outros.total += plan.final_value;
        }
      });

      return summary;
    } catch (error) {
      console.error('Erro ao buscar resumo de convênios médicos:', error);
      throw error;
    }
  }
};
