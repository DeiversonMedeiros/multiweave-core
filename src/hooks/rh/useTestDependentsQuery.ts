// =====================================================
// HOOK DE TESTE PARA DEPENDENTES
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export function useTestDependentsQuery() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['testDependents', companyId],
    queryFn: async () => {
      console.log('Testando consulta de dependentes...', { companyId });
      
      const { data, error } = await supabase
        .from('rh.employee_plan_dependents')
        .select('*')
        .eq('company_id', companyId)
        .limit(5);

      console.log('Resultado da consulta:', { data, error });

      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }

      return data;
    },
    enabled: !!companyId,
    retry: 1,
  });
}
