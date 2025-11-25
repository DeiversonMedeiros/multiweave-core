// =====================================================
// HOOK PARA PAGINAÇÃO BASEADA EM CURSOR
// Sistema ERP MultiWeave Core
// =====================================================

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryConfig } from '@/lib/react-query-config';

export interface CursorPaginationParams {
  schema: string;
  table: string;
  companyId: string;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalLoaded: number;
}

/**
 * Hook para paginação baseada em cursor (mais eficiente que offset)
 * 
 * @example
 * const { data, loadMore, hasMore, isLoading } = useCursorPagination({
 *   schema: 'rh',
 *   table: 'employees',
 *   companyId: selectedCompanyId,
 *   pageSize: 50
 * });
 */
export function useCursorPagination<T = any>(params: CursorPaginationParams) {
  const {
    schema,
    table,
    companyId,
    pageSize = 50,
    orderBy = 'id',
    orderDirection = 'DESC',
    filters = {}
  } = params;

  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [allData, setAllData] = useState<T[]>([]);

  const queryKey = [
    'cursor-pagination',
    schema,
    table,
    companyId,
    lastCursor,
    pageSize,
    orderBy,
    orderDirection,
    filters
  ];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CursorPaginationResult<T>> => {
      const { data, error } = await (supabase as any).rpc('get_entity_data_cursor', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        last_id: lastCursor || null,
        limit_param: pageSize,
        order_by: orderBy,
        order_direction: orderDirection,
        filters: filters
      });

      if (error) {
        console.error('Erro na paginação cursor-based:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          data: [],
          hasMore: false,
          totalLoaded: allData.length
        };
      }

      // Extrair dados do JSONB
      const items = data.map((row: any) => row.data as T);
      const lastRow = data[data.length - 1];
      const nextCursor = lastRow?.next_cursor || null;
      const hasMore = lastRow?.has_more || false;

      return {
        data: items,
        nextCursor: nextCursor?.toString() || undefined,
        hasMore,
        totalLoaded: allData.length + items.length
      };
    },
    enabled: !!companyId,
    ...queryConfig.semiStatic,
  });

  // Atualizar allData quando novos dados chegarem
  useEffect(() => {
    if (query.data?.data && query.data.data.length > 0) {
      // Se lastCursor é null, é a primeira página - substituir dados
      // Se lastCursor não é null, é uma nova página - adicionar aos dados existentes
      if (lastCursor === null) {
        setAllData(query.data.data);
      } else {
        setAllData(prev => {
          // Evitar duplicatas
          const existingIds = new Set(prev.map((item: any) => item.id));
          const newItems = query.data.data.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [query.data?.data, lastCursor]);

  const loadMore = useCallback(() => {
    if (query.data?.nextCursor && query.data.hasMore) {
      setLastCursor(query.data.nextCursor);
    }
  }, [query.data]);

  const reset = useCallback(() => {
    setLastCursor(null);
    setAllData([]);
  }, []);

  // Combinar todos os dados carregados
  const combinedData = allData.length > 0 ? allData : (query.data?.data || []);

  return {
    data: combinedData,
    loadMore,
    reset,
    hasMore: query.data?.hasMore || false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    totalLoaded: query.data?.totalLoaded || combinedData.length
  };
}

/**
 * Hook para paginação infinita baseada em cursor (usando useInfiniteQuery)
 * 
 * @example
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage
 * } = useInfiniteCursorPagination({
 *   schema: 'rh',
 *   table: 'employees',
 *   companyId: selectedCompanyId,
 *   pageSize: 50
 * });
 */
export function useInfiniteCursorPagination<T = any>(params: CursorPaginationParams) {
  const {
    schema,
    table,
    companyId,
    pageSize = 50,
    orderBy = 'id',
    orderDirection = 'DESC',
    filters = {}
  } = params;

  const queryKey = [
    'infinite-cursor-pagination',
    schema,
    table,
    companyId,
    pageSize,
    orderBy,
    orderDirection,
    filters
  ];

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }): Promise<CursorPaginationResult<T>> => {
      const { data, error } = await (supabase as any).rpc('get_entity_data_cursor', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        last_id: pageParam || null,
        limit_param: pageSize,
        order_by: orderBy,
        order_direction: orderDirection,
        filters: filters
      });

      if (error) {
        console.error('Erro na paginação cursor-based:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          data: [],
          hasMore: false,
          totalLoaded: 0
        };
      }

      // Extrair dados do JSONB
      const items = data.map((row: any) => row.data as T);
      const lastRow = data[data.length - 1];
      const nextCursor = lastRow?.next_cursor || null;
      const hasMore = lastRow?.has_more || false;

      return {
        data: items,
        nextCursor: nextCursor?.toString() || undefined,
        hasMore,
        totalLoaded: items.length
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    enabled: !!companyId,
    initialPageParam: null as string | null,
    ...queryConfig.semiStatic,
  });
}

