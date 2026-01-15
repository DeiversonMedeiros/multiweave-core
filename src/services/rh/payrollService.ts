import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';
import { 
  Payroll, 
  PayrollInsert, 
  PayrollUpdate,
  Employee,
  TimeRecord,
  EmployeeBenefitAssignment
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE FOLHA DE PAGAMENTO
// =====================================================

export const PayrollService = {
  /**
   * Lista todas as folhas de pagamento de uma empresa
   */
  list: async (params: { 
    companyId: string; 
    month?: number;
    year?: number;
    status?: string;
  }) => {
    try {
      const filters: any = {};
      
      if (params.month) {
        filters.mes_referencia = params.month;
      }
      
      if (params.year) {
        filters.ano_referencia = params.year;
      }
      
      if (params.status) {
        filters.status = params.status;
      }

      const result = await EntityService.list<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId: params.companyId,
        filters,
        orderBy: 'ano_referencia',
        orderDirection: 'DESC'
      });

      // Buscar dados dos funcionários para cada folha
      const payrollsWithEmployees = await Promise.all(
        result.data.map(async (payroll) => {
          try {
            const employee = await EntityService.getById<Employee>({
              schema: 'rh',
              table: 'employees',
              companyId: params.companyId,
              id: payroll.employee_id
            });

            return {
              ...payroll,
              employee: employee || undefined
            };
          } catch (error) {
            console.warn(`Erro ao buscar funcionário ${payroll.employee_id}:`, error);
            return {
              ...payroll,
              employee: undefined
            };
          }
        })
      );

      return payrollsWithEmployees;
    } catch (error) {
      console.error('Erro ao buscar folhas de pagamento:', error);
      throw error;
    }
  },

  /**
   * Busca uma folha de pagamento por ID
   */
  getById: async (id: string, companyId: string): Promise<Payroll | null> => {
    try {
      const result = await EntityService.getById<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId,
        id
      });

      return result || null;
    } catch (error) {
      console.error('Erro ao buscar folha de pagamento:', error);
      throw error;
    }
  },

  /**
   * Cria uma nova folha de pagamento
   */
  create: async (payroll: PayrollInsert & { company_id: string }): Promise<Payroll> => {
    try {
      if (!payroll.company_id) {
        throw new Error('company_id é obrigatório');
      }

      const result = await EntityService.create<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId: payroll.company_id,
        data: payroll
      });

      return result;
    } catch (error) {
      console.error('Erro ao criar folha de pagamento:', error);
      throw error;
    }
  },

  /**
   * Atualiza uma folha de pagamento
   */
  update: async (id: string, payroll: PayrollUpdate, companyId: string): Promise<Payroll> => {
    try {
      const result = await EntityService.update<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId,
        id,
        data: payroll
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar folha de pagamento:', error);
      throw error;
    }
  },

  /**
   * Remove uma folha de pagamento
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'payroll',
        companyId,
        id
      });
    } catch (error) {
      console.error('Erro ao remover folha de pagamento:', error);
      throw error;
    }
  },

  /**
   * Busca folha por funcionário e período
   */
  getByEmployeeAndPeriod: async (employeeId: string, month: number, year: number, companyId: string): Promise<Payroll | null> => {
    try {
      const result = await EntityService.list<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId,
        filters: {
          employee_id: employeeId,
          mes_referencia: month,
          ano_referencia: year
        },
        pageSize: 1
      });

      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar folha por funcionário e período:', error);
      throw error;
    }
  },

  /**
   * Busca estatísticas de folha
   */
  getStats: async (companyId: string, month: number, year: number) => {
    try {
      const result = await EntityService.list<Payroll>({
        schema: 'rh',
        table: 'payroll',
        companyId,
        filters: {
          mes_referencia: month,
          ano_referencia: year
        }
      });

      const payrolls = result.data;
      
      // Contar funcionários únicos
      const uniqueEmployees = new Set(payrolls.map(p => p.employee_id).filter(Boolean));
      
      const totalEarnings = payrolls.reduce((sum, p) => sum + (p.total_vencimentos || 0), 0);
      const totalDiscounts = payrolls.reduce((sum, p) => sum + (p.total_descontos || 0), 0);
      const totalNet = payrolls.reduce((sum, p) => sum + (p.salario_liquido || 0), 0);
      const processed = payrolls.filter(p => p.status === 'processado' || p.status === 'pago').length;
      
      return {
        total_employees: uniqueEmployees.size,
        total_net_salary: totalNet,
        total_taxes: totalDiscounts,
        processed: processed,
        // Manter compatibilidade com versões antigas
        total: payrolls.length,
        totalEarnings: totalEarnings,
        totalDiscounts: totalDiscounts,
        totalNet: totalNet,
        byStatus: payrolls.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de folha:', error);
      throw error;
    }
  },

  /**
   * Processa a folha de pagamento de um funcionário para um mês
   */
  processEmployeePayroll: async (params: {
    employeeId: string;
    companyId: string;
    month: number;
    year: number;
  }): Promise<Payroll> => {
    try {
      // Buscar dados do funcionário
      const employeeResult = await EntityService.getById<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: params.companyId,
        id: params.employeeId
      });
      
      if (!employeeResult) throw new Error('Funcionário não encontrado');
      const emp = employeeResult;

      // Buscar registros de ponto do mês
      const { data: timeRecords } = await supabase.rpc('get_time_records_simple', {
        company_id_param: params.companyId
      });
      
      const monthRecords = (timeRecords as TimeRecord[])?.filter(record => {
        const recordDate = new Date(record.data_registro);
        return record.employee_id === params.employeeId &&
               recordDate.getMonth() + 1 === params.month &&
               recordDate.getFullYear() === params.year;
      });

      // Verificar se funcionário tem banco de horas ativo
      let hasActiveBankHours = false;
      try {
        const bankHoursResult = await EntityService.list({
          schema: 'rh',
          table: 'bank_hours_config',
          companyId: params.companyId,
          filters: {
            employee_id: params.employeeId
          },
          pageSize: 1
        });
        
        const bankHoursConfig = bankHoursResult.data[0];
        hasActiveBankHours = bankHoursConfig?.has_bank_hours && bankHoursConfig?.is_active;
      } catch (error) {
        console.warn('Erro ao buscar configuração de banco de horas:', error);
        // Continua sem banco de horas se não conseguir buscar
      }

      // Calcular horas trabalhadas
      const totalHours = monthRecords?.reduce((sum, record) => {
        return sum + (record.horas_trabalhadas || 0);
      }, 0) || 0;

      // Se funcionário tem banco de horas ativo, horas extras vão para o banco (não são pagas)
      // Se não tem banco de horas ativo, horas extras são pagas normalmente
      const overtimeHours = hasActiveBankHours 
        ? 0  // Horas extras vão para o banco de horas, não são pagas na folha
        : monthRecords?.reduce((sum, record) => {
            // Apenas contar horas extras positivas de registros aprovados
            return sum + ((record.horas_extras && record.horas_extras > 0 && record.status === 'aprovado') ? record.horas_extras : 0);
          }, 0) || 0;

      // Calcular datas do período (mês de referência)
      const startDate = new Date(params.year, params.month - 1, 1);
      const endDate = new Date(params.year, params.month, 0); // Último dia do mês

      // Buscar benefícios que entram no cálculo da folha (com cálculo de dias reais)
      const { data: payrollBenefits } = await supabase.rpc('get_employee_payroll_benefits', {
        company_id_param: params.companyId,
        employee_id_param: params.employeeId,
        month_param: params.month,
        year_param: params.year
      });
      
      const activeBenefits = payrollBenefits || [];

      // Buscar descontos de convênios médicos
      const { data: medicalPlanDiscounts } = await supabase.rpc('get_employee_medical_plan_discounts_only', {
        company_id_param: params.companyId,
        employee_id_param: params.employeeId
      });
      
      const activeMedicalDiscounts = medicalPlanDiscounts || [];

      // Buscar benefícios de convênios médicos (proventos)
      const { data: medicalPlanBenefits } = await supabase.rpc('get_employee_medical_plan_discounts', {
        company_id_param: params.companyId,
        employee_id_param: params.employeeId
      });
      
      const activeMedicalBenefits = (medicalPlanBenefits || []).filter(benefit => benefit.discount_type === 'provento');

      // Calcular salário base
      const baseSalary = emp.salario_base || 0;
      const overtimeValue = overtimeHours * (baseSalary / 160); // 160h = 1 mês
      
      // Calcular total de benefícios que entram na folha (benefícios tradicionais + convênios médicos)
      // Usar calculated_value se disponível, senão usar custom_value
      const traditionalBenefitsTotal = activeBenefits.reduce((sum, benefit) => {
        return sum + (benefit.calculated_value || benefit.custom_value || 0);
      }, 0);

      const medicalBenefitsTotal = activeMedicalBenefits.reduce((sum, benefit) => {
        return sum + (benefit.final_value || 0);
      }, 0);

      const benefitsTotal = traditionalBenefitsTotal + medicalBenefitsTotal;

      // Calcular total de descontos de convênios médicos
      const medicalDiscountsTotal = activeMedicalDiscounts.reduce((sum, discount) => {
        return sum + (discount.final_value || 0);
      }, 0);
      
      const totalEarnings = baseSalary + overtimeValue + benefitsTotal;
      
      // Calcular descontos (INSS, IRRF, convênios médicos, etc.)
      const inssDiscount = this.calculateINSS(totalEarnings);
      const irrfDiscount = this.calculateIRRF(totalEarnings - inssDiscount);
      const totalDiscounts = inssDiscount + irrfDiscount + medicalDiscountsTotal;
      
      const netSalary = totalEarnings - totalDiscounts;

      // Calcular horas extras totais (para registro, mesmo que não sejam pagas)
      const totalOvertimeHoursInRecords = monthRecords?.reduce((sum, record) => {
        return sum + ((record.horas_extras && record.horas_extras > 0 && record.status === 'aprovado') ? record.horas_extras : 0);
      }, 0) || 0;

      // Criar registro de folha
      const payrollData: PayrollInsert & { company_id: string } = {
        employee_id: params.employeeId,
        company_id: params.companyId,
        mes_referencia: params.month,
        ano_referencia: params.year,
        salario_base: baseSalary,
        horas_trabalhadas: totalHours,
        horas_extras: hasActiveBankHours ? totalOvertimeHoursInRecords : overtimeHours, // Total para registro (pode ser diferente do valor pago)
        valor_horas_extras: overtimeValue, // Valor pago (0 se tem banco de horas ativo)
        total_beneficios_tradicionais: traditionalBenefitsTotal,
        total_beneficios_convenios_medicos: medicalBenefitsTotal,
        total_descontos_convenios_medicos: medicalDiscountsTotal,
        total_vencimentos: totalEarnings,
        total_descontos: totalDiscounts,
        salario_liquido: netSalary,
        status: 'processado'
      };

      return await this.create(payrollData);

    } catch (error) {
      console.error('Erro ao processar folha de pagamento:', error);
      throw error;
    }
  },

  /**
   * Calcula desconto do INSS
   */
  calculateINSS: (grossSalary: number): number => {
    const inssRanges = [
      { min: 0, max: 1412, rate: 0.075 },
      { min: 1412.01, max: 2666.68, rate: 0.09 },
      { min: 2666.69, max: 4000.03, rate: 0.12 },
      { min: 4000.04, max: 7786.02, rate: 0.14 }
    ];

    let discount = 0;
    for (const range of inssRanges) {
      if (grossSalary > range.min) {
        const taxableAmount = Math.min(grossSalary - range.min, range.max - range.min);
        discount += taxableAmount * range.rate;
      }
    }

    return Math.round(discount * 100) / 100;
  },

  /**
   * Calcula desconto do IRRF
   */
  calculateIRRF: (baseSalary: number): number => {
    const irrfRanges = [
      { min: 0, max: 22847.76, rate: 0, deduction: 0 },
      { min: 22847.77, max: 33919.80, rate: 0.075, deduction: 1713.58 },
      { min: 33919.81, max: 45012.60, rate: 0.15, deduction: 4257.57 },
      { min: 45012.61, max: 55976.16, rate: 0.225, deduction: 7633.51 },
      { min: 55976.17, max: Infinity, rate: 0.275, deduction: 10432.32 }
    ];

    for (const range of irrfRanges) {
      if (baseSalary >= range.min && baseSalary <= range.max) {
        return Math.round((baseSalary * range.rate - range.deduction) * 100) / 100;
      }
    }

    return 0;
  },

  /**
   * Processa folha de pagamento para todos os funcionários de uma empresa
   */
  processCompanyPayroll: async (params: {
    companyId: string;
    month: number;
    year: number;
  }): Promise<Payroll[]> => {
    try {
      // Importar serviços necessários (lazy import para evitar dependência circular)
      const { FinancialIntegrationService } = await import('@/services/rh/financialIntegrationService');
      const { EntityService } = await import('@/services/generic/entityService');
      
      // Buscar todos os funcionários ativos
      const employeesResult = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: params.companyId,
        filters: { status: 'ativo' },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });

      const activeEmployees = employeesResult.data || [];
      
      const payrolls: Payroll[] = [];
      
      // Verificar configuração de integração financeira (uma vez para todos)
      const integrationService = FinancialIntegrationService.getInstance();
      let integrationConfig: any = null;
      try {
        integrationConfig = await integrationService.getIntegrationConfig(params.companyId);
      } catch (configError) {
        console.warn('Não foi possível carregar configuração de integração financeira:', configError);
      }
      
      for (const employee of activeEmployees) {
        try {
          const payroll = await this.processEmployeePayroll({
            employeeId: employee.id,
            companyId: params.companyId,
            month: params.month,
            year: params.year
          });
          payrolls.push(payroll);

          // NOTA: A conta a pagar agora é criada apenas quando a folha é validada pelo RH
          // através da função handleValidatePayroll na página PayrollPage
          // Isso permite que o RH revise e edite a folha antes de validar
        } catch (error) {
          console.error(`Erro ao processar folha do funcionário ${employee.nome}:`, error);
          // Continua processando outros funcionários
        }
      }

      return payrolls;

    } catch (error) {
      console.error('Erro ao processar folha da empresa:', error);
      throw error;
    }
  },

  /**
   * Alias para processCompanyPayroll (compatibilidade)
   */
  processAllPayroll: async (params: {
    companyId: string;
    month: number;
    year: number;
  }): Promise<Payroll[]> => {
    return this.processCompanyPayroll(params);
  }
};