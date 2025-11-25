// =====================================================
// HOOK PARA DADOS ESTÁTICOS COM PRÉ-CARREGAMENTO
// Sistema ERP MultiWeave Core
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryConfig } from '@/lib/react-query-config';

/**
 * Hook para carregar dados estáticos uma vez e filtrar no cliente
 * 
 * @example
 * // Carregar todos os centros de custo e filtrar por empresa no cliente
 * const costCenters = useStaticData(
 *   ['cost-centers', 'all'],
 *   () => fetchAllCostCenters(),
 *   (item) => item.company_id === selectedCompanyId
 * );
 */
export function useStaticData<T>(
  queryKey: (string | number | boolean | null | undefined)[],
  queryFn: () => Promise<T[]>,
  filterFn?: (item: T) => boolean
) {
  const { data: allData = [], ...queryResult } = useQuery({
    queryKey,
    queryFn,
    ...queryConfig.static,
  });
  
  const filteredData = useMemo(() => {
    if (!filterFn) return allData;
    return allData.filter(filterFn);
  }, [allData, filterFn]);
  
  return {
    ...queryResult,
    data: filteredData,
    allData, // Dados completos sem filtro
  };
}

/**
 * Hook para carregar dados estáticos com múltiplos filtros
 * 
 * @example
 * // Carregar projetos e filtrar por empresa e status
 * const activeProjects = useStaticDataMultiFilter(
 *   ['projects', 'all'],
 *   () => fetchAllProjects(),
 *   [
 *     (item) => item.company_id === selectedCompanyId,
 *     (item) => item.ativo === true
 *   ]
 * );
 */
export function useStaticDataMultiFilter<T>(
  queryKey: (string | number | boolean | null | undefined)[],
  queryFn: () => Promise<T[]>,
  filterFns: Array<(item: T) => boolean> = []
) {
  const { data: allData = [], ...queryResult } = useQuery({
    queryKey,
    queryFn,
    ...queryConfig.static,
  });
  
  const filteredData = useMemo(() => {
    if (filterFns.length === 0) return allData;
    return allData.filter((item) => filterFns.every((fn) => fn(item)));
  }, [allData, filterFns]);
  
  return {
    ...queryResult,
    data: filteredData,
    allData,
  };
}

