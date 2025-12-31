import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService, EntityListParams, EntityFilters } from '@/services/generic/entityService';
import { queryConfig } from '@/lib/react-query-config';

// =====================================================
// HOOK GENÉRICO PARA QUALQUER ENTIDADE
// =====================================================

export function useEntityData<T = any>(params: EntityListParams) {
  console.log('🔍 [DEBUG] useEntityData - chamado com params:', params);
  
  // Limpar filtros undefined para evitar conflitos de query key
  const cleanFilters = params.filters || {};
  const queryKey = [params.schema, params.table, params.companyId, cleanFilters, params.page, params.pageSize];
  console.log('🔍 [DEBUG] useEntityData - queryKey:', queryKey);
  
  // Validar se companyId é válido (não vazio e não undefined)
  const isValidCompanyId = params.companyId && params.companyId.trim() !== '';
  
  const query = useQuery({
    queryKey,
    queryFn: () => {
      console.log('🔍 [DEBUG] useEntityData - queryFn chamado para:', params.schema, params.table);
      console.log('🔍 [DEBUG] useEntityData - queryFn params:', params);
      return EntityService.list<T>(params);
    },
    enabled: isValidCompanyId,
    ...queryConfig.semiStatic,
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
    ...queryConfig.dynamic,
  });
}

// =====================================================
// HOOKS ESPECÍFICOS PARA MÓDULOS COMUNS
// =====================================================

// Hook para RH
export function useRHData<T = any>(table: string, companyId: string, filters?: EntityFilters, pageSize?: number) {
  const finalPageSize = pageSize ?? 100;
  
  console.log('🔍 [useRHData] INÍCIO - Parâmetros recebidos:', {
    table,
    companyId,
    filters,
    pageSizeParam: pageSize,
    finalPageSize,
    timestamp: new Date().toISOString()
  });
  
  const query = useEntityData<T>({
    schema: 'rh',
    table,
    companyId,
    filters,
    page: 1,
    pageSize: finalPageSize
  });

  console.log('🔍 [useRHData] Resposta do useEntityData:', {
    hasData: !!query.data,
    dataType: typeof query.data,
    isArray: Array.isArray(query.data),
    dataKeys: query.data ? Object.keys(query.data) : [],
    dataDataLength: query.data?.data?.length,
    totalCount: query.data?.totalCount,
    hasMore: query.data?.hasMore,
    isLoading: query.isLoading,
    error: query.error,
    timestamp: new Date().toISOString()
  });

  const result = {
    ...query,
    data: query.data?.data || [], // query.data.data é o array de dados
    totalCount: query.data?.totalCount || 0,
    hasMore: query.data?.hasMore || false
  };

  console.log('✅ [useRHData] RESULTADO FINAL:', {
    dataLength: result.data.length,
    totalCount: result.totalCount,
    hasMore: result.hasMore,
    isLoading: result.isLoading,
    timestamp: new Date().toISOString()
  });
  
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
