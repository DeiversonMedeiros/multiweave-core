import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { Partner } from '@/lib/supabase-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';

/**
 * Hook para listar parceiros/fornecedores
 */
export function usePartners() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'partners', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<Partner>({
        schema: 'public',
        table: 'partners',
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

/**
 * Hook para buscar parceiros/fornecedores ativos
 */
export function useActivePartners() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'partners', 'active', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<Partner>({
        schema: 'public',
        table: 'partners',
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

