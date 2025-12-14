// =====================================================
// HOOK: USAR MOVIMENTAÇÕES BANCÁRIAS E CONCILIAÇÃO
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para gerenciar movimentações bancárias e conciliação
// Autor: Sistema MultiWeave Core
// Módulo: M4 - Conciliação Bancária

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { 
  MovimentacaoBancaria, 
  ConciliacaoMovimentacao, 
  ConciliacaoPendencia 
} from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';
import { parseOFX, convertOFXToMovimentacoes } from '@/services/bancario/ofxParser';
import { parseCSV, convertCSVToMovimentacoes, CSVParseOptions } from '@/services/bancario/csvParser';

interface UseMovimentacoesBancariasReturn {
  movimentacoes: MovimentacaoBancaria[];
  conciliacoes: ConciliacaoMovimentacao[];
  pendencias: ConciliacaoPendencia[];
  loading: boolean;
  error: string | null;
  importarExtrato: (contaBancariaId: string, arquivo: File, tipo: 'ofx' | 'csv', csvOptions?: CSVParseOptions) => Promise<void>;
  criarMovimentacao: (data: Partial<MovimentacaoBancaria>) => Promise<MovimentacaoBancaria>;
  conciliarAutomatico: (contaBancariaId: string, dataInicio?: string, dataFim?: string) => Promise<void>;
  criarConciliacaoManual: (data: Partial<ConciliacaoMovimentacao>) => Promise<void>;
  atualizarStatusConciliacao: (conciliacaoId: string, status: 'conciliada' | 'rejeitada') => Promise<void>;
  resolverPendencia: (pendenciaId: string, solucao: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMovimentacoesBancarias(contaBancariaId?: string): UseMovimentacoesBancariasReturn {
  const { selectedCompany } = useCompany();
  
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoBancaria[]>([]);
  const [conciliacoes, setConciliacoes] = useState<ConciliacaoMovimentacao[]>([]);
  const [pendencias, setPendencias] = useState<ConciliacaoPendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar movimentações
  const loadMovimentacoes = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Usar EntityService para acessar tabela no schema financeiro
      const filters: any = {};

      if (contaBancariaId) {
        filters.conta_bancaria_id = contaBancariaId;
      }

      const result = await EntityService.list<MovimentacaoBancaria>({
        schema: 'financeiro',
        table: 'movimentacoes_bancarias',
        companyId: selectedCompany.id,
        filters,
        orderBy: 'data_movimento',
        orderDirection: 'DESC',
      });

      setMovimentacoes((result.data as MovimentacaoBancaria[]) || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar movimentações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar conciliações
  const loadConciliacoes = async () => {
    if (!selectedCompany?.id) return;

    try {
      // Usar EntityService para acessar tabela no schema financeiro
      const result = await EntityService.list<ConciliacaoMovimentacao>({
        schema: 'financeiro',
        table: 'conciliacoes_movimentacoes',
        companyId: selectedCompany.id,
        orderBy: 'conciliado_em',
        orderDirection: 'DESC',
      });

      setConciliacoes((result.data as ConciliacaoMovimentacao[]) || []);

    } catch (err) {
      console.error('Erro ao carregar conciliações:', err);
    }
  };

  // Carregar pendências
  const loadPendencias = async () => {
    if (!selectedCompany?.id) return;

    try {
      // Usar EntityService para acessar tabela no schema financeiro
      const result = await EntityService.list<ConciliacaoPendencia>({
        schema: 'financeiro',
        table: 'conciliacoes_pendencias',
        companyId: selectedCompany.id,
        filters: {
          status: 'pendente',
        },
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });

      setPendencias((result.data as ConciliacaoPendencia[]) || []);

    } catch (err) {
      console.error('Erro ao carregar pendências:', err);
    }
  };

  // Importar extrato
  const importarExtrato = async (
    contaBancariaId: string, 
    arquivo: File, 
    tipo: 'ofx' | 'csv',
    csvOptions?: CSVParseOptions
  ): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const fileContent = await arquivo.text();
      let movimentacoes: any[] = [];

      if (tipo === 'ofx') {
        // Parse OFX
        const ofxData = parseOFX(fileContent);
        movimentacoes = convertOFXToMovimentacoes(ofxData, contaBancariaId, selectedCompany.id);
      } else if (tipo === 'csv') {
        // Parse CSV
        const csvTransactions = parseCSV(fileContent, csvOptions);
        movimentacoes = convertCSVToMovimentacoes(csvTransactions, contaBancariaId, selectedCompany.id);
      } else {
        throw new Error('Tipo de arquivo não suportado');
      }

      if (movimentacoes.length === 0) {
        toast.warning('Nenhuma movimentação encontrada no arquivo');
        return;
      }

      // Gerar lote de importação
      const loteImportacao = `IMPORT-${Date.now()}`;

      // Inserir movimentações em lote
      const movimentacoesComLote = movimentacoes.map(m => ({
        ...m,
        lote_importacao: loteImportacao,
        arquivo_origem: arquivo.name,
      }));

      // Inserir em lote usando EntityService
      for (const movimentacao of movimentacoesComLote) {
        await EntityService.create<MovimentacaoBancaria>({
          schema: 'financeiro',
          table: 'movimentacoes_bancarias',
          companyId: selectedCompany.id,
          data: {
            ...movimentacao,
            company_id: selectedCompany.id,
          } as any,
        });
      }

      toast.success(`${movimentacoes.length} movimentação(ões) importada(s) com sucesso`);
      await loadMovimentacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao importar extrato';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Criar movimentação manual
  const criarMovimentacao = async (data: Partial<MovimentacaoBancaria>): Promise<MovimentacaoBancaria> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const movimentacaoData = {
        company_id: selectedCompany.id,
        conta_bancaria_id: data.conta_bancaria_id!,
        data_movimento: data.data_movimento!,
        data_liquidacao: data.data_liquidacao,
        historico: data.historico!,
        documento: data.documento,
        complemento: data.complemento,
        valor: data.valor!,
        tipo_movimento: data.tipo_movimento!,
        saldo_apos_movimento: data.saldo_apos_movimento,
        categoria: data.categoria,
        tipo_operacao: data.tipo_operacao,
        origem_importacao: 'manual' as const,
        status_conciliacao: 'pendente' as const,
        observacoes: data.observacoes,
      };

      const result = await EntityService.create<MovimentacaoBancaria>({
        schema: 'financeiro',
        table: 'movimentacoes_bancarias',
        companyId: selectedCompany.id,
        data: movimentacaoData
      });

      toast.success('Movimentação registrada com sucesso');
      await loadMovimentacoes();

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar movimentação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Conciliação automática
  const conciliarAutomatico = async (
    contaBancariaId: string, 
    dataInicio?: string, 
    dataFim?: string
  ): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const { data, error: rpcError } = await (supabase as any).rpc('conciliar_movimentacoes_automatico', {
        p_conta_bancaria_id: contaBancariaId,
        p_company_id: selectedCompany.id,
        p_data_inicio: dataInicio || null,
        p_data_fim: dataFim || null,
        p_tolerancia_dias: 5,
        p_tolerancia_valor: 0.01
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // O RPC pode retornar um array ou um objeto, tratar ambos os casos
      const resultados = Array.isArray(data) 
        ? data 
        : (data && typeof data === 'object' && !Array.isArray(data) 
          ? [data] 
          : []) as any[];
      const conciliadas = resultados.filter((r: any) => r?.status === 'conciliada').length;
      const pendentes = resultados.filter((r: any) => r?.status === 'pendente_validacao').length;

      toast.success(`${conciliadas} movimentações conciliadas automaticamente. ${pendentes} requerem validação.`);
      
      await loadMovimentacoes();
      await loadConciliacoes();
      await loadPendencias();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conciliar movimentações';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Criar conciliação manual
  const criarConciliacaoManual = async (data: Partial<ConciliacaoMovimentacao>): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const conciliacaoData = {
        company_id: selectedCompany.id,
        movimentacao_id: data.movimentacao_id!,
        conta_pagar_id: data.conta_pagar_id,
        conta_receber_id: data.conta_receber_id,
        lote_pagamento_id: data.lote_pagamento_id,
        tipo_conciliacao: data.tipo_conciliacao || 'manual',
        valor_conciliado: data.valor_conciliado!,
        valor_diferenca: data.valor_diferenca || 0,
        motivo_diferenca: data.motivo_diferenca,
        status: 'pendente_validacao' as const,
        conciliado_por: user.id,
        observacoes: data.observacoes,
      };

      await EntityService.create<ConciliacaoMovimentacao>({
        schema: 'financeiro',
        table: 'conciliacoes_movimentacoes',
        companyId: selectedCompany.id,
        data: conciliacaoData
      });

      toast.success('Conciliação criada com sucesso');
      await loadConciliacoes();
      await loadMovimentacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conciliação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Atualizar status de conciliação
  const atualizarStatusConciliacao = async (
    conciliacaoId: string, 
    status: 'conciliada' | 'rejeitada'
  ): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'conciliacoes_movimentacoes',
        companyId: selectedCompany.id,
        id: conciliacaoId,
        data: { status }
      });

      toast.success(`Conciliação ${status === 'conciliada' ? 'aprovada' : 'rejeitada'}`);
      await loadConciliacoes();
      await loadMovimentacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar conciliação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Resolver pendência
  const resolverPendencia = async (pendenciaId: string, solucao: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await EntityService.update({
        schema: 'financeiro',
        table: 'conciliacoes_pendencias',
        companyId: selectedCompany.id,
        id: pendenciaId,
        data: {
          status: 'resolvida',
          resolvido_por: user.id,
          resolvido_em: new Date().toISOString(),
          solucao_aplicada: solucao
        }
      });

      toast.success('Pendência resolvida');
      await loadPendencias();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao resolver pendência';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Refresh
  const refresh = async () => {
    await Promise.all([
      loadMovimentacoes(),
      loadConciliacoes(),
      loadPendencias()
    ]);
  };

  useEffect(() => {
    refresh();
  }, [selectedCompany?.id, contaBancariaId]);

  return {
    movimentacoes,
    conciliacoes,
    pendencias,
    loading,
    error,
    importarExtrato,
    criarMovimentacao,
    conciliarAutomatico,
    criarConciliacaoManual,
    atualizarStatusConciliacao,
    resolverPendencia,
    refresh,
  };
}

