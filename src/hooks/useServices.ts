import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';

export interface Service {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  project_id?: string;
  partner_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para listar serviços
 */
export function useServices(filters?: { project_id?: string; ativo?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'services', selectedCompany?.id, filters],
    queryFn: async () => {
      const result = await EntityService.list<Service>({
        schema: 'public',
        table: 'services',
        companyId: selectedCompany?.id || '',
        filters: filters || {},
        page: 1,
        pageSize: 100,
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

/**
 * Hook para buscar serviços ativos
 */
export function useActiveServices() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'services', 'active', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<Service>({
        schema: 'public',
        table: 'services',
        companyId: selectedCompany?.id || '',
        filters: { ativo: true },
        page: 1,
        pageSize: 100,
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

/**
 * Hook para buscar serviços por projeto
 */
export function useServicesByProject(projectId?: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['public', 'services', 'by-project', projectId, selectedCompany?.id],
    queryFn: async () => {
      if (!projectId) return { data: [], total: 0 };
      
      const result = await EntityService.list<Service>({
        schema: 'public',
        table: 'services',
        companyId: selectedCompany?.id || '',
        filters: { 
          project_id: projectId,
          ativo: true 
        },
        page: 1,
        pageSize: 100,
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result;
    },
    enabled: !!selectedCompany?.id && !!projectId,
    ...queryConfig.static,
  });
}


