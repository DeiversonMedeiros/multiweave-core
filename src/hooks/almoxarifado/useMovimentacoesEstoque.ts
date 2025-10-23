import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface MovimentacaoEstoque {
  id: string;
  company_id: string;
  material_equipamento_id: string;
  almoxarifado_origem_id?: string;
  almoxarifado_destino_id?: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'inventario';
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  centro_custo_id?: string;
  projeto_id?: string;
  nfe_id?: string;
  observacoes?: string;
  usuario_id: string;
  data_movimentacao: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
  };
  almoxarifado_origem?: {
    id: string;
    nome: string;
    codigo: string;
  };
  almoxarifado_destino?: {
    id: string;
    nome: string;
    codigo: string;
  };
  centro_custo?: {
    id: string;
    nome: string;
    codigo: string;
  };
  projeto?: {
    id: string;
    nome: string;
    codigo: string;
  };
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
  nfe?: {
    id: string;
    numero_nfe: string;
    chave_acesso: string;
  };
}

export interface CreateMovimentacaoData {
  material_equipamento_id: string;
  almoxarifado_origem_id?: string;
  almoxarifado_destino_id?: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'inventario';
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  centro_custo_id?: string;
  projeto_id?: string;
  nfe_id?: string;
  observacoes?: string;
}

export const useMovimentacoesEstoque = () => {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchMovimentacoes = async (filters?: {
    tipo_movimentacao?: string;
    material_equipamento_id?: string;
    almoxarifado_id?: string;
    data_inicio?: string;
    data_fim?: string;
    status?: string;
  }) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Definir o contexto da empresa para RLS      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });            let query = supabase
        .from('almoxarifado.movimentacoes_estoque')
        .select(`
          *,
          material:materiais_equipamentos!material_equipamento_id(
            id, codigo_interno, descricao, tipo, unidade_medida
          ),
          almoxarifado_origem:almoxarifados!almoxarifado_origem_id(id, nome, codigo),
          almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, codigo),
          centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
          projeto:projects!projeto_id(id, nome, codigo),
          usuario:users!usuario_id(id, nome, email),
          nfe:financeiro.nfe!nfe_id(id, numero_nfe, chave_acesso)
        `)
        .eq('company_id', selectedCompany.id);

      if (filters?.tipo_movimentacao) {
        query = query.eq('tipo_movimentacao', filters.tipo_movimentacao);
      }

      if (filters?.material_equipamento_id) {
        query = query.eq('material_equipamento_id', filters.material_equipamento_id);
      }

      if (filters?.almoxarifado_id) {
        query = query.or(`almoxarifado_origem_id.eq.${filters.almoxarifado_id},almoxarifado_destino_id.eq.${filters.almoxarifado_id}`);
      }

      if (filters?.data_inicio) {
        query = query.gte('data_movimentacao', filters.data_inicio);
      }

      if (filters?.data_fim) {
        query = query.lte('data_movimentacao', filters.data_fim);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query.order('data_movimentacao', { ascending: false });

      if (fetchError) throw fetchError;

      setMovimentacoes(data || []);
    } catch (err) {
      console.error('Erro ao buscar movimentações:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createMovimentacao = async (data: CreateMovimentacaoData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const { data: newMovimentacao, error } = await supabase
        .from('almoxarifado.movimentacoes_estoque')
        .insert([{
          ...data,
          company_id: selectedCompany.id,
          usuario_id: 'current-user-id', // TODO: Implementar obtenção do usuário atual
          status: 'confirmado'
        }])
        .select(`
          *,
          material:materiais_equipamentos!material_equipamento_id(
            id, codigo_interno, descricao, tipo, unidade_medida
          ),
          almoxarifado_origem:almoxarifados!almoxarifado_origem_id(id, nome, codigo),
          almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, codigo),
          centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
          projeto:projects!projeto_id(id, nome, codigo),
          usuario:users!usuario_id(id, nome, email),
          nfe:financeiro.nfe!nfe_id(id, numero_nfe, chave_acesso)
        `)
        .single();

      if (error) throw error;

      setMovimentacoes(prev => [newMovimentacao, ...prev]);
      return newMovimentacao;
    } catch (err) {
      console.error('Erro ao criar movimentação:', err);
      throw err;
    }
  };

  const updateMovimentacao = async (id: string, data: Partial<MovimentacaoEstoque>) => {
    try {
      const { data: updatedMovimentacao, error } = await supabase
        .from('almoxarifado.movimentacoes_estoque')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          material:materiais_equipamentos!material_equipamento_id(
            id, codigo_interno, descricao, tipo, unidade_medida
          ),
          almoxarifado_origem:almoxarifados!almoxarifado_origem_id(id, nome, codigo),
          almoxarifado_destino:almoxarifados!almoxarifado_destino_id(id, nome, codigo),
          centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
          projeto:projects!projeto_id(id, nome, codigo),
          usuario:users!usuario_id(id, nome, email),
          nfe:financeiro.nfe!nfe_id(id, numero_nfe, chave_acesso)
        `)
        .single();

      if (error) throw error;

      setMovimentacoes(prev => 
        prev.map(movimentacao => 
          movimentacao.id === id ? updatedMovimentacao : movimentacao
        )
      );
      return updatedMovimentacao;
    } catch (err) {
      console.error('Erro ao atualizar movimentação:', err);
      throw err;
    }
  };

  const cancelarMovimentacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.movimentacoes_estoque')
        .update({ status: 'cancelado' })
        .eq('id', id);

      if (error) throw error;

      setMovimentacoes(prev => 
        prev.map(movimentacao => 
          movimentacao.id === id ? { ...movimentacao, status: 'cancelado' } : movimentacao
        )
      );
    } catch (err) {
      console.error('Erro ao cancelar movimentação:', err);
      throw err;
    }
  };

  const getMovimentacoesPorMaterial = (materialEquipamentoId: string) => {
    return movimentacoes.filter(m => m.material_equipamento_id === materialEquipamentoId);
  };

  const getMovimentacoesPorAlmoxarifado = (almoxarifadoId: string) => {
    return movimentacoes.filter(m => 
      m.almoxarifado_origem_id === almoxarifadoId || 
      m.almoxarifado_destino_id === almoxarifadoId
    );
  };

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

  useEffect(() => {
    fetchMovimentacoes();
  }, [selectedCompany?.id]);

  return {
    movimentacoes,
    loading,
    error,
    refetch: fetchMovimentacoes,
    createMovimentacao,
    updateMovimentacao,
    cancelarMovimentacao,
    getMovimentacoesPorMaterial,
    getMovimentacoesPorAlmoxarifado,
    getResumoMovimentacoes,
    getMovimentacoesRecentes
  };
};

