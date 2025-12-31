import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import {
  NFEntryInput,
  PurchaseOrderInput,
  purchaseService,
  PurchaseRequisitionInput,
  QuoteCycleInput,
  QuoteSupplierResponseInput,
  QuoteWorkflowState,
  PurchaseOrderWorkflowState,
  RequisitionWorkflowState,
} from '@/services/compras/purchaseService';
import { EntityFilters } from '@/services/generic/entityService';

function useCompanyGuard() {
  const { selectedCompany } = useCompany();
  if (!selectedCompany?.id) {
    throw new Error('Selecione uma empresa para continuar');
  }
  return selectedCompany.id;
}

export function usePurchaseRequisitions(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['compras', 'requisicoes', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }
      const result = await purchaseService.listRequisitions(selectedCompany.id, filters);
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    // ✅ REFRESH AUTOMÁTICO: Atualizar a cada 10 segundos para refletir mudanças de outros compradores
    refetchInterval: 10000, // 10 segundos
    refetchOnWindowFocus: true, // Refetch quando a aba recebe foco
    refetchIntervalInBackground: false, // Não refetch quando a aba está em background
  });
}

export function useCreatePurchaseRequisition() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: PurchaseRequisitionInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.createRequisition({
        companyId: selectedCompany.id,
        userId: user.id,
        payload,
      });
    },
    onSuccess: () => {
      toast.success('Requisição criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar requisição');
    },
  });
}

export function useUpdatePurchaseRequisition() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PurchaseRequisitionInput }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.updateRequisition({
        companyId: selectedCompany.id,
        requisicaoId: id,
        payload,
      });
    },
    onSuccess: () => {
      toast.success('Requisição atualizada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar requisição');
    },
  });
}

export function useRequisitionWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (params: {
      requisicaoId: string;
      from: RequisitionWorkflowState;
      to: RequisitionWorkflowState;
      payload?: Record<string, any>;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.transitionRequisition({
        companyId: selectedCompany.id,
        requisicaoId: params.requisicaoId,
        from: params.from,
        to: params.to,
        actorId: user.id,
        payload: params.payload,
      });
    },
    onSuccess: () => {
      toast.success('Workflow atualizado');
      queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] });
      queryClient.invalidateQueries({ queryKey: ['compras', 'follow-up'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar workflow');
    },
  });
}

export function useQuotes(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['compras', 'cotacoes', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      const result = await purchaseService.listQuotes(selectedCompany.id, filters);
      return result.data;
    },
    enabled: !!selectedCompany?.id,
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return purchaseService.deleteQuote({
        companyId: selectedCompany.id,
        quoteId: id,
      });
    },
    onSuccess: () => {
      toast.success('Cotação excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cotação');
    },
  });
}

export function usePurchaseOrders(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['compras', 'pedidos', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      const result = await purchaseService.listPurchaseOrders(selectedCompany.id, filters);
      return result.data;
    },
    enabled: !!selectedCompany?.id,
  });
}

export function useStartQuoteCycle() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: QuoteCycleInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.startQuoteCycle({
        companyId: selectedCompany.id,
        userId: user.id,
        input,
      });
    },
    onSuccess: () => {
      toast.success('Cotação iniciada');
      queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] });
      queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao iniciar cotação');
    },
  });
}

export function useQuoteSupplierResponse() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (data: QuoteSupplierResponseInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return purchaseService.upsertQuoteSupplierResponse({
        companyId: selectedCompany.id,
        data,
      });
    },
    onSuccess: () => {
      toast.success('Resposta registrada');
      queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar resposta do fornecedor');
    },
  });
}

export function useQuoteWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (params: {
      cotacaoId: string;
      from: QuoteWorkflowState;
      to: QuoteWorkflowState;
      payload?: Record<string, any>;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.transitionQuote({
        companyId: selectedCompany.id,
        cotacaoId: params.cotacaoId,
        from: params.from,
        to: params.to,
        actorId: user.id,
        payload: params.payload,
      });
    },
    onSuccess: () => {
      toast.success('Status da cotação atualizado');
      queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] });
      queryClient.invalidateQueries({ queryKey: ['compras', 'requisicoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cotação');
    },
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: PurchaseOrderInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.createPurchaseOrder({
        companyId: selectedCompany.id,
        userId: user.id,
        input,
      });
    },
    onSuccess: () => {
      toast.success('Pedido de compra criado');
      queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['compras', 'cotacoes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar pedido');
    },
  });
}

export function usePurchaseOrderWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (params: {
      pedidoId: string;
      from: PurchaseOrderWorkflowState;
      to: PurchaseOrderWorkflowState;
      payload?: Record<string, any>;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.transitionPurchaseOrder({
        companyId: selectedCompany.id,
        pedidoId: params.pedidoId,
        from: params.from,
        to: params.to,
        actorId: user.id,
        payload: params.payload,
      });
    },
    onSuccess: () => {
      toast.success('Workflow do pedido atualizado');
      queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['compras', 'follow-up'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar pedido');
    },
  });
}

export function useRecordNFEntry() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: NFEntryInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return purchaseService.recordNFEntry({
        companyId: selectedCompany.id,
        userId: user.id,
        input,
      });
    },
    onSuccess: () => {
      toast.success('NF registrada, iniciando conferência');
      queryClient.invalidateQueries({ queryKey: ['compras', 'nf-entradas'] });
      queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao registrar NF');
    },
  });
}

export function useNFEntries(filters?: EntityFilters) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['compras', 'nf-entradas', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      const result = await purchaseService.listNFEntries(selectedCompany.id, filters);
      return result.data;
    },
    enabled: !!selectedCompany?.id,
  });
}

export function useNFComparison(nfEntradaId?: string) {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['compras', 'nf-compare', nfEntradaId],
    queryFn: async () => {
      if (!selectedCompany?.id || !nfEntradaId) throw new Error('Dados insuficientes');
      const result = await purchaseService.compareNFWithPurchaseOrder({
        companyId: selectedCompany.id,
        nfEntradaId,
      });
      return result;
    },
    enabled: !!selectedCompany?.id && !!nfEntradaId,
  });
}

export function useFollowUpPipeline() {
  const { selectedCompany } = useCompany();
  return useQuery({
    queryKey: ['compras', 'follow-up', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      const result = await purchaseService.listFollowUp(selectedCompany.id);
      return result.data;
    },
    enabled: !!selectedCompany?.id,
  });
}

export function useSupplierRequirementChecker(tipo: 'normal' | 'emergencial', fornecedores: number) {
  return useMemo(() => {
    if (tipo === 'emergencial') {
      return fornecedores === 1;
    }
    return fornecedores >= 2 && fornecedores <= 6;
  }, [tipo, fornecedores]);
}


