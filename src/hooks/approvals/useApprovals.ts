import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalService, Approval } from '@/services/approvals/approvalService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('🔍 [useProcessApproval.mutationFn] INÍCIO - Dados recebidos:', {
        aprovacao_id,
        status,
        observacoes: observacoes?.substring(0, 100) || '(vazio)',
        aprovador_id,
        aprovador_id_type: typeof aprovador_id,
        aprovador_id_length: aprovador_id?.length,
        timestamp: new Date().toISOString()
      });

      // Validar aprovador_id antes de chamar
      if (!aprovador_id || aprovador_id.trim() === '') {
        console.error('❌ [useProcessApproval.mutationFn] ERRO: aprovador_id inválido!', {
          aprovador_id,
          isNull: aprovador_id === null,
          isUndefined: aprovador_id === undefined,
          isEmpty: aprovador_id === '',
          isWhitespace: aprovador_id?.trim() === ''
        });
        throw new Error('aprovador_id é obrigatório e não pode estar vazio');
      }

      console.log('📞 [useProcessApproval.mutationFn] Chamando ApprovalService.processApproval...');
      const result = await ApprovalService.processApproval(aprovacao_id, status, observacoes, aprovador_id);
      console.log('✅ [useProcessApproval.mutationFn] Resultado recebido:', result);
      return result;
    },
    onSuccess: async (data, variables) => {
      console.log('✅ [useProcessApproval.onSuccess] Aprovação processada com sucesso!', { data, variables });
      
      // Invalidar queries de aprovações IMEDIATAMENTE
      // Não precisamos verificar status manualmente - a RPC já atualizou o banco
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      
      // Invalidar queries relacionadas a compras (se for requisição)
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      
      // Refetch imediato das queries de aprovações para atualizar a UI
      // Usando Promise.all para fazer em paralelo e aguardar conclusão
      try {
        await Promise.all([
          queryClient.refetchQueries({ 
            queryKey: ['pending-approvals'],
            exact: false
          }),
          queryClient.refetchQueries({ 
            queryKey: ['approvals-by-process'],
            exact: false
          })
        ]);
        
        console.log('✅ [useProcessApproval.onSuccess] Queries refetchadas com sucesso');
      } catch (refetchError) {
        console.error('❌ [useProcessApproval.onSuccess] Erro ao refetch queries:', refetchError);
      }
      
      toast.success('Aprovação processada com sucesso!');
    },
    onError: (error: any) => {
      console.error('❌ [useProcessApproval.onError] Erro ao processar aprovação:', error);
      console.error('❌ [useProcessApproval.onError] Detalhes do erro:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      toast.error('Erro ao processar aprovação');
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      
      // Aguardar um pequeno delay para garantir que a transação foi commitada no banco
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Forçar refetch aguardando a conclusão
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['pending-approvals'] }),
        queryClient.refetchQueries({ queryKey: ['approvals-by-process'] })
      ]);
      
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
