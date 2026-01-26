import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';

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
    if (!entradaId || !selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Verificar se a entrada pertence à empresa usando EntityService
      const entradaResult = await EntityService.getById<{ id: string; company_id: string }>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        id: entradaId,
        companyId: selectedCompany.id
      });

      if (!entradaResult) {
        throw new Error('Entrada não encontrada');
      }

      if (entradaResult.company_id !== selectedCompany.id) {
        throw new Error('Entrada não pertence à empresa selecionada');
      }

      // A tabela tem company_id, então não precisamos usar skipCompanyFilter
      const result = await EntityService.list<ChecklistItem>({
        schema: 'almoxarifado',
        table: 'checklist_recebimento',
        companyId: selectedCompany.id,
        filters: { entrada_id: entradaId },
        orderBy: 'criterio',
        orderDirection: 'ASC',
        skipCompanyFilter: false // A tabela TEM company_id
      });

      const items = result.data || [];
      
      // Buscar dados do usuário para cada item
      const itemsComUsuario = await Promise.all(
        items.map(async (item) => {
          try {
            const { data: usuario } = await supabase
              .from('users')
              .select('id, nome, email')
              .eq('id', item.usuario_id)
              .single();
            
            return {
              ...item,
              usuario: usuario || undefined
            };
          } catch {
            return item;
          }
        })
      );

      setChecklistItems(itemsComUsuario);
      setCriterios(criteriosPadrao);
    } catch (err) {
      console.error('Erro ao buscar checklist:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createChecklistItem = async (data: Omit<ChecklistItem, 'id' | 'data_verificacao'>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Verificar se a entrada pertence à empresa usando EntityService
      const entradaResult = await EntityService.getById<{ id: string; company_id: string }>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        id: data.entrada_id,
        companyId: selectedCompany.id
      });

      if (!entradaResult) {
        throw new Error('Entrada não encontrada');
      }

      if (entradaResult.company_id !== selectedCompany.id) {
        throw new Error('Entrada não pertence à empresa selecionada');
      }

      // Construir itemData com todos os campos obrigatórios
      const itemData: any = {
        entrada_id: data.entrada_id,
        item_id: data.item_id,
        criterio: data.criterio,
        aprovado: data.aprovado,
        usuario_id: data.usuario_id,
        data_verificacao: new Date().toISOString(),
        company_id: selectedCompany.id
      };

      // Adicionar observações se existirem
      if (data.observacoes) {
        itemData.observacoes = data.observacoes;
      }

      console.log('🔍 [createChecklistItem] Dados a serem enviados:', itemData);

      // A tabela tem company_id, então não precisamos usar skipCompanyFilter
      const newItem = await EntityService.create<ChecklistItem>({
        schema: 'almoxarifado',
        table: 'checklist_recebimento',
        companyId: selectedCompany.id,
        data: itemData,
        skipCompanyFilter: false // A tabela TEM company_id
      });

      // Buscar dados do usuário
      try {
        const { data: usuario } = await supabase
          .from('users')
          .select('id, nome, email')
          .eq('id', newItem.usuario_id)
          .single();
        
        const itemComUsuario = {
          ...newItem,
          usuario: usuario || undefined
        };

        setChecklistItems(prev => [...prev, itemComUsuario]);
        return itemComUsuario;
      } catch {
        setChecklistItems(prev => [...prev, newItem]);
        return newItem;
      }
    } catch (err) {
      console.error('Erro ao criar item do checklist:', err);
      throw err;
    }
  };

  const updateChecklistItem = async (id: string, data: Partial<ChecklistItem>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Buscar o item atual para validar entrada_id
      const itemAtual = checklistItems.find(item => item.id === id);
      if (!itemAtual) {
        throw new Error('Item do checklist não encontrado');
      }

      // Verificar se a entrada pertence à empresa usando EntityService
      const entradaResult = await EntityService.getById<{ id: string; company_id: string }>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        id: itemAtual.entrada_id,
        companyId: selectedCompany.id
      });

      if (!entradaResult) {
        throw new Error('Entrada não encontrada');
      }

      if (entradaResult.company_id !== selectedCompany.id) {
        throw new Error('Entrada não pertence à empresa selecionada');
      }

      const updatedItem = await EntityService.update<ChecklistItem>({
        schema: 'almoxarifado',
        table: 'checklist_recebimento',
        companyId: selectedCompany.id,
        id: id,
        data: data,
        skipCompanyFilter: false // A tabela TEM company_id
      });

      // Buscar dados do usuário
      try {
        const { data: usuario } = await supabase
          .from('users')
          .select('id, nome, email')
          .eq('id', updatedItem.usuario_id)
          .single();
        
        const itemComUsuario = {
          ...updatedItem,
          usuario: usuario || undefined
        };

        setChecklistItems(prev => 
          prev.map(item => 
            item.id === id ? itemComUsuario : item
          )
        );
        return itemComUsuario;
      } catch {
        setChecklistItems(prev => 
          prev.map(item => 
            item.id === id ? updatedItem : item
          )
        );
        return updatedItem;
      }
    } catch (err) {
      console.error('Erro ao atualizar item do checklist:', err);
      throw err;
    }
  };

  const deleteChecklistItem = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Buscar o item atual para validar entrada_id
      const itemAtual = checklistItems.find(item => item.id === id);
      if (!itemAtual) {
        throw new Error('Item do checklist não encontrado');
      }

      // Verificar se a entrada pertence à empresa usando EntityService
      const entradaResult = await EntityService.getById<{ id: string; company_id: string }>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        id: itemAtual.entrada_id,
        companyId: selectedCompany.id
      });

      if (!entradaResult) {
        throw new Error('Entrada não encontrada');
      }

      if (entradaResult.company_id !== selectedCompany.id) {
        throw new Error('Entrada não pertence à empresa selecionada');
      }

      await EntityService.delete({
        schema: 'almoxarifado',
        table: 'checklist_recebimento',
        companyId: selectedCompany.id,
        id: id,
        skipCompanyFilter: false // A tabela TEM company_id
      });

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

