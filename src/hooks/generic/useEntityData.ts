import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService, EntityListParams, EntityFilters } from '@/services/generic/entityService';

// =====================================================
// HOOK GENÉRICO PARA QUALQUER ENTIDADE
// =====================================================

export function useEntityData<T = any>(params: EntityListParams) {
  return useQuery({
    queryKey: [params.schema, params.table, params.companyId, params.filters, params.page, params.pageSize],
    queryFn: () => EntityService.list<T>(params),
    enabled: !!params.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useEntityById<T = any>(
  schema: string,
  table: string,
  id: string,
  companyId: string
) {
  return useQuery({
    queryKey: [schema, table, 'byId', id, companyId],
    queryFn: () => EntityService.getById<T>(schema, table, id, companyId),
    enabled: !!id && !!companyId,
  });
}

export function useCreateEntity<T = any>(schema: string, table: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<T>) => EntityService.create<T>(schema, table, data),
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a esta entidade
      queryClient.invalidateQueries({
        queryKey: [schema, table]
      });
    },
  });
}

export function useUpdateEntity<T = any>(schema: string, table: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => 
      EntityService.update<T>(schema, table, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [schema, table]
      });
    },
  });
}

export function useDeleteEntity(schema: string, table: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => EntityService.delete(schema, table, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [schema, table]
      });
    },
  });
}

export function useSearchEntity<T = any>(
  schema: string,
  table: string,
  companyId: string,
  searchTerm: string,
  additionalFilters: EntityFilters = {}
) {
  return useQuery({
    queryKey: [schema, table, 'search', companyId, searchTerm, additionalFilters],
    queryFn: () => EntityService.search<T>(schema, table, companyId, searchTerm, additionalFilters),
    enabled: !!companyId && !!searchTerm,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// =====================================================
// HOOKS ESPECÍFICOS PARA MÓDULOS COMUNS
// =====================================================

// Hook para RH
export function useRHData<T = any>(table: string, companyId: string, filters?: EntityFilters) {
  const query = useEntityData<T>({
    schema: 'rh',
    table,
    companyId,
    filters,
    page: 1,
    pageSize: 100
  });

  return {
    ...query,
    data: query.data?.data || [], // Extrair apenas o array de dados
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false
  };
}

// Hook para Financeiro
export function useFinanceiroData<T = any>(table: string, companyId: string, filters?: EntityFilters) {
  const query = useEntityData<T>({
    schema: 'financeiro',
    table,
    companyId,
    filters,
    page: 1,
    pageSize: 100
  });

  return {
    ...query,
    data: query.data?.data || [], // Extrair apenas o array de dados
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false
  };
}

// Hook para Comercial
export function useComercialData<T = any>(table: string, companyId: string, filters?: EntityFilters) {
  const query = useEntityData<T>({
    schema: 'comercial',
    table,
    companyId,
    filters,
    page: 1,
    pageSize: 100
  });

  return {
    ...query,
    data: query.data?.data || [], // Extrair apenas o array de dados
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false
  };
}
