// =====================================================
// HOOK: USAR LOTES DE PAGAMENTO
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para gerenciar lotes de pagamento
// Autor: Sistema MultiWeave Core
// Módulo: M2 - Contas a Pagar

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { LotePagamento, LotePagamentoItem, LotePagamentoFormData } from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';

interface UseLotesPagamentoReturn {
  lotes: LotePagamento[];
  loading: boolean;
  error: string | null;
  createLote: (data: LotePagamentoFormData) => Promise<LotePagamento>;
  updateLote: (id: string, data: Partial<LotePagamentoFormData>) => Promise<void>;
  deleteLote: (id: string) => Promise<void>;
  adicionarTitulo: (loteId: string, contaPagarId: string) => Promise<void>;
  removerTitulo: (loteId: string, contaPagarId: string) => Promise<void>;
  getItensLote: (loteId: string) => Promise<LotePagamentoItem[]>;
  calcularValoresLote: (loteId: string) => Promise<void>;
  aprovarLote: (loteId: string, observacoes?: string) => Promise<void>;
  rejeitarLote: (loteId: string, observacoes?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLotesPagamento(): UseLotesPagamentoReturn {
  const { selectedCompany } = useCompany();
  
  const [lotes, setLotes] = useState<LotePagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar lotes
  const loadLotes = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Usar EntityService para acessar tabela no schema financeiro
      const result = await EntityService.list<LotePagamento>({
        schema: 'financeiro',
        table: 'lotes_pagamento',
        companyId: selectedCompany.id,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });

      setLotes((result.data as LotePagamento[]) || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar lotes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gerar número de lote
  const gerarNumeroLote = async (): Promise<string> => {
    if (!selectedCompany?.id) return '';

    // Usar EntityService para buscar último lote
    const result = await EntityService.list<LotePagamento>({
      schema: 'financeiro',
      table: 'lotes_pagamento',
      companyId: selectedCompany.id,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      pageSize: 1,
    });

    const ultimoLote = result.data && result.data.length > 0 ? (result.data[0] as LotePagamento) : null;

    if (ultimoLote && ultimoLote.numero_lote) {
      const match = ultimoLote.numero_lote.match(/LOTE-(\d+)/);
      if (match) {
        const proximoNumero = parseInt(match[1]) + 1;
        return `LOTE-${proximoNumero.toString().padStart(6, '0')}`;
      }
    }

    return `LOTE-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}000001`;
  };

  // Criar lote
  const createLote = async (data: LotePagamentoFormData): Promise<LotePagamento> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const numeroLote = await gerarNumeroLote();

      const loteData = {
        company_id: selectedCompany.id,
        numero_lote: numeroLote,
        descricao: data.descricao,
        conta_bancaria_id: data.conta_bancaria_id,
        criterio_agrupamento: data.criterio_agrupamento,
        valor_total: 0,
        valor_total_retencoes: 0,
        quantidade_titulos: 0,
        status: 'rascunho' as const,
        data_prevista_pagamento: data.data_prevista_pagamento,
        observacoes: data.observacoes,
      };

      const result = await EntityService.create<LotePagamento>({
        schema: 'financeiro',
        table: 'lotes_pagamento',
        companyId: selectedCompany.id,
        data: loteData
      });

      toast.success('Lote criado com sucesso');
      await loadLotes();

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar lote';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Atualizar lote
  const updateLote = async (id: string, data: Partial<LotePagamentoFormData>): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'lotes_pagamento',
        companyId: selectedCompany.id,
        id,
        data
      });

      toast.success('Lote atualizado com sucesso');
      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar lote';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Deletar lote
  const deleteLote = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.delete({
        schema: 'financeiro',
        table: 'lotes_pagamento',
        companyId: selectedCompany.id,
        id
      });

      toast.success('Lote excluído com sucesso');
      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir lote';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Adicionar título ao lote
  const adicionarTitulo = async (loteId: string, contaPagarId: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const { data, error: rpcError } = await (supabase as any).rpc('adicionar_titulo_ao_lote', {
        p_lote_pagamento_id: loteId,
        p_conta_pagar_id: contaPagarId,
        p_company_id: selectedCompany.id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      toast.success('Título adicionado ao lote');
      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar título';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Remover título do lote
  const removerTitulo = async (loteId: string, contaPagarId: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const { data, error: rpcError } = await (supabase as any).rpc('remover_titulo_do_lote', {
        p_lote_pagamento_id: loteId,
        p_conta_pagar_id: contaPagarId,
        p_company_id: selectedCompany.id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      toast.success('Título removido do lote');
      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover título';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Obter itens do lote
  const getItensLote = async (loteId: string): Promise<LotePagamentoItem[]> => {
    if (!selectedCompany?.id) return [];

    try {
      // Usar EntityService para acessar tabela no schema financeiro
      const result = await EntityService.list<LotePagamentoItem>({
        schema: 'financeiro',
        table: 'lote_pagamento_itens',
        companyId: selectedCompany.id,
        filters: {
          lote_pagamento_id: loteId,
          status_item: 'incluido',
        },
        orderBy: 'ordem',
        orderDirection: 'ASC',
      });

      return (result.data as LotePagamentoItem[]) || [];

    } catch (err) {
      console.error('Erro ao carregar itens do lote:', err);
      return [];
    }
  };

  // Calcular valores do lote
  const calcularValoresLote = async (loteId: string): Promise<void> => {
    if (!selectedCompany?.id) return;

    try {
      const { error: rpcError } = await (supabase as any).rpc('calcular_valores_lote', {
        p_lote_pagamento_id: loteId
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular valores';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Aprovar lote
  const aprovarLote = async (loteId: string, observacoes?: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await EntityService.update({
        schema: 'financeiro',
        table: 'lotes_pagamento',
        companyId: selectedCompany.id,
        id: loteId,
        data: {
          status: 'aprovado',
          aprovado_por: user.id,
          data_aprovacao: new Date().toISOString(),
          observacoes_aprovacao: observacoes
        }
      });

      toast.success('Lote aprovado com sucesso');
      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aprovar lote';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Rejeitar lote
  const rejeitarLote = async (loteId: string, observacoes?: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'lotes_pagamento',
        companyId: selectedCompany.id,
        id: loteId,
        data: {
          status: 'rejeitado',
          observacoes_aprovacao: observacoes
        }
      });

      toast.success('Lote rejeitado');
      await loadLotes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao rejeitar lote';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Refresh
  const refresh = async () => {
    await loadLotes();
  };

  useEffect(() => {
    loadLotes();
  }, [selectedCompany?.id]);

  return {
    lotes,
    loading,
    error,
    createLote,
    updateLote,
    deleteLote,
    adicionarTitulo,
    removerTitulo,
    getItensLote,
    calcularValoresLote,
    aprovarLote,
    rejeitarLote,
    refresh,
  };
}

