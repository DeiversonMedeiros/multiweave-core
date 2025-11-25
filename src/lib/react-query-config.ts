// =====================================================
// CONFIGURAÇÃO CENTRALIZADA DE REACT QUERY
// Sistema ERP MultiWeave Core
// =====================================================

import { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Configurações de cache padronizadas para diferentes tipos de dados
 */
export const queryConfig = {
  // Dados dinâmicos (atualizam frequentemente)
  // Ex: Registros de ponto, solicitações pendentes, notificações
  dynamic: {
    staleTime: 2 * 60 * 1000,      // 2 minutos
    gcTime: 5 * 60 * 1000,         // 5 minutos (antigo cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as const,
  
  // Dados semi-estáticos (atualizam ocasionalmente)
  // Ex: Funcionários, veículos, materiais, exames periódicos
  semiStatic: {
    staleTime: 5 * 60 * 1000,      // 5 minutos
    gcTime: 10 * 60 * 1000,         // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as const,
  
  // Dados estáticos (raramente mudam)
  // Ex: Centros de custo, projetos, parceiros, perfis
  static: {
    staleTime: 60 * 60 * 1000,      // 1 hora
    gcTime: 24 * 60 * 60 * 1000,    // 24 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  } as const,
  
  // Dashboard (atualiza periodicamente)
  // Ex: Estatísticas de dashboards, métricas agregadas
  dashboard: {
    staleTime: 1 * 60 * 1000,       // 1 minuto
    gcTime: 5 * 60 * 1000,           // 5 minutos
    refetchInterval: 5 * 60 * 1000,  // 5 minutos
    refetchOnWindowFocus: true,
  } as const,
};

/**
 * Helper para aplicar configuração de cache em queries
 */
export function withQueryConfig<TData, TError = Error>(
  config: typeof queryConfig.dynamic | typeof queryConfig.semiStatic | typeof queryConfig.static | typeof queryConfig.dashboard,
  options?: Omit<UseQueryOptions<TData, TError>, 'staleTime' | 'gcTime' | 'refetchOnWindowFocus' | 'refetchOnMount' | 'refetchInterval'>
): UseQueryOptions<TData, TError> {
  return {
    ...config,
    ...options,
  } as UseQueryOptions<TData, TError>;
}

/**
 * Helper para aplicar configuração padrão em mutations
 */
export function withMutationConfig<TData, TError = Error, TVariables = void>(
  options?: UseMutationOptions<TData, TError, TVariables>
): UseMutationOptions<TData, TError, TVariables> {
  return {
    retry: 1,
    retryDelay: 1000,
    ...options,
  };
}

