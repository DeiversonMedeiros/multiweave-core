// =====================================================
// HOOK: USAR RETENÇÕES NA FONTE
// =====================================================
// Data: 2025-12-12
// Descrição: Hook para gerenciar retenções na fonte de contas a pagar
// Autor: Sistema MultiWeave Core
// Módulo: M2 - Contas a Pagar

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { RetencaoFonte, RetencaoFonteFormData } from '@/integrations/supabase/financial-types';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';

interface UseRetencoesFonteReturn {
  retencoes: RetencaoFonte[];
  loading: boolean;
  error: string | null;
  createRetencao: (data: RetencaoFonteFormData) => Promise<RetencaoFonte>;
  updateRetencao: (id: string, data: Partial<RetencaoFonteFormData>) => Promise<void>;
  deleteRetencao: (id: string) => Promise<void>;
  getRetencoesByContaPagar: (contaPagarId: string) => RetencaoFonte[];
  calcularTotalRetencoes: (contaPagarId: string) => number;
  refresh: () => Promise<void>;
}

export function useRetencoesFonte(contaPagarId?: string): UseRetencoesFonteReturn {
  const { selectedCompany } = useCompany();
  
  const [retencoes, setRetencoes] = useState<RetencaoFonte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar retenções
  const loadRetencoes = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Usar EntityService para acessar tabela no schema financeiro
      const filters: any = {
        is_active: true,
      };

      if (contaPagarId) {
        filters.conta_pagar_id = contaPagarId;
      }

      const result = await EntityService.list<RetencaoFonte>({
        schema: 'financeiro',
        table: 'retencoes_fonte',
        companyId: selectedCompany.id,
        filters,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });

      // Filtrar por status localmente (EntityService não suporta != diretamente)
      const retencoesFiltradas = (result.data || []).filter(r => r.status !== 'cancelado');
      setRetencoes(retencoesFiltradas);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar retenções:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar retenção
  const createRetencao = async (data: RetencaoFonteFormData): Promise<RetencaoFonte> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      // Calcular valor_retencao se não fornecido
      const valorRetencao = data.valor_retencao ?? (data.base_calculo * data.aliquota);

      const retencaoData = {
        company_id: selectedCompany.id,
        conta_pagar_id: data.conta_pagar_id,
        tipo_retencao: data.tipo_retencao,
        base_calculo: data.base_calculo,
        aliquota: data.aliquota,
        valor_retencao: valorRetencao,
        codigo_receita: data.codigo_receita,
        data_recolhimento: data.data_recolhimento,
        status: 'pendente' as const,
        observacoes: data.observacoes,
      };

      const result = await EntityService.create<RetencaoFonte>({
        schema: 'financeiro',
        table: 'retencoes_fonte',
        companyId: selectedCompany.id,
        data: retencaoData
      });

      toast.success('Retenção registrada com sucesso');
      await loadRetencoes();

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar retenção';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Atualizar retenção
  const updateRetencao = async (id: string, data: Partial<RetencaoFonteFormData>): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      const updateData: any = { ...data };

      // Recalcular valor_retencao se base_calculo ou aliquota foram alterados
      if (updateData.base_calculo !== undefined || updateData.aliquota !== undefined) {
        const retencao = retencoes.find(r => r.id === id);
        const baseCalculo = updateData.base_calculo ?? retencao?.base_calculo ?? 0;
        const aliquota = updateData.aliquota ?? retencao?.aliquota ?? 0;
        updateData.valor_retencao = baseCalculo * aliquota;
      }

      await EntityService.update({
        schema: 'financeiro',
        table: 'retencoes_fonte',
        companyId: selectedCompany.id,
        id,
        data: updateData
      });

      toast.success('Retenção atualizada com sucesso');
      await loadRetencoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar retenção';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Deletar retenção (marcar como cancelada)
  const deleteRetencao = async (id: string): Promise<void> => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    try {
      await EntityService.update({
        schema: 'financeiro',
        table: 'retencoes_fonte',
        companyId: selectedCompany.id,
        id,
        data: { status: 'cancelado' }
      });

      toast.success('Retenção cancelada com sucesso');
      await loadRetencoes();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar retenção';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Obter retenções por conta a pagar
  const getRetencoesByContaPagar = (contaPagarId: string): RetencaoFonte[] => {
    return retencoes.filter(r => r.conta_pagar_id === contaPagarId);
  };

  // Calcular total de retenções
  const calcularTotalRetencoes = (contaPagarId: string): number => {
    return getRetencoesByContaPagar(contaPagarId)
      .reduce((sum, r) => sum + r.valor_retencao, 0);
  };

  // Refresh
  const refresh = async () => {
    await loadRetencoes();
  };

  useEffect(() => {
    loadRetencoes();
  }, [selectedCompany?.id, contaPagarId]);

  return {
    retencoes,
    loading,
    error,
    createRetencao,
    updateRetencao,
    deleteRetencao,
    getRetencoesByContaPagar,
    calcularTotalRetencoes,
    refresh,
  };
}

