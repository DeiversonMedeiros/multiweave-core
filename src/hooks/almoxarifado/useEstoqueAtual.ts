import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface EstoqueAtual {
  id: string;
  material_equipamento_id: string;
  almoxarifado_id: string;
  quantidade_atual: number;
  quantidade_reservada: number;
  quantidade_disponivel: number;
  valor_total?: number;
  updated_at: string;
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
  };
  almoxarifado?: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export interface EstoqueKPI {
  total_materiais: number;
  valor_total_estoque: number;
  itens_ruptura: number;
  giro_estoque: number;
  alertas_validade: number;
}

export const useEstoqueAtual = () => {
  const [estoque, setEstoque] = useState<EstoqueAtual[]>([]);
  const [kpis, setKpis] = useState<EstoqueKPI>({
    total_materiais: 0,
    valor_total_estoque: 0,
    itens_ruptura: 0,
    giro_estoque: 0,
    alertas_validade: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchEstoque = async (almoxarifadoId?: string) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Definir o contexto da empresa para RLS

      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });

      

      let query = supabase
        .from('almoxarifado.estoque_atual')
        .select(`
          *,
          material:materiais_equipamentos!material_equipamento_id(
            id, codigo_interno, descricao, tipo, unidade_medida, 
            estoque_minimo, estoque_maximo, valor_unitario, validade_dias
          ),
          almoxarifado:almoxarifados!almoxarifado_id(id, nome, codigo)
        `)
        .eq('material.company_id', selectedCompany.id);

      if (almoxarifadoId) {
        query = query.eq('almoxarifado_id', almoxarifadoId);
      }

      const { data, error: fetchError } = await query.order('material.descricao');

      if (fetchError) throw fetchError;

      setEstoque(data || []);
      calculateKPIs(data || []);
    } catch (err) {
      console.error('Erro ao buscar estoque:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (estoqueData: EstoqueAtual[]) => {
    const totalMateriais = estoqueData.length;
    const valorTotalEstoque = estoqueData.reduce((sum, item) => 
      sum + (item.valor_total || 0), 0
    );
    
    const itensRuptura = estoqueData.filter(item => {
      const material = item.material as any;
      return material && item.quantidade_atual <= (material.estoque_minimo || 0);
    }).length;

    // Giro de estoque (simplificado - seria calculado com base em movimentações)
    const giroEstoque = 0; // TODO: Implementar cálculo real baseado em movimentações

    // Alertas de validade (simplificado)
    const alertasValidade = 0; // TODO: Implementar verificação de validade

    setKpis({
      total_materiais: totalMateriais,
      valor_total_estoque: valorTotalEstoque,
      itens_ruptura: itensRuptura,
      giro_estoque: giroEstoque,
      alertas_validade: alertasValidade
    });
  };

  const updateEstoque = async (
    materialEquipamentoId: string, 
    almoxarifadoId: string, 
    quantidade: number,
    tipo: 'entrada' | 'saida' | 'ajuste'
  ) => {
    try {
      // Buscar estoque atual
      const { data: estoqueAtual, error: fetchError } = await supabase
        .from('almoxarifado.estoque_atual')
        .select('*')
        .eq('material_equipamento_id', materialEquipamentoId)
        .eq('almoxarifado_id', almoxarifadoId)
        .single();

      if (fetchError) throw fetchError;

      // Calcular nova quantidade
      let novaQuantidade = estoqueAtual.quantidade_atual;
      if (tipo === 'entrada') {
        novaQuantidade += quantidade;
      } else if (tipo === 'saida') {
        novaQuantidade -= quantidade;
      } else if (tipo === 'ajuste') {
        novaQuantidade = quantidade;
      }

      // Atualizar estoque
      const { data: updatedEstoque, error: updateError } = await supabase
        .from('almoxarifado.estoque_atual')
        .update({
          quantidade_atual: novaQuantidade,
          updated_at: new Date().toISOString()
        })
        .eq('id', estoqueAtual.id)
        .select(`
          *,
          material:materiais_equipamentos!material_equipamento_id(
            id, codigo_interno, descricao, tipo, unidade_medida, 
            estoque_minimo, estoque_maximo, valor_unitario, validade_dias
          ),
          almoxarifado:almoxarifados!almoxarifado_id(id, nome, codigo)
        `)
        .single();

      if (updateError) throw updateError;

      // Atualizar estado local
      setEstoque(prev => 
        prev.map(item => 
          item.id === estoqueAtual.id ? updatedEstoque : item
        )
      );

      return updatedEstoque;
    } catch (err) {
      console.error('Erro ao atualizar estoque:', err);
      throw err;
    }
  };

  const getEstoqueByMaterial = (materialEquipamentoId: string) => {
    return estoque.filter(item => item.material_equipamento_id === materialEquipamentoId);
  };

  const getEstoqueByAlmoxarifado = (almoxarifadoId: string) => {
    return estoque.filter(item => item.almoxarifado_id === almoxarifadoId);
  };

  useEffect(() => {
    fetchEstoque();
  }, [selectedCompany?.id]);

  return {
    estoque,
    kpis,
    loading,
    error,
    refetch: fetchEstoque,
    updateEstoque,
    getEstoqueByMaterial,
    getEstoqueByAlmoxarifado
  };
};

