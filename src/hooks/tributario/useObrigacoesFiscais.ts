// =====================================================
// HOOK: USAR OBRIGAÇÕES FISCAIS
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para gerenciar caixa de entrada de obrigações fiscais
// Autor: Sistema MultiWeave Core
// Módulo: M5 - Motor Tributário

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/company-context';
import { ObrigacaoFiscal, ObrigacaoFiscalFormData } from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';

interface UseObrigacoesFiscaisReturn {
  obrigacoes: ObrigacaoFiscal[];
  loading: boolean;
  error: string | null;
  createObrigacao: (data: ObrigacaoFiscalFormData) => Promise<ObrigacaoFiscal>;
  updateObrigacao: (id: string, data: Partial<ObrigacaoFiscalFormData>) => Promise<void>;
  deleteObrigacao: (id: string) => Promise<void>;
  marcarComoApresentada: (id: string, protocolo?: string) => Promise<void>;
  marcarComoPaga: (id: string) => Promise<void>;
  getObrigacoesVencidas: () => ObrigacaoFiscal[];
  getObrigacoesVencendo: (dias: number) => ObrigacaoFiscal[];
  getResumo: () => Promise<{
    total: number;
    pendentes: number;
    vencidas: number;
    vencendo7dias: number;
    valorTotal: number;
    valorVencido: number;
    valorVencendo7dias: number;
  }>;
  refresh: () => Promise<void>;
}

export function useObrigacoesFiscais(): UseObrigacoesFiscaisReturn {
  const { selectedCompany } = useCompany();

  const [obrigacoes, setObrigacoes] = useState<ObrigacaoFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar obrigações
  const loadObrigacoes = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // A tabela está no schema tributario, então usamos EntityService
      const result = await EntityService.list<ObrigacaoFiscal>({
        schema: 'tributario',
        table: 'obrigacoes_fiscais',
        companyId: selectedCompany.id,
        filters: {
          is_active: true,
        },
        orderBy: 'data_vencimento',
        orderDirection: 'ASC',
      });

      // EntityService.list retorna EntityListResult com data array
      const data = result.data || [];
      setObrigacoes(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar obrigações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar obrigação
  const createObrigacao = async (data: ObrigacaoFiscalFormData): Promise<ObrigacaoFiscal> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const obrigacaoData = {
        company_id: selectedCompany.id,
        tipo_obrigacao: data.tipo_obrigacao,
        codigo_receita: data.codigo_receita,
        descricao: data.descricao,
        periodo_referencia: data.periodo_referencia,
        data_vencimento: data.data_vencimento,
        data_competencia: data.data_competencia,
        valor_principal: data.valor_principal,
        valor_multa: data.valor_multa || 0,
        valor_juros: data.valor_juros || 0,
        conta_pagar_id: data.conta_pagar_id,
        nfe_id: data.nfe_id,
        nfse_id: data.nfse_id,
        observacoes: data.observacoes,
        prioridade: data.prioridade || 'normal',
        status: 'pendente' as const,
      };

      const result = await EntityService.create<ObrigacaoFiscal>({
        schema: 'tributario',
        table: 'obrigacoes_fiscais',
        companyId: selectedCompany.id,
        data: obrigacaoData
      });

      toast.success('Obrigação fiscal registrada com sucesso');
      await loadObrigacoes();

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar obrigação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Atualizar obrigação
  const updateObrigacao = async (id: string, data: Partial<ObrigacaoFiscalFormData>): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'tributario',
        table: 'obrigacoes_fiscais',
        companyId: selectedCompany.id,
        id,
        data
      });

      toast.success('Obrigação atualizada com sucesso');
      await loadObrigacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar obrigação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Deletar obrigação
  const deleteObrigacao = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.delete({
        schema: 'tributario',
        table: 'obrigacoes_fiscais',
        companyId: selectedCompany.id,
        id
      });

      toast.success('Obrigação excluída com sucesso');
      await loadObrigacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir obrigação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Marcar como apresentada
  const marcarComoApresentada = async (id: string, protocolo?: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'tributario',
        table: 'obrigacoes_fiscais',
        companyId: selectedCompany.id,
        id,
        data: {
          status: 'apresentada',
          protocolo_apresentacao: protocolo,
          data_apresentacao: new Date().toISOString().split('T')[0],
        }
      });

      toast.success('Obrigação marcada como apresentada');
      await loadObrigacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar obrigação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Marcar como paga
  const marcarComoPaga = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'tributario',
        table: 'obrigacoes_fiscais',
        companyId: selectedCompany.id,
        id,
        data: {
          status: 'paga',
        }
      });

      toast.success('Obrigação marcada como paga');
      await loadObrigacoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar obrigação';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Obter obrigações vencidas
  const getObrigacoesVencidas = useCallback((): ObrigacaoFiscal[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return obrigacoes.filter(ob => {
      const vencimento = new Date(ob.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      return vencimento < hoje && (ob.status === 'pendente' || ob.status === 'em_analise');
    });
  }, [obrigacoes]);

  // Obter obrigações vencendo
  const getObrigacoesVencendo = useCallback((dias: number): ObrigacaoFiscal[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + dias);
    
    return obrigacoes.filter(ob => {
      const vencimento = new Date(ob.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      return vencimento >= hoje && vencimento <= limite && (ob.status === 'pendente' || ob.status === 'em_analise');
    });
  }, [obrigacoes]);

  // Obter resumo
  const getResumo = useCallback(async (): Promise<{
    total: number;
    pendentes: number;
    vencidas: number;
    vencendo7dias: number;
    valorTotal: number;
    valorVencido: number;
    valorVencendo7dias: number;
  }> => {
    if (!selectedCompany?.id) {
      return {
        total: 0,
        pendentes: 0,
        vencidas: 0,
        vencendo7dias: 0,
        valorTotal: 0,
        valorVencido: 0,
        valorVencendo7dias: 0,
      };
    }

    // Calculamos localmente para evitar problemas de acesso via Supabase client
    // A view está no schema tributario e não é acessível diretamente via Supabase client
    const vencidas = getObrigacoesVencidas();
    const vencendo = getObrigacoesVencendo(7);
    
    const resumo = {
      total: obrigacoes.length,
      pendentes: obrigacoes.filter(o => o.status === 'pendente').length,
      vencidas: vencidas.length,
      vencendo7dias: vencendo.length,
      valorTotal: obrigacoes.reduce((sum, o) => sum + o.valor_total, 0),
      valorVencido: vencidas.reduce((sum, o) => sum + o.valor_total, 0),
      valorVencendo7dias: vencendo.reduce((sum, o) => sum + o.valor_total, 0),
    };

    return resumo;
  }, [obrigacoes, selectedCompany?.id, getObrigacoesVencidas, getObrigacoesVencendo]);

  // Refresh
  const refresh = async () => {
    await loadObrigacoes();
  };

  useEffect(() => {
    loadObrigacoes();
  }, [selectedCompany?.id]);

  return {
    obrigacoes,
    loading,
    error,
    createObrigacao,
    updateObrigacao,
    deleteObrigacao,
    marcarComoApresentada,
    marcarComoPaga,
    getObrigacoesVencidas,
    getObrigacoesVencendo,
    getResumo,
    refresh,
  };
}

