import { supabase } from '@/integrations/supabase/client';
import { PayrollEvent, Payroll } from '@/integrations/supabase/rh-types';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AccountsPayable {
  id: string;
  company_id: string;
  supplier_id: string;
  supplier_name: string;
  document_number: string;
  document_type: 'invoice' | 'payroll' | 'expense' | 'other';
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  category: string;
  cost_center_id?: string;
  payroll_id?: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PayrollToAPMapping {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  grossSalary: number;
  netSalary: number;
  deductions: number;
  benefits: number;
  taxes: number;
  period: string;
  dueDate: string;
  costCenter?: string;
  department?: string;
}

export interface FinancialReport {
  period: string;
  totalPayroll: number;
  totalDeductions: number;
  totalBenefits: number;
  totalTaxes: number;
  netPayroll: number;
  accountsPayable: AccountsPayable[];
  summary: {
    totalEmployees: number;
    averageSalary: number;
    totalCosts: number;
  };
}

export interface IntegrationConfig {
  autoCreateAP: boolean;
  defaultDueDate: number; // dias após o período
  defaultCategory: string;
  includeBenefits: boolean;
  includeTaxes: boolean;
  costCenterMapping: Record<string, string>;
  departmentMapping: Record<string, string>;
}

// =====================================================
// SERVIÇO DE INTEGRAÇÃO FINANCEIRA
// =====================================================

export class FinancialIntegrationService {
  private static instance: FinancialIntegrationService;

  private constructor() {}

  static getInstance(): FinancialIntegrationService {
    if (!FinancialIntegrationService.instance) {
      FinancialIntegrationService.instance = new FinancialIntegrationService();
    }
    return FinancialIntegrationService.instance;
  }

  /**
   * Gera contas a pagar a partir da folha de pagamento
   */
  async generateAccountsPayableFromPayroll(
    companyId: string,
    payrollData: Payroll[],
    config: IntegrationConfig
  ): Promise<AccountsPayable[]> {
    try {
      const accountsPayable: AccountsPayable[] = [];
      const dueDate = this.calculateDueDate(config.defaultDueDate);

      for (const payroll of payrollData) {
        // Buscar dados do funcionário
        const employee = await this.getEmployeeData(payroll.employee_id, companyId);
        if (!employee) continue;

        // Mapear dados da folha para conta a pagar
        const mapping: PayrollToAPMapping = {
          payrollId: payroll.id,
          employeeId: payroll.employee_id,
          employeeName: employee.nome,
          grossSalary: payroll.total_vencimentos || 0,
          netSalary: payroll.salario_liquido || 0,
          deductions: payroll.total_descontos || 0,
          benefits: 0, // TODO: Calcular benefícios
          taxes: 0, // TODO: Calcular impostos
          period: `${payroll.mes_referencia.toString().padStart(2, '0')}/${payroll.ano_referencia}`,
          dueDate: dueDate,
          costCenter: config.costCenterMapping[employee.departamento] || employee.departamento,
          department: employee.departamento
        };

        // Criar conta a pagar
        const ap = await this.createAccountPayable(companyId, mapping, config);
        accountsPayable.push(ap);
      }

      return accountsPayable;

    } catch (error) {
      console.error('Erro ao gerar contas a pagar:', error);
      throw error;
    }
  }

  /**
   * Cria conta a pagar individual
   */
  async createAccountPayable(
    companyId: string,
    mapping: PayrollToAPMapping,
    config: IntegrationConfig
  ): Promise<AccountsPayable> {
    try {
      const apData = {
        company_id: companyId,
        supplier_id: mapping.employeeId, // Funcionário como "fornecedor"
        supplier_name: mapping.employeeName,
        document_number: `FOLHA-${mapping.period}-${mapping.employeeId}`,
        document_type: 'payroll' as const,
        description: `Folha de Pagamento - ${mapping.employeeName} - ${mapping.period}`,
        amount: mapping.netSalary,
        due_date: mapping.dueDate,
        status: 'pending' as const,
        category: config.defaultCategory,
        cost_center_id: mapping.costCenter,
        payroll_id: mapping.payrollId,
        employee_id: mapping.employeeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system' // TODO: Pegar do contexto de usuário
      };

      const { data, error } = await supabase
        .from('financeiro.accounts_payable')
        .insert(apData)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar conta a pagar: ${error.message}`);
      }

      return data as AccountsPayable;

    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      throw error;
    }
  }

  /**
   * Busca dados do funcionário
   */
  private async getEmployeeData(employeeId: string, companyId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('rh.employees')
        .select('id, nome, departamento, cargo_id')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Erro ao buscar funcionário:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      return null;
    }
  }

  /**
   * Calcula data de vencimento
   */
  private calculateDueDate(daysAfter: number): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysAfter);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Gera relatório financeiro da folha
   */
  async generateFinancialReport(
    companyId: string,
    period: string
  ): Promise<FinancialReport> {
    try {
      // Buscar dados da folha
      const payrollData = await this.getPayrollData(companyId, period);
      
      // Buscar contas a pagar relacionadas
      const accountsPayable = await this.getAccountsPayableByPeriod(companyId, period);

      // Calcular totais
      const totalPayroll = payrollData.reduce((sum, p) => sum + (p.total_vencimentos || 0), 0);
      const totalDeductions = payrollData.reduce((sum, p) => sum + (p.total_descontos || 0), 0);
      const netPayroll = payrollData.reduce((sum, p) => sum + (p.salario_liquido || 0), 0);

      const summary = {
        totalEmployees: payrollData.length,
        averageSalary: payrollData.length > 0 ? totalPayroll / payrollData.length : 0,
        totalCosts: totalPayroll
      };

      return {
        period,
        totalPayroll,
        totalDeductions,
        totalBenefits: 0, // TODO: Calcular benefícios
        totalTaxes: totalDeductions, // Simplificado
        netPayroll,
        accountsPayable,
        summary
      };

    } catch (error) {
      console.error('Erro ao gerar relatório financeiro:', error);
      throw error;
    }
  }

  /**
   * Busca dados da folha por período
   */
  private async getPayrollData(companyId: string, period: string): Promise<Payroll[]> {
    try {
      const [month, year] = period.split('/').map(Number);
      
      const { data, error } = await supabase
        .from('rh.payroll')
        .select('*')
        .eq('company_id', companyId)
        .eq('mes_referencia', month)
        .eq('ano_referencia', year);

      if (error) {
        throw new Error(`Erro ao buscar dados da folha: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao buscar dados da folha:', error);
      return [];
    }
  }

  /**
   * Busca contas a pagar por período
   */
  private async getAccountsPayableByPeriod(companyId: string, period: string): Promise<AccountsPayable[]> {
    try {
      const { data, error } = await supabase
        .from('financeiro.accounts_payable')
        .select('*')
        .eq('company_id', companyId)
        .eq('document_type', 'payroll')
        .like('document_number', `%FOLHA-${period}%`);

      if (error) {
        throw new Error(`Erro ao buscar contas a pagar: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error);
      return [];
    }
  }

  /**
   * Sincroniza dados entre folha e contas a pagar
   */
  async syncPayrollWithAccountsPayable(
    companyId: string,
    payrollId: string
  ): Promise<boolean> {
    try {
      // Buscar dados da folha
      const { data: payroll, error: payrollError } = await supabase
        .from('rh.payroll')
        .select('*')
        .eq('id', payrollId)
        .eq('company_id', companyId)
        .single();

      if (payrollError || !payroll) {
        throw new Error('Folha de pagamento não encontrada');
      }

      // Verificar se já existe conta a pagar
      const { data: existingAP, error: apError } = await supabase
        .from('financeiro.accounts_payable')
        .select('*')
        .eq('payroll_id', payrollId)
        .eq('company_id', companyId)
        .single();

      if (apError && apError.code !== 'PGRST116') {
        throw new Error(`Erro ao verificar conta a pagar: ${apError.message}`);
      }

      if (existingAP) {
        // Atualizar conta existente
        await this.updateAccountPayable(existingAP.id, payroll);
      } else {
        // Criar nova conta
        await this.createAccountPayableFromPayroll(companyId, payroll);
      }

      return true;

    } catch (error) {
      console.error('Erro ao sincronizar folha com contas a pagar:', error);
      return false;
    }
  }

  /**
   * Cria conta a pagar a partir de uma folha específica
   */
  private async createAccountPayableFromPayroll(
    companyId: string,
    payroll: Payroll
  ): Promise<void> {
    try {
      // Buscar dados do funcionário
      const employee = await this.getEmployeeData(payroll.employee_id, companyId);
      if (!employee) return;

      const apData = {
        company_id: companyId,
        supplier_id: payroll.employee_id,
        supplier_name: employee.nome,
        document_number: `FOLHA-${payroll.mes_referencia.toString().padStart(2, '0')}/${payroll.ano_referencia}-${payroll.employee_id}`,
        document_type: 'payroll',
        description: `Folha de Pagamento - ${employee.nome} - ${payroll.mes_referencia}/${payroll.ano_referencia}`,
        amount: payroll.salario_liquido || 0,
        due_date: this.calculateDueDate(5), // 5 dias após
        status: 'pending',
        category: 'Folha de Pagamento',
        payroll_id: payroll.id,
        employee_id: payroll.employee_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system'
      };

      const { error } = await supabase
        .from('financeiro.accounts_payable')
        .insert(apData);

      if (error) {
        throw new Error(`Erro ao criar conta a pagar: ${error.message}`);
      }

    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      throw error;
    }
  }

  /**
   * Atualiza conta a pagar existente
   */
  private async updateAccountPayable(apId: string, payroll: Payroll): Promise<void> {
    try {
      const { error } = await supabase
        .from('financeiro.accounts_payable')
        .update({
          amount: payroll.salario_liquido || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', apId);

      if (error) {
        throw new Error(`Erro ao atualizar conta a pagar: ${error.message}`);
      }

    } catch (error) {
      console.error('Erro ao atualizar conta a pagar:', error);
      throw error;
    }
  }

  /**
   * Busca configuração de integração
   */
  async getIntegrationConfig(companyId: string): Promise<IntegrationConfig> {
    try {
      const { data, error } = await supabase
        .from('rh.financial_integration_config')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Erro ao buscar configuração: ${error.message}`);
      }

      if (!data) {
        // Retornar configuração padrão
        return {
          autoCreateAP: true,
          defaultDueDate: 5,
          defaultCategory: 'Folha de Pagamento',
          includeBenefits: true,
          includeTaxes: true,
          costCenterMapping: {},
          departmentMapping: {}
        };
      }

      return data.config as IntegrationConfig;

    } catch (error) {
      console.error('Erro ao buscar configuração de integração:', error);
      return {
        autoCreateAP: true,
        defaultDueDate: 5,
        defaultCategory: 'Folha de Pagamento',
        includeBenefits: true,
        includeTaxes: true,
        costCenterMapping: {},
        departmentMapping: {}
      };
    }
  }

  /**
   * Salva configuração de integração
   */
  async saveIntegrationConfig(
    companyId: string,
    config: IntegrationConfig
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('rh.financial_integration_config')
        .upsert({
          company_id: companyId,
          config: config,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Erro ao salvar configuração: ${error.message}`);
      }

    } catch (error) {
      console.error('Erro ao salvar configuração de integração:', error);
      throw error;
    }
  }
}
