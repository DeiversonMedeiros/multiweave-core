import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
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

  const queryKey = ['rh', 'time-records', 'paginated', selectedCompany?.id, employeeId, startDate, endDate, status, pageSize, managerUserId];

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }): Promise<{
      data: TimeRecord[];
      nextCursor?: number;
      hasMore: boolean;
      totalCount: number;
    }> => {
      const queryStartTime = performance.now();

      if (!selectedCompany?.id) {
        return { data: [], hasMore: false, totalCount: 0 };
      }

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

      const hasMore = (pageParam as number) + pageSize < result.totalCount;

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
    getNextPageParam: (lastPage, allPages) => {
      // Só retornar nextCursor se houver mais páginas
      // O React Query não faz prefetch automático por padrão
      const nextParam = lastPage.hasMore ? lastPage.nextCursor : undefined;
      const totalRecordsLoaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      
      console.log(`[useTimeRecordsPaginated] 🔍 getNextPageParam:`, {
        hasMore: lastPage.hasMore,
        nextCursor: lastPage.nextCursor,
        totalCount: lastPage.totalCount,
        dataLength: lastPage.data.length,
        totalPages: allPages.length,
        totalRecordsLoaded,
        progresso: `${totalRecordsLoaded} de ${lastPage.totalCount}`,
        retornando: nextParam,
        ultimaPaginaIds: lastPage.data.slice(0, 3).map(r => r.id)
      });
      
      return nextParam;
    },
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

  return useMutation({
    mutationFn: (id: string) => TimeRecordsService.delete(id),
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
