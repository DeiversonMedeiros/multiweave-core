// =====================================================
// HOOK PARA LAZY LOADING DE DADOS
// Sistema ERP MultiWeave Core
// =====================================================

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { queryConfig } from '@/lib/react-query-config';

export interface LazyEntityDataOptions {
  schema: string;
  table: string;
  companyId: string;
  preloadIds?: string[]; // IDs para pré-carregar
}

/**
 * Hook para carregar dados de entidades sob demanda (lazy loading)
 * 
 * Útil para:
 * - Detalhes de funcionários (carregar apenas quando expandir)
 * - Histórico de registros (carregar por demanda)
 * - Detalhes de veículos
 * - Itens de estoque (carregar detalhes sob demanda)
 * 
 * @example
 * const { loadData, getData, isLoaded, isLoading } = useLazyEntityData({
 *   schema: 'rh',
 *   table: 'employees',
 *   companyId: selectedCompanyId
 * });
 * 
 * // Carregar dados quando necessário
 * useEffect(() => {
 *   if (selectedEmployeeId) {
 *     loadData(selectedEmployeeId);
 *   }
 * }, [selectedEmployeeId, loadData]);
 */
export function useLazyEntityData<T = any>(options: LazyEntityDataOptions) {
  const {
    schema,
    table,
    companyId,
    preloadIds = []
  } = options;

  const queryClient = useQueryClient();
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set(preloadIds));

  // Pré-carregar IDs fornecidos
  useMemo(() => {
    preloadIds.forEach(id => {
      if (!loadedIds.has(id)) {
        queryClient.prefetchQuery({
          queryKey: [schema, table, 'lazy', id, companyId],
          queryFn: () => EntityService.getById<T>(schema, table, id, companyId),
          ...queryConfig.semiStatic,
        });
        setLoadedIds(prev => new Set(prev).add(id));
      }
    });
  }, [preloadIds, schema, table, companyId, queryClient, loadedIds]);

  /**
   * Carrega dados de uma entidade por ID
   */
  const loadData = useCallback(async (id: string): Promise<T | null> => {
    if (loadedIds.has(id)) {
      // Dados já carregados, buscar do cache
      const cached = queryClient.getQueryData<T>([schema, table, 'lazy', id, companyId]);
      if (cached) {
        return cached;
      }
    }

    try {
      const result = await EntityService.getById<T>(schema, table, id, companyId);
      setLoadedIds(prev => new Set(prev).add(id));
      return result.data;
    } catch (error) {
      console.error(`Erro ao carregar ${schema}.${table} com id ${id}:`, error);
      return null;
    }
  }, [schema, table, companyId, loadedIds, queryClient]);

  /**
   * Carrega múltiplos dados de uma vez
   */
  const loadMultiple = useCallback(async (ids: string[]): Promise<(T | null)[]> => {
    const results = await Promise.all(
      ids.map(id => loadData(id))
    );
    return results;
  }, [loadData]);

  /**
   * Obtém dados de uma entidade (carrega se necessário)
   */
  const getData = useCallback((id: string): T | null => {
    const cached = queryClient.getQueryData<T>([schema, table, 'lazy', id, companyId]);
    if (cached) {
      return cached;
    }
    
    // Se não está no cache, carregar
    loadData(id);
    return null;
  }, [schema, table, companyId, queryClient, loadData]);

  /**
   * Verifica se um ID já foi carregado
   */
  const isLoaded = useCallback((id: string): boolean => {
    return loadedIds.has(id);
  }, [loadedIds]);

  /**
   * Hook para usar com React Query para um ID específico
   */
  const useData = (id: string | null) => {
    return useQuery({
      queryKey: [schema, table, 'lazy', id, companyId],
      queryFn: () => EntityService.getById<T>(schema, table, id!, companyId).then(r => r.data),
      enabled: !!id && !!companyId,
      ...queryConfig.semiStatic,
    });
  };

  /**
   * Limpa dados carregados
   */
  const clearLoaded = useCallback(() => {
    setLoadedIds(new Set());
    // Invalidar queries relacionadas
    queryClient.invalidateQueries({
      queryKey: [schema, table, 'lazy']
    });
  }, [schema, table, queryClient]);

  /**
   * Remove um ID específico do cache
   */
  const removeData = useCallback((id: string) => {
    setLoadedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    queryClient.removeQueries({
      queryKey: [schema, table, 'lazy', id, companyId]
    });
  }, [schema, table, companyId, queryClient]);

  return {
    loadData,
    loadMultiple,
    getData,
    isLoaded,
    useData,
    clearLoaded,
    removeData,
    loadedIds: Array.from(loadedIds),
    loadedCount: loadedIds.size
  };
}

/**
 * Hook simplificado para lazy loading de uma única entidade
 * 
 * @example
 * const { data, load, isLoading } = useLazyEntity({
 *   schema: 'rh',
 *   table: 'employees',
 *   companyId: selectedCompanyId,
 *   id: selectedEmployeeId
 * });
 */
export function useLazyEntity<T = any>(options: LazyEntityDataOptions & { id: string | null }) {
  const { id, ...lazyOptions } = options;
  const { useData, loadData, isLoaded } = useLazyEntityData<T>(lazyOptions);
  
  const query = useData(id || '');
  
  const load = useCallback(() => {
    if (id) {
      loadData(id);
    }
  }, [id, loadData]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    load,
    isLoaded: id ? isLoaded(id) : false
  };
}

