import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface Inventario {
  id: string;
  company_id: string;
  almoxarifado_id: string;
  tipo: 'geral' | 'ciclico' | 'rotativo';
  data_inicio: string;
  data_fim?: string;
  status: 'aberto' | 'em_andamento' | 'finalizado' | 'cancelado';
  responsavel_id: string;
  observacoes?: string;
  total_itens: number;
  itens_contados: number;
  itens_divergentes: number;
  valor_total_contado?: number;
  valor_total_sistema?: number;
  diferenca_valor?: number;
  created_at: string;
  updated_at: string;
  almoxarifado?: {
    id: string;
    nome: string;
    codigo: string;
  };
  responsavel?: {
    id: string;
    nome: string;
    email: string;
  };
  itens?: InventarioItem[];
}

export interface InventarioItem {
  id: string;
  inventario_id: string;
  material_equipamento_id: string;
  quantidade_sistema: number;
  quantidade_contada: number;
  diferenca_quantidade: number;
  valor_unitario_sistema?: number;
  valor_unitario_contado?: number;
  valor_total_sistema?: number;
  valor_total_contado?: number;
  diferenca_valor?: number;
  observacoes?: string;
  contado_por?: string;
  data_contagem?: string;
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
  };
  contador?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface CreateInventarioData {
  almoxarifado_id: string;
  tipo: 'geral' | 'ciclico' | 'rotativo';
  responsavel_id: string;
  observacoes?: string;
}

