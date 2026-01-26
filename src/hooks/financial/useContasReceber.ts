// =====================================================
// HOOK: USAR CONTAS A RECEBER
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar contas a receber
// Autor: Sistema MultiWeave Core

import { useState } from 'react';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { ContaReceber, ContaReceberFormData, ContaReceberFilters } from '@/integrations/supabase/financial-types';
import { useFinanceiroData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EntityService } from '@/services/generic/entityService';

interface UseContasReceberReturn {
  contasReceber: ContaReceber[];
  loading: boolean;
  error: string | null;
  filters: ContaReceberFilters;
  setFilters: (filters: ContaReceberFilters) => void;
  createContaReceber: (data: ContaReceberFormData) => Promise<void>;
  updateContaReceber: (id: string, data: Partial<ContaReceberFormData>) => Promise<void>;
  deleteContaReceber: (id: string) => Promise<void>;
  confirmContaReceber: (id: string, observacoes?: string) => Promise<void>;
  receiveContaReceber: (id: string, dataRecebimento: string, valorRecebido: number) => Promise<void>;
  refresh: () => Promise<void>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canConfirm: boolean;
}

export function useContasReceber(): UseContasReceberReturn {
  const { selectedCompany } = useCompany();
  const { canCreateModule, canEditModule, canDeleteModule, canCreatePage, canEditPage, canDeletePage } = usePermissions();
  
  const [filters, setFilters] = useState<ContaReceberFilters>({});

  const canCreate = canCreateModule('financeiro') && canCreatePage('/financeiro/contas-receber*');
  const canEdit = canEditModule('financeiro') && canEditPage('/financeiro/contas-receber*');
  const canDelete = canDeleteModule('financeiro') && canDeletePage('/financeiro/contas-receber*');
  const canConfirm = canEditModule('financeiro') && canEditPage('/financeiro/contas-receber*');

  // Carregar dados usando EntityService
  const entityFilters: any = {};
  if (filters.status) entityFilters.status = filters.status;
  if (filters.cliente_nome) entityFilters.cliente_nome = filters.cliente_nome;
  if (filters.centro_custo_id) entityFilters.centro_custo_id = filters.centro_custo_id;
  if (filters.classe_financeira) entityFilters.classe_financeira = filters.classe_financeira;
  if (filters.valor_minimo !== undefined) entityFilters.valor_minimo = filters.valor_minimo;
  if (filters.valor_maximo !== undefined) entityFilters.valor_maximo = filters.valor_maximo;

  const { data: contasReceberData, isLoading, error: queryError } = useFinanceiroData<ContaReceber>(
    'contas_receber',
    selectedCompany?.id || '',
    entityFilters
  );

  // Filtrar por data de vencimento no código (já que filtros de data podem não estar disponíveis diretamente)
  const contasReceber = contasReceberData?.filter(cr => {
    if (filters.data_vencimento_inicio) {
      const dataInicio = new Date(filters.data_vencimento_inicio);
      const dataVenc = new Date(cr.data_vencimento);
      if (dataVenc < dataInicio) return false;
    }
    if (filters.data_vencimento_fim) {
      const dataFim = new Date(filters.data_vencimento_fim);
      const dataVenc = new Date(cr.data_vencimento);
      if (dataVenc > dataFim) return false;
    }
    return true;
  }) || [];

  const loading = isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Erro desconhecido') : null;

  // Mutations
  const createMutation = useCreateEntity<ContaReceberFormData>('financeiro', 'contas_receber', selectedCompany?.id || '');
  const updateMutation = useUpdateEntity<Partial<ContaReceberFormData>>('financeiro', 'contas_receber', selectedCompany?.id || '');
  const deleteMutation = useDeleteEntity('financeiro', 'contas_receber', selectedCompany?.id || '');

  // Carregar contas a receber (função de refresh)
  const loadContasReceber = async () => {
    // Os dados são carregados automaticamente pelo hook useFinanceiroData
    // Esta função pode ser usada para forçar refresh se necessário
    return;
  };

  // Criar conta a receber
  const createContaReceber = async (data: ContaReceberFormData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Garantir que valor_atual seja preenchido (inicialmente igual ao valor_original)
    const contaData: ContaReceberFormData = {
      ...data,
      valor_atual: data.valor_atual ?? data.valor_original,
    };
    
    await createMutation.mutateAsync(contaData);
  };

  // Atualizar conta a receber
  const updateContaReceber = async (id: string, data: Partial<ContaReceberFormData>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Verificar se a conta está recebida antes de atualizar
    const conta = await EntityService.getById<ContaReceber>({
      schema: 'financeiro',
      table: 'contas_receber',
      id: id,
      companyId: selectedCompany.id
    });
    
    if (conta?.status === 'recebido') {
      throw new Error('Não é possível editar uma conta que já foi recebida.');
    }
    
    await updateMutation.mutateAsync({ id, data });
  };

  // Deletar conta a receber
  const deleteContaReceber = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Verificar se a conta está recebida antes de deletar
    const conta = await EntityService.getById<ContaReceber>({
      schema: 'financeiro',
      table: 'contas_receber',
      id: id,
      companyId: selectedCompany.id
    });
    
    if (conta?.status === 'recebido') {
      throw new Error('Não é possível excluir uma conta que já foi recebida.');
    }
    
    await deleteMutation.mutateAsync(id);
  };

  // Confirmar conta a receber
  const confirmContaReceber = async (id: string, observacoes?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'contas_receber',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status: 'confirmado',
        observacoes: observacoes,
        updated_at: new Date().toISOString()
      }
    });
  };

  // Receber conta a receber
  const receiveContaReceber = async (id: string, dataRecebimento: string, valorRecebido: number) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Verificar se a conta tem nota fiscal anexada e número informado
    const conta = await EntityService.getById<ContaReceber>({
      schema: 'financeiro',
      table: 'contas_receber',
      id: id,
      companyId: selectedCompany.id
    });
    
    if (!conta) {
      throw new Error('Conta a receber não encontrada.');
    }
    
    if (!conta.numero_nota_fiscal || !conta.anexo_nota_fiscal) {
      throw new Error('Não é possível marcar a conta como recebida sem anexar a nota fiscal e informar o número da nota fiscal. Por favor, edite a conta e adicione essas informações antes de recebê-la.');
    }
    
    await EntityService.update({
      schema: 'financeiro',
      table: 'contas_receber',
      companyId: selectedCompany.id,
      id: id,
      data: {
        status: 'recebido',
        data_recebimento: dataRecebimento,
        valor_recebido: valorRecebido,
        valor_atual: valorRecebido,
        updated_at: new Date().toISOString()
      }
    });
  };

  // Recarregar dados
  const refresh = async () => {
    // Os dados são recarregados automaticamente pelo React Query
    // Esta função pode ser usada para forçar refresh se necessário
    return;
  };

  return {
    contasReceber,
    loading,
    error,
    filters,
    setFilters,
    createContaReceber,
    updateContaReceber,
    deleteContaReceber,
    confirmContaReceber,
    receiveContaReceber,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canConfirm,
  };
}

