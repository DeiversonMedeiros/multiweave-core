// =====================================================
// HOOK PARA BUSCAR DEPENDENTES POR FUNCIONÁRIO
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { Dependent } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';

export function useDependentsByEmployee(employeeId: string) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['dependentsByEmployee', companyId, employeeId],
    queryFn: async (): Promise<Dependent[]> => {
      if (!companyId || !employeeId) return [];

      const result = await EntityService.list({
        schema: 'rh',
        table: 'dependents',
        companyId,
        filters: { 
          employee_id: employeeId,
          ativo: true 
        },
        orderBy: 'nome'
      });

      return result.data || [];
    },
    enabled: !!companyId && !!employeeId,
  });
}