export const useInventario = () => {
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchInventarios = async (filters?: {
    status?: string;
    tipo?: string;
    almoxarifado_id?: string;
    responsavel_id?: string;
  }) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('almoxarifado.inventarios')
        .select(`
          *,
          almoxarifado:almoxarifados!almoxarifado_id(id, nome, codigo),
          responsavel:users!responsavel_id(id, nome, email),
          itens:inventario_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            contador:users!contado_por(id, nome, email)
          )
        `)
        .eq('company_id', selectedCompany.id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters?.almoxarifado_id) {
        query = query.eq('almoxarifado_id', filters.almoxarifado_id);
      }

      if (filters?.responsavel_id) {
        query = query.eq('responsavel_id', filters.responsavel_id);
      }

      const { data, error: fetchError } = await query.order('data_inicio', { ascending: false });

      if (fetchError) throw fetchError;

      setInventarios(data || []);
    } catch (err) {
      console.error('Erro ao buscar inventários:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createInventario = async (data: CreateInventarioData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Criar inventário principal
      const { data: newInventario, error: inventarioError } = await supabase
        .from('almoxarifado.inventarios')
        .insert([{
          ...data,
          company_id: selectedCompany.id,
          status: 'aberto',
          total_itens: 0,
          itens_contados: 0,
          itens_divergentes: 0
        }])
        .select()
        .single();

      if (inventarioError) throw inventarioError;

      // Buscar materiais do almoxarifado para criar itens do inventário
      const { data: materiais, error: materiaisError } = await supabase
        .from('almoxarifado.materiais_equipamentos')
        .select(`
          *,
          estoque_atual:estoque_atual(quantidade_atual, valor_total)
        `)
        .eq('company_id', selectedCompany.id)
        .eq('almoxarifado_id', data.almoxarifado_id);

      if (materiaisError) throw materiaisError;

      // Criar itens do inventário
      if (materiais && materiais.length > 0) {
        const itensData = materiais.map(material => ({
          inventario_id: newInventario.id,
          material_equipamento_id: material.id,
          quantidade_sistema: material.estoque_atual?.[0]?.quantidade_atual || 0,
          quantidade_contada: 0,
          diferenca_quantidade: 0,
          valor_unitario_sistema: material.valor_unitario,
          valor_unitario_contado: 0,
          valor_total_sistema: material.estoque_atual?.[0]?.valor_total || 0,
          valor_total_contado: 0,
          diferenca_valor: 0
        }));

        const { error: itensError } = await supabase
          .from('almoxarifado.inventario_itens')
          .insert(itensData);

        if (itensError) throw itensError;

        // Atualizar total de itens no inventário
        const { error: updateError } = await supabase
          .from('almoxarifado.inventarios')
          .update({ total_itens: materiais.length })
          .eq('id', newInventario.id);

        if (updateError) throw updateError;
      }

      // Buscar inventário completo
      const { data: inventarioCompleto, error: fetchError } = await supabase
        .from('almoxarifado.inventarios')
        .select(`
          *,
          almoxarifado:almoxarifados!almoxarifado_id(id, nome, codigo),
          responsavel:users!responsavel_id(id, nome, email),
          itens:inventario_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            contador:users!contado_por(id, nome, email)
          )
        `)
        .eq('id', newInventario.id)
        .single();

      if (fetchError) throw fetchError;

      setInventarios(prev => [inventarioCompleto, ...prev]);
      return inventarioCompleto;
    } catch (err) {
      console.error('Erro ao criar inventário:', err);
      throw err;
    }
  };

  const iniciarInventario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.inventarios')
        .update({ 
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setInventarios(prev => 
        prev.map(inventario => 
          inventario.id === id 
            ? { 
                ...inventario, 
                status: 'em_andamento',
                data_inicio: new Date().toISOString()
              } 
            : inventario
        )
      );
    } catch (err) {
      console.error('Erro ao iniciar inventário:', err);
      throw err;
    }
  };

  const finalizarInventario = async (id: string) => {
    try {
      // Calcular totais do inventário
      const { data: itens, error: itensError } = await supabase
        .from('almoxarifado.inventario_itens')
        .select('*')
        .eq('inventario_id', id);

      if (itensError) throw itensError;

      const itensContados = itens?.filter(item => item.quantidade_contada > 0).length || 0;
      const itensDivergentes = itens?.filter(item => item.diferenca_quantidade !== 0).length || 0;
      const valorTotalContado = itens?.reduce((sum, item) => sum + (item.valor_total_contado || 0), 0) || 0;
      const valorTotalSistema = itens?.reduce((sum, item) => sum + (item.valor_total_sistema || 0), 0) || 0;
      const diferencaValor = valorTotalContado - valorTotalSistema;

      const { error } = await supabase
        .from('almoxarifado.inventarios')
        .update({ 
          status: 'finalizado',
          data_fim: new Date().toISOString(),
          itens_contados: itensContados,
          itens_divergentes: itensDivergentes,
          valor_total_contado: valorTotalContado,
          valor_total_sistema: valorTotalSistema,
          diferenca_valor: diferencaValor
        })
        .eq('id', id);

      if (error) throw error;

      setInventarios(prev => 
        prev.map(inventario => 
          inventario.id === id 
            ? { 
                ...inventario, 
                status: 'finalizado',
                data_fim: new Date().toISOString(),
                itens_contados: itensContados,
                itens_divergentes: itensDivergentes,
                valor_total_contado: valorTotalContado,
                valor_total_sistema: valorTotalSistema,
                diferenca_valor: diferencaValor
              } 
            : inventario
        )
      );
    } catch (err) {
      console.error('Erro ao finalizar inventário:', err);
      throw err;
    }
  };

  const cancelarInventario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.inventarios')
        .update({ status: 'cancelado' })
        .eq('id', id);

      if (error) throw error;

      setInventarios(prev => 
        prev.map(inventario => 
          inventario.id === id 
            ? { ...inventario, status: 'cancelado' } 
            : inventario
        )
      );
    } catch (err) {
      console.error('Erro ao cancelar inventário:', err);
      throw err;
    }
  };

  const updateInventarioItem = async (itemId: string, data: Partial<InventarioItem>) => {
    try {
      const { data: updatedItem, error } = await supabase
        .from('almoxarifado.inventario_itens')
        .update({
          ...data,
          diferenca_quantidade: (data.quantidade_contada || 0) - (data.quantidade_sistema || 0),
          diferenca_valor: (data.valor_total_contado || 0) - (data.valor_total_sistema || 0)
        })
        .eq('id', itemId)
        .select(`
          *,
          material:materiais_equipamentos!material_equipamento_id(
            id, codigo_interno, descricao, tipo, unidade_medida
          ),
          contador:users!contado_por(id, nome, email)
        `)
        .single();

      if (error) throw error;

      // Atualizar estado local
      setInventarios(prev => 
        prev.map(inventario => ({
          ...inventario,
          itens: inventario.itens?.map(item => 
            item.id === itemId ? updatedItem : item
          ) || []
        }))
      );

      return updatedItem;
    } catch (err) {
      console.error('Erro ao atualizar item do inventário:', err);
      throw err;
    }
  };

  const getInventariosAbertos = () => {
    return inventarios.filter(i => i.status === 'aberto' || i.status === 'em_andamento');
  };

  const getInventariosFinalizados = () => {
    return inventarios.filter(i => i.status === 'finalizado');
  };

  const getResumoInventario = (inventarioId: string) => {
    const inventario = inventarios.find(i => i.id === inventarioId);
    if (!inventario) return null;

    return {
      total_itens: inventario.total_itens,
      itens_contados: inventario.itens_contados,
      itens_pendentes: inventario.total_itens - inventario.itens_contados,
      itens_divergentes: inventario.itens_divergentes,
      percentual_concluido: inventario.total_itens > 0 ? (inventario.itens_contados / inventario.total_itens) * 100 : 0,
      valor_total_contado: inventario.valor_total_contado || 0,
      valor_total_sistema: inventario.valor_total_sistema || 0,
      diferenca_valor: inventario.diferenca_valor || 0
    };
  };

  useEffect(() => {
    fetchInventarios();
  }, [selectedCompany?.id]);

  return {
    inventarios,
    loading,
    error,
    refetch: fetchInventarios,
    createInventario,
    iniciarInventario,
    finalizarInventario,
    cancelarInventario,
    updateInventarioItem,
    getInventariosAbertos,
    getInventariosFinalizados,
    getResumoInventario
  };
};

