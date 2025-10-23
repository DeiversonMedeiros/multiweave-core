import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService, EntityListParams, EntityFilters } from '@/services/generic/entityService';

// =====================================================
// HOOK GENÉRICO PARA QUALQUER ENTIDADE
// =====================================================

export function useEntityData<T = any>(params: EntityListParams) {
  console.log('🔍 [DEBUG] useEntityData - chamado com params:', params);
  
  // Limpar filtros undefined para evitar conflitos de query key
  const cleanFilters = params.filters || {};
  const queryKey = [params.schema, params.table, params.companyId, cleanFilters, params.page, params.pageSize];
  console.log('🔍 [DEBUG] useEntityData - queryKey:', queryKey);
  
  const query = useQuery({
    queryKey,
    queryFn: () => {
      console.log('🔍 [DEBUG] useEntityData - queryFn chamado para:', params.schema, params.table);
      console.log('🔍 [DEBUG] useEntityData - queryFn params:', params);
      return EntityService.list<T>(params);
    },
    enabled: !!params.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
    retryDelay: 1000,
  });

  console.log('🔍 [DEBUG] useEntityData - query.status:', query.status);
  console.log('🔍 [DEBUG] useEntityData - query.isLoading:', query.isLoading);
  console.log('🔍 [DEBUG] useEntityData - query.isFetching:', query.isFetching);
  console.log('🔍 [DEBUG] useEntityData - query.isEnabled:', !!params.companyId);

  console.log('🔍 [DEBUG] useEntityData - query.data:', query.data);
  console.log('🔍 [DEBUG] useEntityData - query.isLoading:', query.isLoading);
  console.log('🔍 [DEBUG] useEntityData - query.error:', query.error);
  console.log('🔍 [DEBUG] useEntityData - query.isFetching:', query.isFetching);
  console.log('🔍 [DEBUG] useEntityData - query.status:', query.status);
  console.log('🔍 [DEBUG] useEntityData - query.isEnabled:', !!params.companyId);

  return query;
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

export function useCreateEntity<T = any>(schema: string, table: string, companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<T>) => EntityService.create<T>({
      schema,
      table,
      companyId,
      data
    }),
    onSuccess: () => {
      // Invalidar todas as queries relacionadas a esta entidade
      queryClient.invalidateQueries({
        queryKey: [schema, table]
      });
      // Também invalidar queries específicas com companyId
      queryClient.invalidateQueries({
        queryKey: [schema, table, companyId]
      });
    },
  });
}

export function useUpdateEntity<T = any>(schema: string, table: string, companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => 
      EntityService.update<T>({
        schema,
        table,
        companyId,
        id,
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [schema, table]
      });
      // Também invalidar queries específicas com companyId
      queryClient.invalidateQueries({
        queryKey: [schema, table, companyId]
      });
    },
  });
}

export function useDeleteEntity(schema: string, table: string, companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => EntityService.delete({
      schema,
      table,
      companyId,
      id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [schema, table]
      });
      // Também invalidar queries específicas com companyId
      queryClient.invalidateQueries({
        queryKey: [schema, table, companyId]
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
  console.log('🔍 [DEBUG] useRHData - chamado para table:', table, 'companyId:', companyId);
  
  const query = useEntityData<T>({
    schema: 'rh',
    table,
    companyId,
    filters,
    page: 1,
    pageSize: 100
  });

  console.log('🔍 [DEBUG] useRHData - query.data:', query.data);
  console.log('🔍 [DEBUG] useRHData - query.data?.data:', query.data?.data);
  console.log('🔍 [DEBUG] useRHData - query.isLoading:', query.isLoading);
  console.log('🔍 [DEBUG] useRHData - query.error:', query.error);

  const result = {
    ...query,
    data: query.data?.data || [], // query.data.data é o array de dados
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false
  };

  console.log('🔍 [DEBUG] useRHData - result.data:', result.data);
  return result;
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
    data: query.data?.data || [], // query.data.data é o array de dados
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
    data: query.data?.data || [], // query.data.data é o array de dados
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false
  };
}
