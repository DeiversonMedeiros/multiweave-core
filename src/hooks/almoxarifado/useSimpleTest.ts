import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export const useSimpleTest = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const { selectedCompany } = useCompany();

  const testQuery = async () => {
    if (!selectedCompany?.id) {
      setError('Nenhuma empresa selecionada');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Testing with company:', selectedCompany.id);

      // Testar query simples sem RLS primeiro
      const { data: testData, error: queryError } = await supabase
        .from('almoxarifado.almoxarifados')
        .select('id, nome')
        .limit(1);

      if (queryError) {
        console.error('Query error:', queryError);
        throw queryError;
      }

      console.log('Test data:', testData);
      setData(testData);
    } catch (err) {
      console.error('Test error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testQuery();
  }, [selectedCompany?.id]);

  return { data, loading, error, refetch: testQuery };
};
