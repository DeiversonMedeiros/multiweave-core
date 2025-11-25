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
    const { data, error } = await supabase.rpc('get_payroll_simple', {
      company_id_param: params.companyId
    });

    if (error) {
      console.error('Erro ao buscar folhas de pagamento:', error);
      throw error;
    }

    // Aplicar filtros no lado do cliente
    let filteredData = data || [];
    
    if (params.month) {
      filteredData = filteredData.filter(payroll => payroll.mes_referencia === params.month);
    }
    
    if (params.year) {
      filteredData = filteredData.filter(payroll => payroll.ano_referencia === params.year);
    }
    
    if (params.status) {
      filteredData = filteredData.filter(payroll => payroll.status === params.status);
    }

    return filteredData;
  },

  /**
   * Busca uma folha de pagamento por ID
   */
  getById: async (id: string, companyId: string): Promise<Payroll | null> => {
    const { data, error } = await supabase.rpc('get_payroll_simple', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar folha de pagamento:', error);
      throw error;
    }

    const payroll = data?.find((p: Payroll) => p.id === id);
    return payroll || null;
  },

  /**
   * Cria uma nova folha de pagamento
   */
  create: async (payroll: PayrollInsert): Promise<Payroll> => {
    const { data, error } = await supabase
      .from('payroll')
      .insert(payroll)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar folha de pagamento:', error);
      throw error;
    }

    return data;
  },

  /**
   * Atualiza uma folha de pagamento
   */
  update: async (id: string, payroll: PayrollUpdate): Promise<Payroll> => {
    const { data, error } = await supabase
      .from('payroll')
      .update(payroll)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar folha de pagamento:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove uma folha de pagamento
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('payroll')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover folha de pagamento:', error);
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
      const { data: employee } = await supabase.rpc('get_employees_by_string', {
        company_id_param: params.companyId
      });
      
      const emp = (employee as Employee[])?.find(e => e.id === params.employeeId);
      if (!emp) throw new Error('Funcionário não encontrado');

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
      const { data: bankHoursConfig } = await supabase
        .from('rh.bank_hours_config')
        .select('has_bank_hours, is_active')
        .eq('employee_id', params.employeeId)
        .eq('company_id', params.companyId)
        .single();

      const hasActiveBankHours = bankHoursConfig?.has_bank_hours && bankHoursConfig?.is_active;

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
      const payrollData: PayrollInsert = {
        employee_id: params.employeeId,
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
      const { data: employees } = await supabase.rpc('get_employees_by_string', {
        company_id_param: params.companyId
      });

      const activeEmployees = (employees as Employee[])?.filter(emp => emp.status === 'ativo') || [];
      
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

          // Criar conta a pagar automaticamente se a folha foi processada e a configuração estiver habilitada
          if (payroll && (payroll.status === 'processado' || payroll.status === 'pago') && integrationConfig?.autoCreateAP) {
            try {
              const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
              const monthName = monthNames[(payroll.mes_referencia || 1) - 1];
              const period = `${monthName}/${payroll.ano_referencia}`;
              
              // Calcular data de vencimento
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + (integrationConfig.defaultDueDate || 5));
              
              await integrationService.createAccountPayable(
                params.companyId,
                {
                  payrollId: payroll.id,
                  employeeId: employee.id,
                  employeeName: employee.nome || 'Funcionário',
                  netSalary: payroll.salario_liquido || 0,
                  period: period,
                  dueDate: dueDate.toISOString().split('T')[0],
                  costCenter: employee.cost_center_id || undefined
                },
                integrationConfig
              );
            } catch (apError) {
              console.error(`Erro ao criar conta a pagar para funcionário ${employee.nome}:`, apError);
              // Não falhar o processamento da folha se a conta a pagar falhar
            }
          }
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