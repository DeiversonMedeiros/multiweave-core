import { useQuery } from '@tanstack/react-query';
import { useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EntityService } from '@/services/generic/entityService';
import { CostCenter } from '@/lib/supabase-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar centros de custo
 */
export function useCostCenters() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'cost_centers', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<CostCenter>({
        schema: 'public',
        table: 'cost_centers',
        companyId: selectedCompany?.id || '',
        page: 1,
        pageSize: 100
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

/**
 * Hook para buscar centro de custo por ID
 */
export function useCostCenter(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'cost_centers', 'byId', id, selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<CostCenter>({
        schema: 'public',
        table: 'cost_centers',
        companyId: selectedCompany?.id || '',
        filters: { id }
      });
      return result.data[0] || null;
    },
    enabled: !!id && !!selectedCompany?.id,
  });
}

/**
 * Hook para buscar centros de custo ativos
 */
export function useActiveCostCenters() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'cost_centers', 'active', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<CostCenter>({
        schema: 'public',
        table: 'cost_centers',
        companyId: selectedCompany?.id || '',
        filters: { ativo: true },
        page: 1,
        pageSize: 100
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar centro de custo
 */
export function useCreateCostCenter() {
  return useCreateEntity<CostCenter>('public', 'cost_centers');
}

/**
 * Hook para atualizar centro de custo
 */
export function useUpdateCostCenter() {
  return useUpdateEntity<CostCenter>('public', 'cost_centers');
}

/**
 * Hook para deletar centro de custo
 */
export function useDeleteCostCenter() {
  return useDeleteEntity('public', 'cost_centers');
}
