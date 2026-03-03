import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { TimeRecordsService } from '@/services/rh/timeRecordsService';
import { 
  TimeRecord, 
  TimeRecordInsert, 
  TimeRecordUpdate 
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar registros de ponto (sem paginação - use apenas para casos específicos)
 * @deprecated Use useTimeRecordsPaginated para melhor performance
 */
export function useTimeRecords(params: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'time-records', selectedCompany?.id, params],
    queryFn: async () => {
      console.group('[useTimeRecords]');
      console.log('[useTimeRecords] companyId:', selectedCompany?.id || null);
      console.log('[useTimeRecords] params:', params);
      try {
        const rows = await TimeRecordsService.list({
          ...params,
          companyId: selectedCompany?.id || ''
        });
        console.log('[useTimeRecords] rows length:', rows?.length || 0);
        if (rows?.length) {
          console.log('[useTimeRecords] sample row:', rows[0]);
        }
        console.groupEnd();
        return rows;
      } catch (e: any) {
        console.error('[useTimeRecords] error:', e?.message || e);
        console.groupEnd();
        throw e;
      }
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.dynamic,
  });
}

/**
 * Hook para listar registros de ponto com paginação infinita (otimizado)
 * Usa paginação no servidor para reduzir significativamente o uso de egress
 */
