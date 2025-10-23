import { supabase } from '../integrations/supabase/client';
import { EntityService } from '../services/generic/entityService';

// =====================================================
// HOOK PRINCIPAL DO BANCO DE HORAS
// =====================================================

export function useBankHours(companyId: string) {
  // Função para buscar saldo de um funcionário específico
  const getEmployeeBalance = async (employeeId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId,
        });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao buscar saldo do funcionário:', err);
      throw err;
    }
  };

  // Função para buscar transações de um funcionário específico
  const getEmployeeTransactions = async (employeeId: string) => {
    try {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'bank_hours_transactions',
        companyId: companyId,
        filters: { employee_id: employeeId },
        orderBy: 'transaction_date',
        orderDirection: 'DESC'
      });
      
      return result.data || [];
    } catch (err) {
      console.error('Erro ao buscar transações do funcionário:', err);
      throw err;
    }
  };

  return {
    getEmployeeBalance,
    getEmployeeTransactions,
  };
}
