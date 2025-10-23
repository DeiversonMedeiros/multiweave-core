// =====================================================
// HOOK PARA ESTATÍSTICAS DE DEPENDENTES DOS PLANOS MÉDICOS
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { calculateAge } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

interface DependentsStats {
  totalDependents: number;
  totalValue: number;
  averageValue: number;
  activeDependents: number;
  suspendedDependents: number;
  cancelledDependents: number;
  dependentsByParentesco: Record<string, number>;
  dependentsByAge: {
    children: number;
    adults: number;
    elderly: number;
  };
}

export function useMedicalPlanDependentsStats() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['medicalPlanDependentsStats', companyId],
    queryFn: async (): Promise<DependentsStats> => {
      if (!companyId) {
        return {
          totalDependents: 0,
          totalValue: 0,
          averageValue: 0,
          activeDependents: 0,
          suspendedDependents: 0,
          cancelledDependents: 0,
          dependentsByParentesco: {},
          dependentsByAge: {
            children: 0,
            adults: 0,
            elderly: 0
          }
        };
      }

      const result = await EntityService.list({
        schema: 'rh',
        table: 'employee_plan_dependents',
        companyId
      });

      const dependents = result.data || [];

      // Calcular estatísticas básicas
      const totalDependents = dependents.length;
      const totalValue = dependents.reduce((sum, dep) => sum + dep.valor_mensal, 0);
      const averageValue = totalDependents > 0 ? totalValue / totalDependents : 0;

      // Calcular por status
      const activeDependents = dependents.filter(dep => dep.status === 'ativo').length;
      const suspendedDependents = dependents.filter(dep => dep.status === 'suspenso').length;
      const cancelledDependents = dependents.filter(dep => dep.status === 'cancelado').length;

      // Calcular por parentesco
      const dependentsByParentesco: Record<string, number> = {};
      dependents.forEach(dep => {
        dependentsByParentesco[dep.parentesco] = (dependentsByParentesco[dep.parentesco] || 0) + 1;
      });

      // Calcular por faixa etária
      const dependentsByAge = {
        children: 0,
        adults: 0,
        elderly: 0
      };

      dependents.forEach(dep => {
        if (dep.data_nascimento) {
          const age = calculateAge(dep.data_nascimento);
          if (age < 18) {
            dependentsByAge.children++;
          } else if (age < 60) {
            dependentsByAge.adults++;
          } else {
            dependentsByAge.elderly++;
          }
        }
      });

      return {
        totalDependents,
        totalValue,
        averageValue,
        activeDependents,
        suspendedDependents,
        cancelledDependents,
        dependentsByParentesco,
        dependentsByAge
      };
    },
    enabled: !!companyId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
