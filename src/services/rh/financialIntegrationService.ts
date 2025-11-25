import { supabase } from '@/integrations/supabase/client';
import { PayrollEvent, Payroll } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AccountsPayable {
  id: string;
  company_id: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  numero_titulo: string;
  document_number?: string; // Para compatibilidade
  document_type?: 'invoice' | 'payroll' | 'expense' | 'other'; // Para compatibilidade
  descricao: string;
  description?: string; // Para compatibilidade
  valor_original: number;
  valor_atual: number;
  amount?: number; // Para compatibilidade
  data_emissao: string;
  data_vencimento: string;
  due_date?: string; // Para compatibilidade
  data_pagamento?: string;
  status: 'pendente' | 'aprovado' | 'pago' | 'vencido' | 'cancelado';
  categoria: string;
  category?: string; // Para compatibilidade
  centro_custo_id?: string;
  cost_center_id?: string; // Para compatibilidade
  payroll_id?: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
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
  defaultFinancialClass?: string; // Classe financeira padrão (ex: "Salários e Ordenados")
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
      const apData: any = {
        company_id: companyId,
        fornecedor_id: mapping.employeeId, // Funcionário como "fornecedor"
        fornecedor_nome: mapping.employeeName,
        numero_titulo: `FOLHA-${mapping.period.replace(/\//g, '-')}-${mapping.employeeId.substring(0, 8)}`,
        descricao: `Folha de Pagamento - ${mapping.employeeName} - ${mapping.period}`,
        valor_original: mapping.netSalary,
        valor_atual: mapping.netSalary,
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: mapping.dueDate,
        status: 'pendente' as const,
        categoria: config.defaultCategory || 'Folha de Pagamento',
        classe_financeira: config.defaultFinancialClass || 'Salários e Ordenados', // Classe financeira para aprovações
        centro_custo_id: mapping.costCenter || null,
        payroll_id: mapping.payrollId,
        employee_id: mapping.employeeId,
        observacoes: `Folha de Pagamento gerada automaticamente`,
        is_active: true
      };

      const result = await EntityService.create<AccountsPayable>({
        schema: 'financeiro',
        table: 'contas_pagar',
        companyId: companyId,
        data: apData
      });

      return result as AccountsPayable;

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
      const accountsPayableResult = await this.getAccountsPayableByPeriod(companyId, period);
      const accountsPayable = accountsPayableResult.map(ap => ({
        ...ap,
        amount: ap.valor_atual || ap.amount || 0,
        due_date: ap.data_vencimento || ap.due_date || '',
        description: ap.descricao || ap.description || '',
        category: ap.categoria || ap.category || '',
        status: ap.status === 'pendente' ? 'pending' : 
                ap.status === 'aprovado' ? 'approved' : 
                ap.status === 'pago' ? 'paid' : 
                ap.status === 'cancelado' ? 'cancelled' : 'pending' as any
      }));

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
      const result = await EntityService.list<AccountsPayable>({
        schema: 'financeiro',
        table: 'contas_pagar',
        companyId: companyId,
        filters: {
          categoria: 'Folha de Pagamento'
        }
      });

      // Filtrar por período no código já que o filtro LIKE não está disponível diretamente
      const filtered = (result.data || []).filter(ap => 
        ap.document_number?.includes(`FOLHA-${period}`)
      );

      return filtered;

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
      const result = await EntityService.list<AccountsPayable>({
        schema: 'financeiro',
        table: 'contas_pagar',
        companyId: companyId,
        filters: {
          // Nota: payroll_id não existe na tabela contas_pagar, usar descricao ou outro campo
          categoria: 'Folha de Pagamento'
        }
      });

      const existingAP = result.data?.find(ap => 
        ap.description?.includes(payroll.id) || 
        ap.document_number?.includes(`FOLHA-${payroll.mes_referencia}/${payroll.ano_referencia}-${payroll.employee_id}`)
      );

      if (existingAP) {
        // Atualizar conta existente
        await this.updateAccountPayable(existingAP.id, payroll, companyId);
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
        fornecedor_id: payroll.employee_id,
        fornecedor_nome: employee.nome,
        numero_titulo: `FOLHA-${payroll.mes_referencia.toString().padStart(2, '0')}/${payroll.ano_referencia}-${payroll.employee_id}`,
        document_number: `FOLHA-${payroll.mes_referencia.toString().padStart(2, '0')}/${payroll.ano_referencia}-${payroll.employee_id}`, // Para compatibilidade
        document_type: 'payroll', // Para compatibilidade
        descricao: `Folha de Pagamento - ${employee.nome} - ${payroll.mes_referencia}/${payroll.ano_referencia}`,
        description: `Folha de Pagamento - ${employee.nome} - ${payroll.mes_referencia}/${payroll.ano_referencia}`, // Para compatibilidade
        valor_original: payroll.salario_liquido || 0,
        valor_atual: payroll.salario_liquido || 0,
        amount: payroll.salario_liquido || 0, // Para compatibilidade
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: this.calculateDueDate(5), // 5 dias após
        due_date: this.calculateDueDate(5), // Para compatibilidade
        status: 'pendente',
        categoria: 'Folha de Pagamento',
        category: 'Folha de Pagamento', // Para compatibilidade
        payroll_id: payroll.id,
        employee_id: payroll.employee_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system'
      };

      await EntityService.create({
        schema: 'financeiro',
        table: 'contas_pagar',
        companyId: companyId,
        data: apData
      });

    } catch (error) {
      console.error('Erro ao criar conta a pagar:', error);
      throw error;
    }
  }

  /**
   * Atualiza conta a pagar existente
   */
  private async updateAccountPayable(apId: string, payroll: Payroll, companyId: string): Promise<void> {
    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'contas_pagar',
        companyId: companyId,
        id: apId,
        data: {
          valor_atual: payroll.salario_liquido || 0,
          valor_original: payroll.salario_liquido || 0,
          updated_at: new Date().toISOString()
        }
      });

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
      // Usar EntityService para acessar schema não-público
      const result = await EntityService.list<{
        id: string;
        company_id: string;
        config: IntegrationConfig;
        created_at: string;
        updated_at: string;
      }>({
        schema: 'rh',
        table: 'financial_integration_config',
        companyId: companyId,
        filters: { company_id: companyId }
      });

      // EntityService.list retorna { data: T[], totalCount, hasMore }
      // Cada item em data já é o objeto completo (não tem campo 'data' dentro)
      if (!result || !result.data || result.data.length === 0) {
        console.log('[getIntegrationConfig] Nenhuma configuração encontrada, retornando padrão');
        return {
          autoCreateAP: true,
          defaultDueDate: 5,
          defaultCategory: 'Folha de Pagamento',
          defaultFinancialClass: 'Salários e Ordenados',
          includeBenefits: true,
          includeTaxes: true,
          costCenterMapping: {},
          departmentMapping: {}
        };
      }

      // Pegar o primeiro item (deve haver apenas um por company_id devido à constraint UNIQUE)
      const configRecord = result.data[0];
      
      // O campo 'config' é um JSONB que contém a configuração
      if (!configRecord || !configRecord.config) {
        console.log('[getIntegrationConfig] Campo config não encontrado no registro, retornando padrão', configRecord);
        return {
          autoCreateAP: true,
          defaultDueDate: 5,
          defaultCategory: 'Folha de Pagamento',
          defaultFinancialClass: 'Salários e Ordenados',
          includeBenefits: true,
          includeTaxes: true,
          costCenterMapping: {},
          departmentMapping: {}
        };
      }

      // configRecord.config já é o objeto IntegrationConfig
      const finalConfig = configRecord.config as IntegrationConfig;
      
      console.log('[getIntegrationConfig] Configuração encontrada:', finalConfig);
      
      return finalConfig;

    } catch (error: any) {
      // Se a tabela não existir (erro 42P01), retornar configuração padrão
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Tabela financial_integration_config não existe ainda. Usando configuração padrão.');
        return {
          autoCreateAP: true,
          defaultDueDate: 5,
          defaultCategory: 'Folha de Pagamento',
          defaultFinancialClass: 'Salários e Ordenados',
          includeBenefits: true,
          includeTaxes: true,
          costCenterMapping: {},
          departmentMapping: {}
        };
      }
      
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
      // Usar EntityService para acessar schema não-público
      // Verificar se já existe configuração para esta empresa
      let existingData: any = null;
      
      try {
        const existing = await EntityService.list<{
          id: string;
          company_id: string;
          config: IntegrationConfig;
        }>({
          schema: 'rh',
          table: 'financial_integration_config',
          companyId: companyId,
          filters: { company_id: companyId }
        });

        // EntityService.list retorna { data: T[], totalCount, hasMore }
        if (existing && existing.data && existing.data.length > 0) {
          existingData = existing.data[0];
        }
      } catch (listError: any) {
        // Se a tabela não existir, vamos tentar criar
        if (listError?.code === '42P01' || listError?.message?.includes('does not exist')) {
          console.warn('Tabela financial_integration_config não existe. A migration precisa ser executada.');
          throw new Error('A tabela financial_integration_config não existe. Por favor, execute a migration 20251115000009_ensure_financial_integration_config.sql');
        }
        throw listError;
      }
      
      const dataToSave = {
        company_id: companyId,
        config: config,
        updated_at: new Date().toISOString()
      };

      if (existingData && existingData.id) {
        // Atualizar configuração existente
        await EntityService.update({
          schema: 'rh',
          table: 'financial_integration_config',
          companyId: companyId,
          id: existingData.id,
          data: dataToSave
        });
      } else {
        // Criar nova configuração
        await EntityService.create({
          schema: 'rh',
          table: 'financial_integration_config',
          companyId: companyId,
          data: {
            ...dataToSave,
            created_at: new Date().toISOString()
          }
        });
      }

    } catch (error: any) {
      // Se a tabela não existir, informar o usuário
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.error('Erro ao salvar configuração: Tabela não existe. Execute a migration.');
        throw new Error('A tabela financial_integration_config não existe. Por favor, execute a migration 20251115000009_ensure_financial_integration_config.sql');
      }
      
      console.error('Erro ao salvar configuração de integração:', error);
      throw error;
    }
  }
}
