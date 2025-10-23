import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { EntityService } from '../services/generic/entityService';
import { 
  BankHoursConfig, 
  BankHoursBalance, 
  BankHoursTransaction, 
  BankHoursCalculation,
  BankHoursConfigForm,
  BankHoursAdjustmentForm,
  BankHoursSummary,
  BankHoursReport
} from '../integrations/supabase/bank-hours-types';

// =====================================================
// HOOK PARA CONFIGURAÇÃO DO BANCO DE HORAS
// =====================================================

export function useBankHoursConfig(companyId: string) {
  const [configs, setConfigs] = useState<BankHoursConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const result = await EntityService.list({
        schema: 'rh',
        table: 'bank_hours_config',
        companyId: companyId,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      setConfigs(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const createConfig = async (config: BankHoursConfigForm) => {
    try {
      const result = await EntityService.create({
        schema: 'rh',
        table: 'bank_hours_config',
        companyId: companyId,
        data: config
      });
      
      // Inicializar saldo
      await EntityService.create({
        schema: 'rh',
        table: 'bank_hours_balance',
        companyId: companyId,
        data: {
          employee_id: config.employee_id
        }
      });

      await fetchConfigs();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar configuração');
      throw err;
    }
  };

  const updateConfig = async (id: string, config: Partial<BankHoursConfigForm>) => {
    try {
      const result = await EntityService.update({
        schema: 'rh',
        table: 'bank_hours_config',
        companyId: companyId,
        id: id,
        data: config
      });

      await fetchConfigs();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
      throw err;
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'bank_hours_config',
        companyId: companyId,
        id: id
      });

      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar configuração');
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchConfigs();
    }
  }, [companyId]);

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
  };
}

// =====================================================
// HOOK PARA SALDO DO BANCO DE HORAS
// =====================================================

export function useBankHoursBalance(companyId: string, employeeId?: string) {
  const [balances, setBalances] = useState<BankHoursBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const filters = employeeId ? { employee_id: employeeId } : {};
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'bank_hours_balance',
        companyId: companyId,
        filters: filters,
        orderBy: 'last_calculation_date',
        orderDirection: 'DESC'
      });
      
      setBalances(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar saldos');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeBalance = async (employeeId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId,
        });

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao obter saldo do colaborador');
      return null;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchBalances();
    }
  }, [companyId, employeeId]);

  return {
    balances,
    loading,
    error,
    fetchBalances,
    getEmployeeBalance,
  };
}

// =====================================================
// HOOK PARA TRANSAÇÕES DO BANCO DE HORAS
// =====================================================

export function useBankHoursTransactions(companyId: string, employeeId?: string) {
  const [transactions, setTransactions] = useState<BankHoursTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (filters?: {
    startDate?: string;
    endDate?: string;
    transactionType?: string;
  }) => {
    try {
      setLoading(true);
      const queryFilters: any = {};
      
      if (employeeId) {
        queryFilters.employee_id = employeeId;
      }
      
      if (filters?.startDate) {
        queryFilters.transaction_date_gte = filters.startDate;
      }
      
      if (filters?.endDate) {
        queryFilters.transaction_date_lte = filters.endDate;
      }
      
      if (filters?.transactionType) {
        queryFilters.transaction_type = filters.transactionType;
      }

      const result = await EntityService.list({
        schema: 'rh',
        table: 'bank_hours_transactions',
        companyId: companyId,
        filters: queryFilters,
        orderBy: 'transaction_date',
        orderDirection: 'DESC'
      });
      
      setTransactions(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const adjustBalance = async (adjustment: BankHoursAdjustmentForm) => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('adjust_bank_hours_balance', {
          p_employee_id: adjustment.employee_id,
          p_company_id: companyId,
          p_hours_amount: adjustment.hours_amount,
          p_description: adjustment.description,
        });

      if (error) throw error;
      await fetchTransactions();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ajustar saldo');
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
    }
  }, [companyId, employeeId]);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    adjustBalance,
  };
}

// =====================================================
// HOOK PARA CÁLCULOS DO BANCO DE HORAS
// =====================================================

export function useBankHoursCalculations(companyId: string) {
  const [calculations, setCalculations] = useState<BankHoursCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const result = await EntityService.list({
        schema: 'rh',
        table: 'bank_hours_calculations',
        companyId: companyId,
        orderBy: 'calculation_date',
        orderDirection: 'DESC'
      });
      
      setCalculations(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cálculos');
    } finally {
      setLoading(false);
    }
  };

  const runCalculation = async (calculationDate?: string) => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('run_bank_hours_calculation', {
          p_company_id: companyId,
          p_calculation_date: calculationDate || new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
      await fetchCalculations();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar cálculo');
      throw err;
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCalculations();
    }
  }, [companyId]);

  return {
    calculations,
    loading,
    error,
    fetchCalculations,
    runCalculation,
  };
}

// =====================================================
// HOOK PARA RELATÓRIOS DO BANCO DE HORAS
// =====================================================

export function useBankHoursReports(companyId: string) {
  const [reports, setReports] = useState<BankHoursReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async (periodStart: string, periodEnd: string) => {
    try {
      setLoading(true);
      
      // Buscar resumo de colaboradores
      const { data: balances, error: balancesError } = await supabase
        .from('bank_hours_balance')
        .select(`
          *,
          employee:employees(id, nome, matricula),
          config:bank_hours_config(has_bank_hours, max_accumulation_hours)
        `)
        .eq('company_id', companyId);

      if (balancesError) throw balancesError;

      // Buscar transações do período
      const { data: transactions, error: transactionsError } = await supabase
        .from('bank_hours_transactions')
        .select('*')
        .eq('company_id', companyId)
        .gte('transaction_date', periodStart)
        .lte('transaction_date', periodEnd);

      if (transactionsError) throw transactionsError;

      // Calcular estatísticas
      const totalEmployees = balances?.length || 0;
      const employeesWithBankHours = balances?.filter(b => b.config?.has_bank_hours).length || 0;
      
      const totalAccumulated = transactions
        ?.filter(t => t.transaction_type === 'accumulation')
        .reduce((sum, t) => sum + t.hours_amount, 0) || 0;
      
      const totalCompensated = transactions
        ?.filter(t => t.transaction_type === 'compensation')
        .reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) || 0;
      
      const totalExpired = transactions
        ?.filter(t => t.transaction_type === 'expiration')
        .reduce((sum, t) => sum + Math.abs(t.hours_amount), 0) || 0;

      const averageBalance = balances?.length > 0 
        ? balances.reduce((sum, b) => sum + b.current_balance, 0) / balances.length 
        : 0;

      const report: BankHoursReport = {
        period_start: periodStart,
        period_end: periodEnd,
        total_employees: totalEmployees,
        employees_with_bank_hours: employeesWithBankHours,
        total_accumulated_hours: totalAccumulated,
        total_compensated_hours: totalCompensated,
        total_expired_hours: totalExpired,
        average_balance: averageBalance,
        employees_summary: balances?.map(b => ({
          employee_id: b.employee_id,
          employee_name: b.employee?.nome || '',
          employee_matricula: b.employee?.matricula,
          current_balance: b.current_balance,
          accumulated_hours: b.accumulated_hours,
          compensated_hours: b.compensated_hours,
          expired_hours: b.expired_hours,
          has_bank_hours: b.config?.has_bank_hours || false,
          max_accumulation_hours: b.config?.max_accumulation_hours || 0,
          last_calculation_date: b.last_calculation_date,
        })) || [],
      };

      setReports(prev => [report, ...prev]);
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar relatório');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    reports,
    loading,
    error,
    generateReport,
  };
}
