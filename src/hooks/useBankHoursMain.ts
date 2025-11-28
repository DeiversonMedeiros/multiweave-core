import { supabase } from '../integrations/supabase/client';
import { EntityService } from '../services/generic/entityService';

// =====================================================
// HOOK PRINCIPAL DO BANCO DE HORAS
// =====================================================

export function useBankHours(companyId: string) {
  // Função para buscar saldo de um funcionário específico
  const getEmployeeBalance = async (employeeId: string) => {
    try {
      console.log('[useBankHours] 🔍 Buscando saldo:', {
        employee_id: employeeId,
        company_id: companyId
      });

      const { data, error } = await (supabase as any)
        .rpc('get_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId,
        });

      if (error) {
        console.error('[useBankHours] ❌ Erro na função RPC get_bank_hours_balance:', error);
        throw error;
      }
      
      const result = data?.[0] || null;
      
      console.log('[useBankHours] ✅ Saldo recebido:', {
        has_data: !!result,
        balance: result?.current_balance,
        has_bank_hours: result?.has_bank_hours,
        max_accumulation: result?.max_accumulation_hours
      });
      
      // A função RPC retorna um array, precisamos retornar o primeiro elemento
      // Se não há dados, significa que não tem configuração de banco de horas
      return result;
    } catch (err) {
      console.error('[useBankHours] ❌ Erro ao buscar saldo do funcionário:', err);
      // Retornar null em caso de erro para evitar quebrar a interface
      return null;
    }
  };

  // Função para buscar transações de um funcionário específico
  const getEmployeeTransactions = async (employeeId: string) => {
    try {
      console.log('[useBankHours] 🔍 Buscando transações:', {
        employee_id: employeeId,
        company_id: companyId
      });

      const result = await EntityService.list({
        schema: 'rh',
        table: 'bank_hours_transactions',
        companyId: companyId,
        filters: { employee_id: employeeId },
        orderBy: 'transaction_date',
        orderDirection: 'DESC'
      });
      
      console.log('[useBankHours] ✅ Transações recebidas:', {
        total: result.data?.length || 0,
        transactions: result.data?.map((t: any) => ({
          type: t.transaction_type,
          amount: t.hours_amount,
          date: t.transaction_date
        }))
      });
      
      return result.data || [];
    } catch (err) {
      console.error('[useBankHours] ❌ Erro ao buscar transações do funcionário:', err);
      throw err;
    }
  };

  return {
    getEmployeeBalance,
    getEmployeeTransactions,
  };
}
