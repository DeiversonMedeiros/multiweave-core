import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface MaterialEquipamento {
  id: string;
  company_id: string;
  material_id?: string;
  codigo_interno: string;
  descricao: string;
  tipo: 'produto' | 'servico' | 'equipamento';
  classe?: string;
  unidade_medida: string;
  imagem_url?: string;
  status: 'ativo' | 'inativo';
  equipamento_proprio: boolean;
  localizacao_id?: string;
  estoque_minimo: number;
  estoque_maximo?: number;
  valor_unitario?: number;
  validade_dias?: number;
  ncm?: string;
  cfop?: string;
  cst?: string;
  created_at: string;
  updated_at: string;
  localizacao?: {
    id: string;
    rua?: string;
    nivel?: string;
    posicao?: string;
    descricao?: string;
  };
  estoque_atual?: {
    quantidade_atual: number;
    quantidade_reservada: number;
    quantidade_disponivel: number;
    valor_total?: number;
  };
}

export interface CreateMaterialData {
  codigo_interno: string;
  descricao: string;
  tipo: 'produto' | 'servico' | 'equipamento';
  classe?: string;
  unidade_medida: string;
  imagem_url?: string;
  status?: 'ativo' | 'inativo';
  equipamento_proprio?: boolean;
  localizacao_id?: string;
  estoque_minimo?: number;
  estoque_maximo?: number;
  valor_unitario?: number;
  validade_dias?: number;
  ncm?: string;
  cfop?: string;
  cst?: string;
}

export const useMateriaisEquipamentos = () => {
  const [materiais, setMateriais] = useState<MaterialEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchMateriais = async (filters?: {
    tipo?: string;
    status?: string;
    classe?: string;
    search?: string;
  }) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Definir o contexto da empresa para RLS

      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });

      

      let query = supabase
        .from('almoxarifado.materiais_equipamentos')
        .select(`
          *,
          localizacao:localizacoes_fisicas(id, rua, nivel, posicao, descricao),
          estoque_atual:estoque_atual(quantidade_atual, quantidade_reservada, quantidade_disponivel, valor_total)
        `)
        .eq('company_id', selectedCompany.id);

      if (filters?.tipo && filters.tipo !== 'todos') {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }

      if (filters?.classe && filters.classe !== 'todos') {
        query = query.eq('classe', filters.classe);
      }

      if (filters?.search) {
        query = query.or(`descricao.ilike.%${filters.search}%,codigo_interno.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.order('descricao');

      if (fetchError) throw fetchError;

      setMateriais(data || []);
    } catch (err) {
      console.error('Erro ao buscar materiais:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async (data: CreateMaterialData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const { data: newMaterial, error } = await supabase
        .from('almoxarifado.materiais_equipamentos')
        .insert([{
          ...data,
          company_id: selectedCompany.id
        }])
        .select(`
          *,
          localizacao:localizacoes_fisicas(id, rua, nivel, posicao, descricao)
        `)
        .single();

      if (error) throw error;

      // Criar registro de estoque inicial
      await supabase
        .from('almoxarifado.estoque_atual')
        .insert([{
          material_equipamento_id: newMaterial.id,
          almoxarifado_id: data.almoxarifado_id || (await getDefaultAlmoxarifado()),
          quantidade_atual: 0,
          quantidade_reservada: 0
        }]);

      setMateriais(prev => [...prev, newMaterial]);
      return newMaterial;
    } catch (err) {
      console.error('Erro ao criar material:', err);
      throw err;
    }
  };

  const updateMaterial = async (id: string, data: Partial<CreateMaterialData>) => {
    try {
      const { data: updatedMaterial, error } = await supabase
        .from('almoxarifado.materiais_equipamentos')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          localizacao:localizacoes_fisicas(id, rua, nivel, posicao, descricao)
        `)
        .single();

      if (error) throw error;

      setMateriais(prev => 
        prev.map(material => 
          material.id === id ? updatedMaterial : material
        )
      );
      return updatedMaterial;
    } catch (err) {
      console.error('Erro ao atualizar material:', err);
      throw err;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.materiais_equipamentos')
        .update({ status: 'inativo' })
        .eq('id', id);

      if (error) throw error;

      setMateriais(prev => prev.filter(material => material.id !== id));
    } catch (err) {
      console.error('Erro ao excluir material:', err);
      throw err;
    }
  };

  const getDefaultAlmoxarifado = async () => {
    const { data } = await supabase
      .from('almoxarifado.almoxarifados')
      .select('id')
      .eq('company_id', selectedCompany?.id)
      .eq('ativo', true)
      .limit(1)
      .single();

    return data?.id;
  };

  useEffect(() => {
    fetchMateriais();
  }, [selectedCompany?.id]);

  return {
    materiais,
    loading,
    error,
    refetch: fetchMateriais,
    createMaterial,
    updateMaterial,
    deleteMaterial
  };
};

