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
      
      // VERIFICAÇÃO CRÍTICA: Confirmar que o status foi atualizado no banco antes de invalidar queries
      // Isso garante que a transação foi commitada e os dados estão consistentes
      let statusVerified = false;
      let verificationAttempts = 0;
      const maxVerificationAttempts = 3;
      
      while (!statusVerified && verificationAttempts < maxVerificationAttempts) {
        try {
          const { data: approvalStatus, error: statusError } = await supabase
            .from('aprovacoes_unificada')
            .select('id, status, processo_id, processo_tipo')
            .eq('id', variables.aprovacao_id)
            .single();
          
          if (statusError) {
            console.warn(`⚠️ [useProcessApproval.onSuccess] Erro ao verificar status (tentativa ${verificationAttempts + 1}):`, statusError);
          } else if (approvalStatus) {
            const expectedStatus = variables.status;
            const actualStatus = approvalStatus.status;
            statusVerified = actualStatus === expectedStatus;
            
            console.log(`🔍 [useProcessApproval.onSuccess] Verificação de status (tentativa ${verificationAttempts + 1}):`, {
              approvalId: variables.aprovacao_id,
              expectedStatus,
              actualStatus,
              verified: statusVerified,
              timestamp: new Date().toISOString()
            });
            
            if (!statusVerified && verificationAttempts < maxVerificationAttempts - 1) {
              // Aguardar um pouco antes de tentar novamente
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (err) {
          console.warn(`⚠️ [useProcessApproval.onSuccess] Erro ao verificar status (tentativa ${verificationAttempts + 1}):`, err);
        }
        
        verificationAttempts++;
      }
      
      if (!statusVerified) {
        console.error('❌ [useProcessApproval.onSuccess] ATENÇÃO: Status não foi verificado após múltiplas tentativas!', {
          approvalId: variables.aprovacao_id,
          expectedStatus: variables.status,
          attempts: verificationAttempts
        });
      }
      
      // Buscar informações da aprovação para identificar o processo
      let processoId: string | undefined;
      let processoTipo: string | undefined;
      
      try {
        const { data: approvalData } = await supabase
          .from('aprovacoes_unificada')
          .select('processo_id, processo_tipo')
          .eq('id', variables.aprovacao_id)
          .single();
        
        if (approvalData) {
          processoId = approvalData.processo_id;
          processoTipo = approvalData.processo_tipo;
          console.log('📋 [useProcessApproval.onSuccess] Processo identificado:', { processoId, processoTipo });
        }
      } catch (err) {
        console.warn('⚠️ [useProcessApproval.onSuccess] Erro ao buscar dados da aprovação:', err);
      }
      
      // Invalidar queries de aprovações
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-by-process'] });
      
      // IMPORTANTE: Refetch imediato das queries de aprovações para atualizar a UI
      // Isso garante que a aprovação desapareça imediatamente da lista pendente
      await queryClient.refetchQueries({ queryKey: ['pending-approvals'] });
      console.log('✅ [useProcessApproval.onSuccess] Queries de aprovações refetchadas imediatamente');
      
      // Se for requisição de compra, invalidar queries específicas
      if (processoTipo === 'requisicao_compra' && processoId) {
        console.log('🛒 [useProcessApproval.onSuccess] Invalidando queries específicas de requisição:', processoId);
        // Invalidar query específica desta requisição (se existir)
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey;
            if (Array.isArray(key)) {
              // Invalidar se a query contém o ID da requisição
              return key.some(k => k === processoId || (typeof k === 'object' && k && 'id' in k && k.id === processoId));
            }
            return false;
          }
        });
      }
      
      // Invalidar TODAS as queries de compras para garantir atualização completa
      // Isso inclui requisições, cotações, pedidos e detalhes individuais
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      
      // Invalidar também queries genéricas de entidades que podem estar sendo usadas
      // para buscar detalhes de requisições (usando EntityService com schema 'compras' e table 'requisicoes_compra')
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          if (Array.isArray(key)) {
            // Verificar se é uma query de EntityService para requisições de compra
            const comprasIndex = key.indexOf('compras');
            const requisicoesIndex = key.findIndex(k => 
              typeof k === 'string' && (k === 'requisicoes_compra' || k.toLowerCase().includes('requisicao'))
            );
            
            // Se tem 'compras' no key e 'requisicoes_compra' ou similar, invalidar
            if (comprasIndex !== -1 && requisicoesIndex !== -1) {
              console.log('🔄 [useProcessApproval] Invalidando query de EntityService para requisições:', key);
              return true;
            }
          }
          return false;
        }
      });
      
      console.log('🔄 [useProcessApproval] Queries de compras e requisições invalidadas');
      
      // IMPORTANTE: Refetch imediato com pequeno delay para garantir commit da transação
      // O refetch deve ser feito após invalidar para garantir dados atualizados
      await new Promise(resolve => setTimeout(resolve, 500)); // Aumentado para 500ms para garantir commit
      
      // Forçar refetch aguardando a conclusão para garantir atualização
      // Isso garante que a aprovação desapareça imediatamente da lista pendente
      try {
        const refetchResults = await Promise.all([
          queryClient.refetchQueries({ 
            queryKey: ['pending-approvals'],
            exact: false // Refetch todas as queries que começam com 'pending-approvals'
          }),
          queryClient.refetchQueries({ 
            queryKey: ['approvals-by-process'],
            exact: false
          })
        ]);
        
        console.log('✅ [useProcessApproval] Queries refetchadas com sucesso', {
          pendingApprovalsRefetched: refetchResults[0]?.length || 0,
          approvalsByProcessRefetched: refetchResults[1]?.length || 0
        });
      } catch (refetchError) {
        console.error('❌ [useProcessApproval] Erro ao refetch queries:', refetchError);
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
