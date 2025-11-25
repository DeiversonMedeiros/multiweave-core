// =====================================================
// HOOK: USAR PARCELAS DE CONTAS A PAGAR
// =====================================================
// Data: 2025-11-15
// Descrição: Hook para gerenciar parcelas de contas a pagar usando EntityService
// Autor: Sistema MultiWeave Core

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { ContaPagarParcela, ContaPagarParcelaFormData } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';

/**
 * Hook para listar parcelas de uma conta a pagar
 */
export function useContasPagarParcelas(contaPagarId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'contas_pagar_parcelas', contaPagarId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !contaPagarId) return { data: [], total: 0 };

      const result = await EntityService.list<ContaPagarParcela>({
        schema: 'financeiro',
        table: 'contas_pagar_parcelas',
        companyId: selectedCompany.id,
        filters: { conta_pagar_id: contaPagarId },
        page: 1,
        pageSize: 1000
      });

      return result;
    },
    enabled: !!selectedCompany?.id && !!contaPagarId,
    ...queryConfig.static,
  });
}

/**
 * Hook para criar parcelas de uma conta a pagar
 */
export function useCreateContasPagarParcelas() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ contaPagarId, parcelas }: { contaPagarId: string; parcelas: ContaPagarParcelaFormData[] }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      const results = [];
      for (const parcela of parcelas) {
        // Gerar número do título da parcela usando RPC (wrapper no schema public)
        const { data: numeroTitulo } = await (await import('@/integrations/supabase/client')).supabase.rpc(
          'generate_titulo_number_parcela',
          {
            p_conta_pagar_id: contaPagarId,
            p_numero_parcela: parcela.numero_parcela
          }
        );

        const parcelaData = {
          conta_pagar_id: contaPagarId,
          company_id: selectedCompany.id,
          numero_parcela: parcela.numero_parcela,
          valor_parcela: parcela.valor_parcela,
          valor_original: parcela.valor_parcela,
          valor_atual: parcela.valor_parcela,
          data_vencimento: parcela.data_vencimento,
          valor_desconto: 0,
          valor_juros: 0,
          valor_multa: 0,
          valor_pago: 0,
          status: 'pendente' as const,
          numero_titulo: numeroTitulo || undefined,
          observacoes: parcela.observacoes || undefined,
        };

        const result = await EntityService.create<ContaPagarParcela>({
          schema: 'financeiro',
          table: 'contas_pagar_parcelas',
          companyId: selectedCompany.id,
          data: parcelaData
        });

        results.push(result);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financeiro', 'contas_pagar_parcelas', variables.contaPagarId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['financeiro', 'contas_pagar'] 
      });
    },
  });
}

/**
 * Hook para atualizar uma parcela
 */
export function useUpdateContaPagarParcela() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ 
      parcelaId, 
      contaPagarId, 
      data 
    }: { 
      parcelaId: string; 
      contaPagarId: string; 
      data: Partial<ContaPagarParcela> 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await EntityService.update<ContaPagarParcela>({
        schema: 'financeiro',
        table: 'contas_pagar_parcelas',
        companyId: selectedCompany.id,
        id: parcelaId,
        data
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financeiro', 'contas_pagar_parcelas', variables.contaPagarId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['financeiro', 'contas_pagar'] 
      });
    },
  });
}

/**
 * Hook para deletar uma parcela
 */
export function useDeleteContaPagarParcela() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ 
      parcelaId, 
      contaPagarId 
    }: { 
      parcelaId: string; 
      contaPagarId: string; 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      await EntityService.delete({
        schema: 'financeiro',
        table: 'contas_pagar_parcelas',
        companyId: selectedCompany.id,
        id: parcelaId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financeiro', 'contas_pagar_parcelas', variables.contaPagarId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['financeiro', 'contas_pagar'] 
      });
    },
  });
}

