import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface EntradaMaterial {
  id: string;
  company_id: string;
  nfe_id?: string;
  fornecedor_id?: string;
  numero_nota?: string;
  data_entrada: string;
  valor_total?: number;
  status: 'pendente' | 'inspecao' | 'aprovado' | 'rejeitado';
  checklist_aprovado: boolean;
  usuario_recebimento_id?: string;
  usuario_aprovacao_id?: string;
  observacoes?: string;
  created_at: string;
  fornecedor?: {
    id: string;
    nome: string;
    cnpj: string;
  };
  nfe?: {
    id: string;
    chave_acesso: string;
    numero_nfe: string;
    serie: string;
    data_emissao: string;
    valor_total: number;
    status_sefaz: string;
    xml_nfe?: string;
    danfe_url?: string;
  };
  itens?: EntradaItem[];
  usuario_recebimento?: {
    id: string;
    nome: string;
    email: string;
  };
  usuario_aprovacao?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface EntradaItem {
  id: string;
  entrada_id: string;
  material_equipamento_id: string;
  quantidade_recebida: number;
  quantidade_aprovada: number;
  valor_unitario?: number;
  valor_total?: number;
  centro_custo_id?: string;
  projeto_id?: string;
  lote?: string;
  validade?: string;
  observacoes?: string;
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
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
}

export interface CreateEntradaData {
  nfe_id?: string;
  fornecedor_id?: string;
  numero_nota?: string;
  data_entrada: string;
  valor_total?: number;
  observacoes?: string;
  itens: Omit<EntradaItem, 'id' | 'entrada_id'>[];
}

export const useEntradasMateriais = () => {
  const [entradas, setEntradas] = useState<EntradaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchEntradas = async (filters?: {
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    fornecedor_id?: string;
  }) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('almoxarifado.entradas_materiais')
        .select(`
          *,
          fornecedor:partners!fornecedor_id(id, nome, cnpj),
          nfe:financeiro.nfe!nfe_id(
            id, chave_acesso, numero_nfe, serie, data_emissao, 
            valor_total, status_sefaz, xml_nfe, danfe_url
          ),
          usuario_recebimento:users!usuario_recebimento_id(id, nome, email),
          usuario_aprovacao:users!usuario_aprovacao_id(id, nome, email),
          itens:entrada_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
            projeto:projects!projeto_id(id, nome, codigo)
          )
        `)
        .eq('company_id', selectedCompany.id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.data_inicio) {
        query = query.gte('data_entrada', filters.data_inicio);
      }

      if (filters?.data_fim) {
        query = query.lte('data_entrada', filters.data_fim);
      }

      if (filters?.fornecedor_id) {
        query = query.eq('fornecedor_id', filters.fornecedor_id);
      }

      const { data, error: fetchError } = await query.order('data_entrada', { ascending: false });

      if (fetchError) throw fetchError;

      setEntradas(data || []);
    } catch (err) {
      console.error('Erro ao buscar entradas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createEntrada = async (data: CreateEntradaData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Criar entrada principal
      const { data: newEntrada, error: entradaError } = await supabase
        .from('almoxarifado.entradas_materiais')
        .insert([{
          ...data,
          company_id: selectedCompany.id,
          status: 'pendente',
          checklist_aprovado: false
        }])
        .select()
        .single();

      if (entradaError) throw entradaError;

      // Criar itens da entrada
      if (data.itens && data.itens.length > 0) {
        const itensData = data.itens.map(item => ({
          ...item,
          entrada_id: newEntrada.id
        }));

        const { error: itensError } = await supabase
          .from('almoxarifado.entrada_itens')
          .insert(itensData);

        if (itensError) throw itensError;
      }

      // Buscar entrada completa
      const { data: entradaCompleta, error: fetchError } = await supabase
        .from('almoxarifado.entradas_materiais')
        .select(`
          *,
          fornecedor:partners!fornecedor_id(id, nome, cnpj),
          nfe:financeiro.nfe!nfe_id(
            id, chave_acesso, numero_nfe, serie, data_emissao, 
            valor_total, status_sefaz, xml_nfe, danfe_url
          ),
          usuario_recebimento:users!usuario_recebimento_id(id, nome, email),
          usuario_aprovacao:users!usuario_aprovacao_id(id, nome, email),
          itens:entrada_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
            projeto:projects!projeto_id(id, nome, codigo)
          )
        `)
        .eq('id', newEntrada.id)
        .single();

      if (fetchError) throw fetchError;

      setEntradas(prev => [entradaCompleta, ...prev]);
      return entradaCompleta;
    } catch (err) {
      console.error('Erro ao criar entrada:', err);
      throw err;
    }
  };

  const updateEntrada = async (id: string, data: Partial<EntradaMaterial>) => {
    try {
      const { data: updatedEntrada, error } = await supabase
        .from('almoxarifado.entradas_materiais')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          fornecedor:partners!fornecedor_id(id, nome, cnpj),
          nfe:financeiro.nfe!nfe_id(
            id, chave_acesso, numero_nfe, serie, data_emissao, 
            valor_total, status_sefaz, xml_nfe, danfe_url
          ),
          usuario_recebimento:users!usuario_recebimento_id(id, nome, email),
          usuario_aprovacao:users!usuario_aprovacao_id(id, nome, email),
          itens:entrada_itens(
            *,
            material:materiais_equipamentos!material_equipamento_id(
              id, codigo_interno, descricao, tipo, unidade_medida
            ),
            centro_custo:cost_centers!centro_custo_id(id, nome, codigo),
            projeto:projects!projeto_id(id, nome, codigo)
          )
        `)
        .single();

      if (error) throw error;

      setEntradas(prev => 
        prev.map(entrada => 
          entrada.id === id ? updatedEntrada : entrada
        )
      );
      return updatedEntrada;
    } catch (err) {
      console.error('Erro ao atualizar entrada:', err);
      throw err;
    }
  };

  const aprovarEntrada = async (id: string, usuarioAprovacaoId: string) => {
    try {
      // Atualizar status da entrada
      const { error: entradaError } = await supabase
        .from('almoxarifado.entradas_materiais')
        .update({
          status: 'aprovado',
          checklist_aprovado: true,
          usuario_aprovacao_id: usuarioAprovacaoId
        })
        .eq('id', id);

      if (entradaError) throw entradaError;

      // Buscar itens aprovados para atualizar estoque
      const { data: itens, error: itensError } = await supabase
        .from('almoxarifado.entrada_itens')
        .select('*')
        .eq('entrada_id', id)
        .gt('quantidade_aprovada', 0);

      if (itensError) throw itensError;

      // Atualizar estoque para cada item aprovado
      for (const item of itens || []) {
        // Buscar almoxarifado padrão ou do item
        const { data: entrada } = await supabase
          .from('almoxarifado.entradas_materiais')
          .select('id')
          .eq('id', id)
          .single();

        // Aqui seria necessário implementar a lógica de atualização do estoque
        // Por enquanto, apenas logamos
        console.log(`Atualizando estoque para material ${item.material_equipamento_id}: +${item.quantidade_aprovada}`);
      }

      // Atualizar estado local
      await fetchEntradas();
    } catch (err) {
      console.error('Erro ao aprovar entrada:', err);
      throw err;
    }
  };

  const rejeitarEntrada = async (id: string, motivo: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.entradas_materiais')
        .update({
          status: 'rejeitado',
          observacoes: motivo
        })
        .eq('id', id);

      if (error) throw error;

      setEntradas(prev => 
        prev.map(entrada => 
          entrada.id === id ? { ...entrada, status: 'rejeitado', observacoes: motivo } : entrada
        )
      );
    } catch (err) {
      console.error('Erro ao rejeitar entrada:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchEntradas();
  }, [selectedCompany?.id]);

  return {
    entradas,
    loading,
    error,
    refetch: fetchEntradas,
    createEntrada,
    updateEntrada,
    aprovarEntrada,
    rejeitarEntrada
  };
};

