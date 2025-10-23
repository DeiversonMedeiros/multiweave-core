import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export const useTestAlmoxarifado = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const { selectedCompany } = useCompany();

  const testQuery = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Testing with company:', selectedCompany.id);

      // Definir o contexto da empresa para RLS
      const { error: contextError } = await supabase.rpc('set_company_context', { 
        company_id: selectedCompany.id 
      });

      if (contextError) {
        console.error('Context error:', contextError);
        throw contextError;
      }

      // Testar query simples
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

