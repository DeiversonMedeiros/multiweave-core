import { useQuery } from '@tanstack/react-query';
import { useEntityData } from '@/hooks/generic/useEntityData';
import { Project } from '@/lib/supabase-types';
import { useCompany } from '@/lib/company-context';

/**
 * Hook para listar projetos
 */
export function useProjects() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'projects', selectedCompany?.id],
    queryFn: () => useEntityData<Project>({
      schema: 'public',
      table: 'projects',
      companyId: selectedCompany?.id || '',
      page: 1,
      pageSize: 100
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar projetos ativos
 */
export function useActiveProjects() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'projects', 'active', selectedCompany?.id],
    queryFn: () => useEntityData<Project>({
      schema: 'public',
      table: 'projects',
      companyId: selectedCompany?.id || '',
      filters: { ativo: true },
      page: 1,
      pageSize: 100
    }),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}
