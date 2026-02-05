import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TimeRecordsService } from '@/services/rh/timeRecordsService';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';

/**
 * Hook para buscar registros de ponto com hora extra pendentes.
 * No portal gestor (forManager: true), retorna apenas registros dos funcionários
 * subordinados ao gestor logado.
 */
export function usePendingOvertimeRecords(forManager?: boolean) {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-overtime-records', selectedCompany?.id, forManager ? user?.id : null],
    queryFn: () => {
      if (forManager && user?.id) {
        return TimeRecordsService.getPendingOvertimeRecordsForManager(
          selectedCompany?.id || '',
          user.id
        );
      }
      return TimeRecordsService.getPendingOvertimeRecords(selectedCompany?.id || '');
    },
    enabled: !!selectedCompany?.id && (!forManager || !!user?.id),
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  });
}

/**
 * Hook para aprovar registro de hora extra
 */
export function useApproveOvertimeRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) =>
      TimeRecordsService.approveOvertime(id, user?.id || '', observacoes),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pending-overtime-records'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
}

/**
 * Hook para rejeitar registro de hora extra
 */
export function useRejectOvertimeRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes: string }) =>
      TimeRecordsService.rejectOvertime(id, user?.id || '', observacoes),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pending-overtime-records'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-records'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
}

/**
 * Hook para buscar estatísticas de horas extras pendentes.
 * Passar forManager: true no portal gestor para stats apenas dos subordinados.
 */
export function useOvertimeApprovalsStats(forManager?: boolean) {
  const { selectedCompany } = useCompany();
  const { data: pendingRecords, isLoading } = usePendingOvertimeRecords(forManager);

  const stats = React.useMemo(() => {
    if (!pendingRecords) {
      return {
        total_pendentes: 0,
        total_horas_extras: 0,
        por_funcionario: {}
      };
    }

    return {
      total_pendentes: pendingRecords.length || 0,
      total_horas_extras: pendingRecords.reduce((acc: number, record: any) => {
        // Considerar horas separadas se disponível, senão usar horas_extras
        const horas50 = Number(record.horas_extras_50) || 0;
        const horas100 = Number(record.horas_extras_100) || 0;
        const horasTotal = horas50 + horas100 || Number(record.horas_extras) || 0;
        return acc + horasTotal;
      }, 0),
      por_funcionario: pendingRecords.reduce((acc: any, record: any) => {
        const employeeId = record.employee_id;
        if (!acc[employeeId]) {
          acc[employeeId] = {
            funcionario_nome: record.funcionario_nome,
            funcionario_matricula: record.funcionario_matricula,
            total_registros: 0,
            total_horas: 0
          };
        }
        acc[employeeId].total_registros += 1;
        // Considerar horas separadas se disponível
        const horas50 = Number(record.horas_extras_50) || 0;
        const horas100 = Number(record.horas_extras_100) || 0;
        const horasTotal = horas50 + horas100 || Number(record.horas_extras) || 0;
        acc[employeeId].total_horas += horasTotal;
        return acc;
      }, {})
    };
  }, [pendingRecords]);

  return {
    data: stats,
    isLoading
  };
}

