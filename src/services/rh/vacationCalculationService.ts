// =====================================================
// SERVIÇO DE CÁLCULOS DE FÉRIAS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface VacationCalculation {
  employeeId: string;
  period: string;
  vacationDays: number;
  vacationValue: number;
  constitutionalThird: number;
  totalVacationValue: number;
  cashAllowance?: number;
  totalWithAllowance?: number;
}

export interface VacationEntitlement {
  id: string;
  employee_id: string;
  ano_aquisitivo: number;
  data_inicio_periodo: string;
  data_fim_periodo: string;
  dias_disponiveis: number;
  dias_gozados: number;
  dias_restantes: number;
  status: string;
  data_vencimento: string;
}

export interface VacationYear {
  ano: number;
  dias_disponiveis: number;
  dias_gozados: number;
  dias_restantes: number;
  status: string;
  data_vencimento: string;
}

export class VacationCalculationService {
  /**
   * Busca anos de férias disponíveis para um funcionário
   */
  static async getAvailableYears(employeeId: string): Promise<VacationYear[]> {
    try {
      if (!employeeId) {
        console.warn('Employee ID não fornecido para buscar anos de férias');
        return [];
      }

      const { data, error } = await supabase.rpc('buscar_anos_ferias_disponiveis', {
        employee_id_param: employeeId
      });

      if (error) {
        console.error('Erro ao buscar anos de férias:', error);
        // Retornar array vazio em caso de erro para não quebrar a interface
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar anos de férias disponíveis:', error);
      // Retornar array vazio em caso de erro para não quebrar a interface
      return [];
    }
  }

  /**
   * Calcula dias de férias disponíveis para um ano específico
   */
  static async calculateAvailableDays(employeeId: string, year: number): Promise<number> {
    try {
      if (!employeeId || !year) {
        console.warn('Employee ID ou ano não fornecidos para calcular dias disponíveis');
        return 0;
      }

      const { data, error } = await supabase.rpc('calcular_dias_ferias_disponiveis', {
        employee_id_param: employeeId,
        ano_param: year
      });

      if (error) {
        console.error('Erro ao calcular dias disponíveis:', error);
        // Retornar 0 em caso de erro para não quebrar a interface
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Erro ao calcular dias de férias disponíveis:', error);
      // Retornar 0 em caso de erro para não quebrar a interface
      return 0;
    }
  }

  /**
   * Calcula férias proporcionais baseado nos meses trabalhados
   */
  static calculateProportionalVacation(monthsWorked: number): number {
    // Férias proporcionais: 30 dias / 12 meses = 2.5 dias por mês
    return Math.floor(monthsWorked * 2.5);
  }

  /**
   * Calcula 1/3 constitucional
   */
  static calculateConstitutionalThird(vacationValue: number): number {
    return vacationValue / 3;
  }

  /**
   * Calcula abono pecuniário
   */
  static calculateCashAllowance(vacationDays: number, dailySalary: number): number {
    return vacationDays * dailySalary;
  }

  /**
   * Calcula valor das férias baseado no salário
   */
  static calculateVacationValue(baseSalary: number, vacationDays: number): number {
    const dailySalary = baseSalary / 30;
    return dailySalary * vacationDays;
  }

  /**
   * Calcula férias completas para um funcionário
   */
  static async calculateVacation(
    employeeId: string,
    period: string,
    vacationDays: number,
    cashAllowanceDays: number = 0
  ): Promise<VacationCalculation> {
    try {
      // Buscar dados do funcionário
      const employee = await this.getEmployee(employeeId);
      
      if (!employee) {
        throw new Error('Funcionário não encontrado');
      }

      // Calcular valor das férias
      const vacationValue = this.calculateVacationValue(employee.salario_base || 0, vacationDays);
      
      // Calcular 1/3 constitucional
      const constitutionalThird = this.calculateConstitutionalThird(vacationValue);
      
      // Calcular abono pecuniário se aplicável
      const dailySalary = (employee.salario_base || 0) / 30;
      const cashAllowance = cashAllowanceDays > 0 ? 
        this.calculateCashAllowance(cashAllowanceDays, dailySalary) : 0;
      
      // Calcular totais
      const totalVacationValue = vacationValue + constitutionalThird;
      const totalWithAllowance = totalVacationValue + cashAllowance;

      return {
        employeeId,
        period,
        vacationDays,
        vacationValue,
        constitutionalThird,
        totalVacationValue,
        cashAllowance: cashAllowanceDays > 0 ? cashAllowance : undefined,
        totalWithAllowance: cashAllowanceDays > 0 ? totalWithAllowance : undefined
      };
    } catch (error) {
      console.error('Erro ao calcular férias:', error);
      throw error;
    }
  }

  /**
   * Busca dados do funcionário
   */
  private static async getEmployee(employeeId: string) {
    try {
      const result = await EntityService.getById({
        schema: 'rh',
        table: 'employees',
        companyId: '', // Será preenchido pelo contexto
        id: employeeId
      });

      return result;
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      throw error;
    }
  }

  /**
   * Cria período aquisitivo para um funcionário
   */
  static async createVacationEntitlement(
    employeeId: string,
    companyId: string,
    admissionDate: string,
    year: number
  ): Promise<VacationEntitlement> {
    try {
      const { data, error } = await supabase.rpc('criar_periodo_aquisitivo', {
        employee_id_param: employeeId,
        company_id_param: companyId,
        data_admissao_param: admissionDate,
        ano_param: year
      });

      if (error) {
        console.error('Erro ao criar período aquisitivo:', error);
        throw error;
      }

      // Buscar o período criado para retornar os dados completos
      const result = await EntityService.getById({
        schema: 'rh',
        table: 'vacation_entitlements',
        companyId: companyId,
        id: data
      });

      if (result.error) {
        console.error('Erro ao buscar período aquisitivo criado:', result.error);
        throw result.error;
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao criar período aquisitivo:', error);
      throw error;
    }
  }

  /**
   * Calcula meses trabalhados entre duas datas
   */
  private static calculateMonthsWorked(startDate: Date, endDate: Date): number {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth()) + 1;
    
    return Math.max(0, months);
  }

  /**
   * Atualiza dias gozados após aprovação de férias
   */
  static async updateGozadosDays(
    employeeId: string,
    year: number,
    daysUsed: number
  ): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('atualizar_dias_gozados', {
        employee_id_param: employeeId,
        ano_param: year,
        dias_usados: daysUsed
      });

      if (error) {
        console.error('Erro ao atualizar dias gozados:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Dias solicitados excedem os dias disponíveis');
      }
    } catch (error) {
      console.error('Erro ao atualizar dias gozados:', error);
      throw error;
    }
  }

  /**
   * Valida se funcionário pode solicitar férias
   */
  static async validateVacationRequest(
    employeeId: string,
    year: number,
    requestedDays: number
  ): Promise<{ canRequest: boolean; availableDays: number; message?: string }> {
    try {
      const { data, error } = await supabase.rpc('validar_solicitacao_ferias', {
        employee_id_param: employeeId,
        ano_param: year,
        dias_solicitados: requestedDays
      });

      if (error) {
        console.error('Erro ao validar solicitação de férias:', error);
        return {
          canRequest: false,
          availableDays: 0,
          message: 'Erro ao validar solicitação de férias'
        };
      }

      return {
        canRequest: data.valido,
        availableDays: data.dias_disponiveis,
        message: data.erro
      };
    } catch (error) {
      console.error('Erro ao validar solicitação de férias:', error);
      return {
        canRequest: false,
        availableDays: 0,
        message: 'Erro ao validar solicitação de férias'
      };
    }
  }

  /**
   * Formata valor monetário
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Formata data
   */
  static formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR').format(dateObj);
  }
}
