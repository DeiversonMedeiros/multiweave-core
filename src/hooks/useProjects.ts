import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { Project } from '@/lib/supabase-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';

/**
 * Hook para listar projetos
 */
export function useProjects() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'projects', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<Project>({
        schema: 'public',
        table: 'projects',
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
 * Hook para buscar projetos ativos
 */
export function useActiveProjects() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'projects', 'active', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<Project>({
        schema: 'public',
        table: 'projects',
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
