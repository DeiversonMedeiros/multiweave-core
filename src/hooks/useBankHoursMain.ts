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

      if (error) {
        console.error('Erro na função RPC get_bank_hours_balance:', error);
        throw error;
      }
      
      // A função RPC retorna um array, precisamos retornar o primeiro elemento
      // Se não há dados, significa que não tem configuração de banco de horas
      return data?.[0] || null;
    } catch (err) {
      console.error('Erro ao buscar saldo do funcionário:', err);
      // Retornar null em caso de erro para evitar quebrar a interface
      return null;
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
