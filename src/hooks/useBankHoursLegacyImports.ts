import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { BankHoursLegacyImport } from '@/integrations/supabase/bank-hours-types';

interface LegacyImportForm {
  employee_id: string;
  hours_amount: number;
  reference_date: string;
  description?: string;
}

export function useBankHoursLegacyImports(companyId: string) {
  const [imports, setImports] = useState<BankHoursLegacyImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImports = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const result = await EntityService.list<BankHoursLegacyImport>({
        schema: 'rh',
        table: 'bank_hours_legacy_imports',
        companyId,
        orderBy: 'reference_date',
        orderDirection: 'DESC'
      });

      setImports(result.data ?? []);
    } catch (err) {
      console.error('❌ Erro ao buscar importações legadas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar importações legadas');
    } finally {
      setLoading(false);
    }
  };

  const importLegacyHours = async (payload: LegacyImportForm) => {
    try {
      const { data, error: rpcError } = await (supabase as any).rpc('import_legacy_bank_hours', {
        p_employee_id: payload.employee_id,
        p_company_id: companyId,
        p_hours_amount: payload.hours_amount,
        p_reference_date: payload.reference_date,
        p_description: payload.description
      });

      if (rpcError) throw rpcError;
      await fetchImports();
      return data;
    } catch (err) {
      console.error('❌ Erro ao importar horas legadas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao importar horas legadas');
      throw err;
    }
  };

  useEffect(() => {
    fetchImports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  return {
    imports,
    loading,
    error,
    fetchImports,
    importLegacyHours
  };
}


