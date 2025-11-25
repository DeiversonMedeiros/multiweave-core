import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeRecordSignatureService } from '@/services/rh/timeRecordSignatureService';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';

/**
 * Hook para buscar assinaturas de ponto pendentes de aprovação
 */
export function usePendingSignatures() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['pending-signatures', selectedCompany?.id],
    queryFn: () => timeRecordSignatureService.getPendingSignatures(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  });
}

/**
 * Hook para aprovar assinatura de ponto
 */
export function useApproveSignature() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) =>
      timeRecordSignatureService.approveSignatureRPC(id, user?.id || '', observacoes),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-record-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
}

/**
 * Hook para rejeitar assinatura de ponto
 */
export function useRejectSignature() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason: string }) =>
      timeRecordSignatureService.rejectSignatureRPC(id, user?.id || '', rejectionReason),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'time-record-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
}

/**
 * Hook para buscar estatísticas de assinaturas pendentes
 */
export function useSignatureApprovalsStats() {
  const { data: pendingSignatures, isLoading } = usePendingSignatures();

  const stats = React.useMemo(() => {
    if (!pendingSignatures) {
      return {
        total_pendentes: 0,
        por_funcionario: {}
      };
    }

    return {
      total_pendentes: pendingSignatures.length || 0,
      por_funcionario: pendingSignatures.reduce((acc: any, signature: any) => {
        const employeeId = signature.employee_id;
        if (!acc[employeeId]) {
          acc[employeeId] = {
            funcionario_nome: signature.funcionario_nome,
            funcionario_matricula: signature.funcionario_matricula,
            total_assinaturas: 0,
            meses: []
          };
        }
        acc[employeeId].total_assinaturas += 1;
        acc[employeeId].meses.push(signature.month_year);
        return acc;
      }, {})
    };
  }, [pendingSignatures]);

  return {
    data: stats,
    isLoading
  };
}

