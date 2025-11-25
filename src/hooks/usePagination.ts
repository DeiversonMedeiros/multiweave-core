// =====================================================
// HOOK PARA PAGINAÇÃO NO FRONTEND (LAZY LOADING)
// Sistema ERP MultiWeave Core
// =====================================================

import { useState, useMemo } from 'react';

export interface UsePaginationOptions<T> {
  items: T[];
  initialCount?: number;
  step?: number;
}

export interface UsePaginationReturn<T> {
  visibleItems: T[];
  hasMore: boolean;
  showMore: () => void;
  reset: () => void;
  visibleCount: number;
  totalCount: number;
}

/**
 * Hook para paginação no frontend (lazy loading)
 * 
 * Útil para listas já carregadas no cliente que precisam de paginação visual
 * 
 * @example
 * const { visibleItems, hasMore, showMore } = usePagination({
 *   items: allEmployees,
 *   initialCount: 10,
 *   step: 10
 * });
 */
export function usePagination<T>({
  items,
  initialCount = 10,
  step = 10
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const hasMore = visibleCount < items.length;

  const showMore = () => {
    setVisibleCount(prev => Math.min(prev + step, items.length));
  };

  const reset = () => {
    setVisibleCount(initialCount);
  };

  return {
    visibleItems,
    hasMore,
    showMore,
    reset,
    visibleCount,
    totalCount: items.length
  };
}

