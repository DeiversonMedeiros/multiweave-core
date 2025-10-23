import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalService, Approval } from '@/services/approvals/approvalService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function usePendingApprovals() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-approvals', selectedCompany?.id, user?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !user?.id) throw new Error('Dados necessários não disponíveis');
      return ApprovalService.getPendingApprovals(user.id, selectedCompany.id);
    },
    enabled: !!selectedCompany?.id && !!user?.id
  });
}

export function useApprovalsByProcess(processo_tipo: string, processo_id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['approvals-by-process', processo_tipo, processo_id, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.getApprovalsByProcess(processo_tipo, processo_id, selectedCompany.id);
    },
    enabled: !!selectedCompany?.id && !!processo_tipo && !!processo_id
  });
}

export function useProcessApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aprovacao_id,
      status,
      observacoes,
      aprovador_id
    }: {
      aprovacao_id: string;
      status: 'aprovado' | 'rejeitado' | 'cancelado';
      observacoes: string;
      aprovador_id: string;
    }) => {
      return ApprovalService.processApproval(aprovacao_id, status, observacoes, aprovador_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      toast.success('Aprovação processada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao processar aprovação');
      console.error(error);
    }
  });
}

export function useTransferApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aprovacao_id,
      novo_aprovador_id,
      motivo,
      transferido_por
    }: {
      aprovacao_id: string;
      novo_aprovador_id: string;
      motivo: string;
      transferido_por: string;
    }) => {
      return ApprovalService.transferApproval(aprovacao_id, novo_aprovador_id, motivo, transferido_por);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      toast.success('Aprovação transferida com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao transferir aprovação');
      console.error(error);
    }
  });
}

export function useCreateApprovalsForProcess() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({
      processo_tipo,
      processo_id
    }: {
      processo_tipo: string;
      processo_id: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.createApprovalsForProcess(processo_tipo, processo_id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      toast.success('Aprovações criadas com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar aprovações');
      console.error(error);
    }
  });
}

export function useResetApprovalsAfterEdit() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({
      processo_tipo,
      processo_id
    }: {
      processo_tipo: string;
      processo_id: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.resetApprovalsAfterEdit(processo_tipo, processo_id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      toast.success('Aprovações resetadas com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao resetar aprovações');
      console.error(error);
    }
  });
}

export function useCanEditSolicitation() {
  return useMutation({
    mutationFn: async ({
      processo_tipo,
      processo_id
    }: {
      processo_tipo: string;
      processo_id: string;
    }) => {
      return ApprovalService.canEditSolicitation(processo_tipo, processo_id);
    },
    onError: (error: any) => {
      console.error('Erro ao verificar permissão de edição:', error);
    }
  });
}
