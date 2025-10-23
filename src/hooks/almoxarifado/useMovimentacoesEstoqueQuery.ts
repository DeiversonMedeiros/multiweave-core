import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface MovimentacaoEstoque {
  id: string;
  company_id: string;
  material_equipamento_id: string;
  almoxarifado_id: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia' | 'inventario' | 'ajuste';
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  data_movimentacao: string;
  responsavel_id?: string;
  origem_documento?: string;
  numero_documento?: string;
  observacoes?: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  centro_custo_id?: string;
  projeto_id?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar movimentações de estoque
 */
export function useMovimentacoesEstoqueQuery(filters?: any) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'movimentacoes_estoque', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      try {
        const result = await EntityService.list<MovimentacaoEstoque>({
          schema: 'almoxarifado',
          table: 'movimentacoes_estoque',
          companyId: selectedCompany.id,
          filters: filters || {},
          orderBy: 'data_movimentacao',
          orderDirection: 'DESC'
        });
        
        return result.data;
      } catch (error) {
        console.error('Erro ao buscar movimentações de estoque:', error);
        // Retornar array vazio em caso de erro para evitar loop infinito
        return [];
      }
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // Não tentar novamente em caso de erro
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar movimentação de estoque
 */
export function useCreateMovimentacaoEstoque() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<MovimentacaoEstoque, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.create<MovimentacaoEstoque>('almoxarifado', 'movimentacoes_estoque', {
        ...data,
        company_id: selectedCompany.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'movimentacoes_estoque'] });
    },
  });
}

/**
 * Hook para atualizar movimentação de estoque
 */
export function useUpdateMovimentacaoEstoque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MovimentacaoEstoque> }) => {
      return await EntityService.update<MovimentacaoEstoque>('almoxarifado', 'movimentacoes_estoque', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'movimentacoes_estoque'] });
    },
  });
}

/**
 * Hook para deletar movimentação de estoque
 */
export function useDeleteMovimentacaoEstoque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await EntityService.delete('almoxarifado', 'movimentacoes_estoque', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'movimentacoes_estoque'] });
    },
  });
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Hook que retorna funções auxiliares para trabalhar com movimentações
 */
export function useMovimentacoesEstoque(filters?: any) {
  const { data: movimentacoes = [], isLoading: loading, error, refetch } = useMovimentacoesEstoqueQuery(filters);
  const { selectedCompany } = useCompany();

  const getResumoMovimentacoes = () => {
    const resumo = {
      total_entradas: 0,
      total_saidas: 0,
      total_transferencias: 0,
      total_ajustes: 0,
      valor_total_entradas: 0,
      valor_total_saidas: 0
    };

    movimentacoes.forEach(mov => {
      if (mov.tipo_movimentacao === 'entrada') {
        resumo.total_entradas += mov.quantidade;
        resumo.valor_total_entradas += mov.valor_total || 0;
      } else if (mov.tipo_movimentacao === 'saida') {
        resumo.total_saidas += Math.abs(mov.quantidade);
        resumo.valor_total_saidas += mov.valor_total || 0;
      } else if (mov.tipo_movimentacao === 'transferencia') {
        resumo.total_transferencias += Math.abs(mov.quantidade);
      } else if (mov.tipo_movimentacao === 'ajuste') {
        resumo.total_ajustes += mov.quantidade;
      }
    });

    return resumo;
  };

  const getMovimentacoesRecentes = (limit: number = 10) => {
    return movimentacoes
      .filter(m => m.status === 'confirmado')
      .sort((a, b) => new Date(b.data_movimentacao).getTime() - new Date(a.data_movimentacao).getTime())
      .slice(0, limit);
  };

  return {
    movimentacoes,
    loading,
    error,
    refetch,
    getResumoMovimentacoes,
    getMovimentacoesRecentes
  };
}
