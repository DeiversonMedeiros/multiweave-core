import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface ChecklistItem {
  id: string;
  entrada_id: string;
  item_id: string;
  criterio: string;
  aprovado: boolean;
  observacoes?: string;
  usuario_id: string;
  data_verificacao: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface CriterioChecklist {
  id: string;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  tipo: 'boolean' | 'texto' | 'numero';
  ativo: boolean;
}

export const useChecklistRecebimento = (entradaId?: string) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [criterios, setCriterios] = useState<CriterioChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  // Critérios padrão do checklist
  const criteriosPadrao: CriterioChecklist[] = [
    {
      id: '1',
      nome: 'Embalagem Íntegra',
      descricao: 'Verificar se a embalagem está íntegra e sem danos',
      obrigatorio: true,
      tipo: 'boolean',
      ativo: true
    },
    {
      id: '2',
      nome: 'Quantidade Conforme',
      descricao: 'Verificar se a quantidade recebida confere com a nota fiscal',
      obrigatorio: true,
      tipo: 'boolean',
      ativo: true
    },
    {
      id: '3',
      nome: 'Qualidade do Material',
      descricao: 'Verificar se o material está em perfeitas condições',
      obrigatorio: true,
      tipo: 'boolean',
      ativo: true
    },
    {
      id: '4',
      nome: 'Documentação Completa',
      descricao: 'Verificar se toda documentação necessária está presente',
      obrigatorio: true,
      tipo: 'boolean',
      ativo: true
    },
    {
      id: '5',
      nome: 'Especificações Técnicas',
      descricao: 'Verificar se o material atende às especificações técnicas',
      obrigatorio: false,
      tipo: 'boolean',
      ativo: true
    },
    {
      id: '6',
      nome: 'Observações Gerais',
      descricao: 'Observações adicionais sobre o recebimento',
      obrigatorio: false,
      tipo: 'texto',
      ativo: true
    }
  ];

  const fetchChecklist = async () => {
    if (!entradaId) return;

    try {
      setLoading(true);
      setError(null);

      // Definir o contexto da empresa para RLS      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });            const { data, error: fetchError } = await supabase
        .from('almoxarifado.checklist_recebimento')
        .select(`
          *,
          usuario:users!usuario_id(id, nome, email)
        `)
        .eq('entrada_id', entradaId)
        .order('criterio');

      if (fetchError) throw fetchError;

      setChecklistItems(data || []);
      setCriterios(criteriosPadrao);
    } catch (err) {
      console.error('Erro ao buscar checklist:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createChecklistItem = async (data: Omit<ChecklistItem, 'id' | 'data_verificacao'>) => {
    try {
      const { data: newItem, error } = await supabase
        .from('almoxarifado.checklist_recebimento')
        .insert([{
          ...data,
          data_verificacao: new Date().toISOString()
        }])
        .select(`
          *,
          usuario:users!usuario_id(id, nome, email)
        `)
        .single();

      if (error) throw error;

      setChecklistItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      console.error('Erro ao criar item do checklist:', err);
      throw err;
    }
  };

  const updateChecklistItem = async (id: string, data: Partial<ChecklistItem>) => {
    try {
      const { data: updatedItem, error } = await supabase
        .from('almoxarifado.checklist_recebimento')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          usuario:users!usuario_id(id, nome, email)
        `)
        .single();

      if (error) throw error;

      setChecklistItems(prev => 
        prev.map(item => 
          item.id === id ? updatedItem : item
        )
      );
      return updatedItem;
    } catch (err) {
      console.error('Erro ao atualizar item do checklist:', err);
      throw err;
    }
  };

  const deleteChecklistItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.checklist_recebimento')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setChecklistItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Erro ao excluir item do checklist:', err);
      throw err;
    }
  };

  const verificarAprovacaoChecklist = (entradaId: string) => {
    const itensObrigatorios = criterios.filter(c => c.obrigatorio);
    const itensVerificados = checklistItems.filter(item => 
      item.entrada_id === entradaId && 
      itensObrigatorios.some(criterio => criterio.nome === item.criterio)
    );

    const itensAprovados = itensVerificados.filter(item => item.aprovado);
    
    return {
      totalObrigatorios: itensObrigatorios.length,
      verificados: itensVerificados.length,
      aprovados: itensAprovados.length,
      aprovado: itensObrigatorios.length === itensAprovados.length && itensObrigatorios.length > 0
    };
  };

  const getChecklistPorItem = (itemId: string) => {
    return checklistItems.filter(item => item.item_id === itemId);
  };

  const getStatusChecklist = (entradaId: string) => {
    const verificacao = verificarAprovacaoChecklist(entradaId);
    
    if (verificacao.verificados === 0) {
      return { status: 'pendente', cor: 'text-gray-500', texto: 'Não iniciado' };
    } else if (verificacao.aprovado) {
      return { status: 'aprovado', cor: 'text-green-600', texto: 'Aprovado' };
    } else {
      return { status: 'rejeitado', cor: 'text-red-600', texto: 'Rejeitado' };
    }
  };

  useEffect(() => {
    if (entradaId) {
      fetchChecklist();
    }
  }, [entradaId]);

  return {
    checklistItems,
    criterios,
    loading,
    error,
    refetch: fetchChecklist,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    verificarAprovacaoChecklist,
    getChecklistPorItem,
    getStatusChecklist
  };
};