export function useTimeRecordsPaginated(
  params: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    pageSize?: number;
    managerUserId?: string;
  },
  options?: {
    enabled?: boolean;
  }
) {
  const { selectedCompany } = useCompany();
  const { pageSize = 50, employeeId, startDate, endDate, status, managerUserId } = params;

  // Determinar se a query deve estar habilitada
  // Security fix: Se employeeId ou managerUserId são passados como undefined,
  // devemos esperar até que sejam definidos para evitar expor dados de todos os funcionários
  // durante o carregamento inicial.
  // 
  // Nota: Se o parâmetro não for passado no objeto params, não será verificado
  // (permite que páginas admin consultem todos os registros quando apropriado)
  const hasEmployeeIdParam = 'employeeId' in params;
  const hasManagerUserIdParam = 'managerUserId' in params;
  
  // Se o parâmetro foi explicitamente passado (mesmo que undefined), 
  // requeremos que seja truthy antes de habilitar a query
  const isEnabled = (options?.enabled !== false) && 
    !!selectedCompany?.id && 
    (!hasEmployeeIdParam || !!employeeId) && 
    (!hasManagerUserIdParam || !!managerUserId);

  // Estabilizar queryKey com useMemo para evitar recriações desnecessárias
  const queryKey = useMemo(() => [
    'rh', 
    'time-records', 
    'paginated', 
    selectedCompany?.id, 
    employeeId, 
    startDate, 
    endDate, 
    status, 
    pageSize, 
    managerUserId
  ], [selectedCompany?.id, employeeId, startDate, endDate, status, pageSize, managerUserId]);

  // Ref para rastrear o último cursor retornado (proteção contra loops)
  const lastReturnedCursorRef = useRef<number | undefined>(undefined);
  const lastReturnedCursorCallCountRef = useRef<number>(0);
  const getNextPageParamCallCountRef = useRef<number>(0);
  const lastCallTimeRef = useRef<number>(0);
  const loopDetectedRef = useRef<boolean>(false);
  // Cache do último resultado para evitar recálculos desnecessários
  // Incluir uma chave baseada nos parâmetros da última página para melhor detecção
  const lastResultCacheRef = useRef<{ 
    totalRecords: number; 
    totalCount: number; 
    result: number | undefined;
    lastPageDataLength: number;
    allPagesLength: number;
  } | null>(null);
  
  // Resetar cache e flags de loop quando os parâmetros da query mudarem
  useEffect(() => {
    lastResultCacheRef.current = null;
    loopDetectedRef.current = false;
    lastReturnedCursorRef.current = undefined;
    lastReturnedCursorCallCountRef.current = 0;
    getNextPageParamCallCountRef.current = 0;
    lastCallTimeRef.current = 0;
  }, [queryKey]);

  // Memoizar getNextPageParam para evitar recriações que causam loops
  const getNextPageParam = useCallback((lastPage: {
    data: TimeRecord[];
    nextCursor?: number;
    hasMore: boolean;
    totalCount: number;
  }, allPages: Array<{
    data: TimeRecord[];
    nextCursor?: number;
    hasMore: boolean;
    totalCount: number;
  }>) => {
    // Calcular valores críticos PRIMEIRO para verificação de cache
    const totalRecordsLoaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
    const allPagesLength = allPages.length;
    const lastPageDataLength = lastPage.data.length;
    
    // VERIFICAÇÃO DE CACHE ANTES DE QUALQUER OUTRA LÓGICA
    // Isso evita recálculos desnecessários que causam loops
    if (lastResultCacheRef.current) {
      const cached = lastResultCacheRef.current;
      const isExactMatch = 
        cached.totalRecords === totalRecordsLoaded && 
        cached.totalCount === lastPage.totalCount &&
        cached.lastPageDataLength === lastPageDataLength &&
        cached.allPagesLength === allPagesLength;
      
      if (isExactMatch) {
        // Cache hit perfeito - retornar imediatamente sem logs ou cálculos
        return cached.result;
      }
    }
    
    const callId = Math.random().toString(36).substring(7);
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    
    // Log detalhado de cada chamada (apenas quando não é cache hit)
    console.log(`[useTimeRecordsPaginated] 🔍 getNextPageParam CHAMADO [${callId}]:`, {
      callId,
      timestamp: new Date().toISOString(),
      timeSinceLastCall: `${timeSinceLastCall}ms`,
      callCount: getNextPageParamCallCountRef.current + 1,
      loopDetected: loopDetectedRef.current,
      lastPageDataLength,
      lastPageTotalCount: lastPage.totalCount,
      lastPageHasMore: lastPage.hasMore,
      lastPageNextCursor: lastPage.nextCursor,
      allPagesLength,
      totalRecordsLoaded,
      lastReturnedCursor: lastReturnedCursorRef.current,
      lastReturnedCursorCallCount: lastReturnedCursorCallCountRef.current,
      hasCache: !!lastResultCacheRef.current,
    });
    
    // Se já detectamos um loop anteriormente, retornar undefined imediatamente
    if (loopDetectedRef.current) {
      console.log(`[useTimeRecordsPaginated] ⏭️ [${callId}] Loop já detectado anteriormente, retornando undefined imediatamente`);
      return undefined;
    }

    // PROTEÇÃO ANTI-LOOP: Detectar chamadas muito frequentes (loop infinito)
    getNextPageParamCallCountRef.current++;
    
    // Se foi chamado mais de 2 vezes em menos de 100ms, quebrar o loop IMEDIATAMENTE
    if (timeSinceLastCall < 100) {
      if (getNextPageParamCallCountRef.current > 2) {
        console.error(`[useTimeRecordsPaginated] 🚨 [${callId}] LOOP INFINITO DETECTADO! Quebrando após ${getNextPageParamCallCountRef.current} chamadas em ${timeSinceLastCall}ms`, {
          callId,
          callCount: getNextPageParamCallCountRef.current,
          timeWindow: `${timeSinceLastCall}ms`,
          lastPageDataLength,
          lastPageTotalCount: lastPage.totalCount,
          allPagesLength,
          totalRecordsLoaded,
        });
        loopDetectedRef.current = true;
        getNextPageParamCallCountRef.current = 0;
        lastCallTimeRef.current = now;
        const result = undefined;
        lastResultCacheRef.current = { 
          totalRecords: totalRecordsLoaded, 
          totalCount: lastPage.totalCount, 
          result,
          lastPageDataLength,
          allPagesLength,
        };
        return result;
      }
    } else {
      // Resetar contador se passou tempo suficiente
      getNextPageParamCallCountRef.current = 0;
      loopDetectedRef.current = false; // Resetar flag de loop se passou tempo
    }
    lastCallTimeRef.current = now;
    
    console.log(`[useTimeRecordsPaginated] 📊 [${callId}] Cálculos:`, {
      callId,
      totalRecordsLoaded,
      lastPageTotalCount: lastPage.totalCount,
      lastPageDataLength,
      allPagesLength,
    });
    
    // PROTEÇÃO IMEDIATA: Se já carregamos tudo ou mais que o total, retornar undefined
    if (totalRecordsLoaded >= lastPage.totalCount) {
      console.log(`[useTimeRecordsPaginated] 🛑 [${callId}] Todos os registros já carregados:`, {
        callId,
        totalRecordsLoaded,
        totalCount: lastPage.totalCount,
      });
      const result = undefined;
      lastResultCacheRef.current = { 
        totalRecords: totalRecordsLoaded, 
        totalCount: lastPage.totalCount, 
        result,
        lastPageDataLength,
        allPagesLength,
      };
      return result;
    }
    
    // Se não há dados na última página, não há mais páginas
    if (lastPageDataLength === 0) {
      console.log(`[useTimeRecordsPaginated] 🛑 [${callId}] Última página vazia`);
      const result = undefined;
      lastResultCacheRef.current = { 
        totalRecords: totalRecordsLoaded, 
        totalCount: lastPage.totalCount, 
        result,
        lastPageDataLength,
        allPagesLength,
      };
      return result;
    }
    
    // Verificação rigorosa: só há mais páginas se total carregado é menor que total disponível
    const actuallyHasMore = totalRecordsLoaded < lastPage.totalCount;
    
    // Calcular o próximo cursor baseado no offset atual
    const nextCursor = actuallyHasMore ? totalRecordsLoaded : undefined;
    
    console.log(`[useTimeRecordsPaginated] 🧮 [${callId}] Cálculo de cursor:`, {
      callId,
      totalRecordsLoaded,
      totalCount: lastPage.totalCount,
      actuallyHasMore,
      calculatedNextCursor: nextCursor,
      lastReturnedCursor: lastReturnedCursorRef.current,
    });
    
    // PROTEÇÃO CRÍTICA: Se estamos retornando o mesmo cursor repetidamente, parar IMEDIATAMENTE
    let finalResult: number | undefined = nextCursor;
    
    if (nextCursor !== undefined) {
      if (nextCursor === lastReturnedCursorRef.current) {
        lastReturnedCursorCallCountRef.current++;
        
        // Se o mesmo cursor foi retornado mais de 1 vez, quebrar o loop IMEDIATAMENTE
        if (lastReturnedCursorCallCountRef.current > 1) {
          console.error(`[useTimeRecordsPaginated] 🚨 [${callId}] LOOP DETECTADO: Cursor ${nextCursor} repetido ${lastReturnedCursorCallCountRef.current} vezes!`);
          loopDetectedRef.current = true;
          finalResult = undefined;
        }
      } else {
        // Novo cursor diferente, resetar contador e atualizar referência
        lastReturnedCursorRef.current = nextCursor;
        lastReturnedCursorCallCountRef.current = 0;
      }
    } else {
      // Se retornando undefined, resetar tudo (não há mais páginas)
      lastReturnedCursorRef.current = undefined;
      lastReturnedCursorCallCountRef.current = 0;
    }
    
    // Salvar resultado no cache antes de retornar
    lastResultCacheRef.current = { 
      totalRecords: totalRecordsLoaded, 
      totalCount: lastPage.totalCount, 
      result: finalResult,
      lastPageDataLength,
      allPagesLength,
    };
    
    console.log(`[useTimeRecordsPaginated] ✅ [${callId}] Retornando resultado final:`, {
      callId,
      result: finalResult,
      totalRecordsLoaded,
      totalCount: lastPage.totalCount,
    });
    
    // Retornar o resultado final
    return finalResult;
  }, []); // Array vazio = função nunca muda

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }): Promise<{
      data: TimeRecord[];
      nextCursor?: number;
      hasMore: boolean;
      totalCount: number;
    }> => {
      const stackTrace = new Error().stack;
      const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
      
      console.log(`[useTimeRecordsPaginated] 🔄 Query executando:`, {
        queryKey: queryKey.slice(0, 3), // Log apenas parte da key
        pageParam,
        timestamp: new Date().toISOString(),
        caller,
        stackTrace: stackTrace?.split('\n').slice(0, 5).join('\n'),
      });
      
      const queryStartTime = performance.now();

      if (!selectedCompany?.id) {
        console.warn('[useTimeRecordsPaginated] ⚠️ Sem company selecionada:', {
          selectedCompany,
          timestamp: new Date().toISOString(),
        });
        return { data: [], hasMore: false, totalCount: 0 };
      }

      // Log detalhado dos parâmetros antes de chamar o serviço
      console.log('[useTimeRecordsPaginated] 📤 Chamando TimeRecordsService.listPaginated com:', {
        companyId: selectedCompany.id,
        pageOffset: pageParam as number,
        pageLimit: pageSize,
        employeeId: employeeId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || null,
        managerUserId: managerUserId || null,
        managerUserIdType: typeof managerUserId,
        hasManagerUserId: !!managerUserId,
        timestamp: new Date().toISOString(),
      });

      // Buscar registros paginados do servidor
      const serviceStartTime = performance.now();
      const result = await TimeRecordsService.listPaginated({
        companyId: selectedCompany.id,
        pageOffset: pageParam as number,
        pageLimit: pageSize,
        employeeId,
        startDate,
        endDate,
        status,
        managerUserId,
      });
      const serviceEndTime = performance.now();
      const serviceDuration = serviceEndTime - serviceStartTime;

      // Calcular hasMore baseado nos registros retornados vs total
      // Se retornou menos registros que o pageSize, não há mais páginas
      // Se o offset atual + registros retornados < totalCount, há mais páginas
      const recordsReturned = result.data.length;
      const currentOffset = pageParam as number;
      const hasMore = recordsReturned === pageSize && (currentOffset + recordsReturned) < result.totalCount;

      // LOG DETALHADO: Verificar dados recebidos do serviço
      const pageNum = Math.floor((pageParam as number) / pageSize) + 1;
      const registrosZerados = result.data.filter(r => !r.horas_trabalhadas || r.horas_trabalhadas === 0).length;
      const registrosComDados = result.data.filter(r => r.horas_trabalhadas && r.horas_trabalhadas > 0).length;
      
      console.log(`[useTimeRecordsPaginated] 📄 Página ${pageNum} carregada:`, {
        pageParam,
        pageSize,
        pageNum,
        totalCount: result.totalCount,
        dataLength: result.data.length,
        hasMore,
        nextCursor: hasMore ? ((pageParam as number) + pageSize) : undefined,
        calculo: `(${pageParam} + ${pageSize}) < ${result.totalCount} = ${hasMore}`,
        progresso: `${(pageParam as number) + result.data.length} de ${result.totalCount}`,
        sampleData: result.data.slice(0, 3).map(r => ({
          id: r.id,
          data_registro: r.data_registro,
          employee_nome: r.employee_nome,
          horas_trabalhadas: r.horas_trabalhadas,
          horas_extras_50: r.horas_extras_50,
          horas_extras_100: r.horas_extras_100,
          horas_noturnas: r.horas_noturnas,
          tipo: typeof r.horas_trabalhadas,
        })),
        registrosZerados,
        registrosComDados,
        sampleIds: result.data.slice(0, 5).map(r => r.id)
      });

      return {
        data: result.data,
        nextCursor: hasMore ? ((pageParam as number) + pageSize) : undefined,
        hasMore,
        totalCount: result.totalCount,
      };
    },
    getNextPageParam,
    enabled: isEnabled,
    initialPageParam: 0,
    // Desabilitar completamente refetch automático
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Desabilitar prefetch automático da próxima página
    getPreviousPageParam: undefined,
    // Não fazer prefetch automático - só carregar quando fetchNextPage for chamado explicitamente
    ...queryConfig.dynamic,
  });
}

/**
 * Hook para buscar registro por ID
 */
export function useTimeRecord(id: string) {
  return useQuery({
    queryKey: ['rh', 'time-records', id],
    queryFn: () => TimeRecordsService.getById(id),
    enabled: !!id,
    ...queryConfig.semiStatic,
  });
}

/**
 * Hook para buscar registros pendentes de aprovação
 */
export function usePendingTimeRecords() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'time-records', 'pending', selectedCompany?.id],
    queryFn: async () => {
      const records = await TimeRecordsService.list({
        companyId: selectedCompany?.id || '',
        status: 'pendente'
      });
      return records;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 1 * 60 * 1000, // Refetch a cada minuto
    ...queryConfig.dynamic,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar registro de ponto
 */
export function useCreateTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (record: TimeRecordInsert) => TimeRecordsService.create(record),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao criar registro de ponto:', error);
    },
  });
}

/**
 * Hook para atualizar registro de ponto
 */
export function useUpdateTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, record }: { id: string; record: TimeRecordUpdate }) => 
      TimeRecordsService.update(id, record),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar registro de ponto:', error);
    },
  });
}

/**
 * Hook para excluir registro de ponto
 */
export function useDeleteTimeRecord() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return TimeRecordsService.delete(id, selectedCompany.id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.removeQueries({ queryKey: ['rh', 'time-records', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir registro de ponto:', error);
    },
  });
}

/**
 * Hook para aprovar registro de ponto
 */
export function useApproveTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) => 
      TimeRecordsService.approve(id, observacoes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao aprovar registro:', error);
    },
  });
}

/**
 * Hook para rejeitar registro de ponto
 */
export function useRejectTimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes: string }) => 
      TimeRecordsService.reject(id, observacoes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao rejeitar registro:', error);
    },
  });
}

// =====================================================
// HOOKS DE AÇÃO RÁPIDA
// =====================================================

/**
 * Hook para registrar entrada
 */
export function useRegisterEntry() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerEntry(employeeId, selectedCompany?.id || ''),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar entrada:', error);
    },
  });
}

/**
 * Hook para registrar saída
 */
export function useRegisterExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerExit(employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar saída:', error);
    },
  });
}

/**
 * Hook para registrar entrada do almoço
 */
export function useRegisterLunchEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerLunchEntry(employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar entrada do almoço:', error);
    },
  });
}

/**
 * Hook para registrar saída do almoço
 */
export function useRegisterLunchExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => 
      TimeRecordsService.registerLunchExit(employeeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.setQueryData(['rh', 'time-records', 'today', data.employee_id], data);
    },
    onError: (error) => {
      console.error('Erro ao registrar saída do almoço:', error);
    },
  });
}

export default useTimeRecords;
