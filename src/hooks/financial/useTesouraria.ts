// =====================================================
// HOOK: USAR TESOURARIA
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar tesouraria e conciliação bancária
// Autor: Sistema MultiWeave Core

import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { ContaBancaria, FluxoCaixa, ConciliacaoBancaria } from '@/integrations/supabase/financial-types';
import { useFinanceiroData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EntityService } from '@/services/generic/entityService';

interface UseTesourariaReturn {
  contasBancarias: ContaBancaria[];
  fluxoCaixa: FluxoCaixa[];
  conciliacoes: ConciliacaoBancaria[];
  loading: boolean;
  error: string | null;
  createContaBancaria: (data: Partial<ContaBancaria>) => Promise<void>;
  updateContaBancaria: (id: string, data: Partial<ContaBancaria>) => Promise<void>;
  deleteContaBancaria: (id: string) => Promise<void>;
  createFluxoCaixa: (data: Partial<FluxoCaixa>) => Promise<void>;
  updateFluxoCaixa: (id: string, data: Partial<FluxoCaixa>) => Promise<void>;
  deleteFluxoCaixa: (id: string) => Promise<void>;
  processarConciliacao: (contaId: string, dataInicio: string, dataFim: string) => Promise<void>;
  importarExtrato: (contaId: string, arquivo: File) => Promise<void>;
  gerarProjecaoFluxo: (dias: number) => Promise<FluxoCaixa[]>;
  refresh: () => Promise<void>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canProcess: boolean;
}

export function useTesouraria(): UseTesourariaReturn {
  const { selectedCompany } = useCompany();
  const { canCreateModule, canEditModule, canDeleteModule, canCreatePage, canEditPage, canDeletePage } = usePermissions();

  const canCreate = canCreateModule('financeiro') && canCreatePage('/financeiro/tesouraria*');
  const canEdit = canEditModule('financeiro') && canEditPage('/financeiro/tesouraria*');
  const canDelete = canDeleteModule('financeiro') && canDeletePage('/financeiro/bancaria*');
  const canProcess = canEditModule('financeiro') && canEditPage('/financeiro/conciliacao-bancaria*');

  // Carregar dados usando EntityService
  const { data: contasBancariasData, isLoading: loadingContas, error: errorContas } = useFinanceiroData<ContaBancaria>(
    'contas_bancarias',
    selectedCompany?.id || ''
  );
  const { data: fluxoCaixaData, isLoading: loadingFluxo, error: errorFluxo } = useFinanceiroData<FluxoCaixa>(
    'fluxo_caixa',
    selectedCompany?.id || ''
  );
  const { data: conciliacoesData, isLoading: loadingConciliacoes, error: errorConciliacoes } = useFinanceiroData<ConciliacaoBancaria>(
    'conciliacoes_bancarias',
    selectedCompany?.id || ''
  );

  const contasBancarias = contasBancariasData || [];
  const fluxoCaixa = fluxoCaixaData || [];
  const conciliacoes = conciliacoesData || [];
  const loading = loadingContas || loadingFluxo || loadingConciliacoes;
  const error = errorContas || errorFluxo || errorConciliacoes
    ? (errorContas || errorFluxo || errorConciliacoes) instanceof Error
      ? (errorContas || errorFluxo || errorConciliacoes).message
      : 'Erro desconhecido'
    : null;

  // Mutations
  const createContaMutation = useCreateEntity<Partial<ContaBancaria>>('financeiro', 'contas_bancarias', selectedCompany?.id || '');
  const updateContaMutation = useUpdateEntity<Partial<ContaBancaria>>('financeiro', 'contas_bancarias', selectedCompany?.id || '');
  const deleteContaMutation = useDeleteEntity('financeiro', 'contas_bancarias', selectedCompany?.id || '');
  const createFluxoMutation = useCreateEntity<Partial<FluxoCaixa>>('financeiro', 'fluxo_caixa', selectedCompany?.id || '');
  const updateFluxoMutation = useUpdateEntity<Partial<FluxoCaixa>>('financeiro', 'fluxo_caixa', selectedCompany?.id || '');
  const deleteFluxoMutation = useDeleteEntity('financeiro', 'fluxo_caixa', selectedCompany?.id || '');

  // Carregar dados da tesouraria (função de refresh)
  const loadTesouraria = async () => {
    // Os dados são carregados automaticamente pelo hook useFinanceiroData
    return;
  };

  // Criar conta bancária
  const createContaBancaria = async (data: Partial<ContaBancaria>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await createContaMutation.mutateAsync(data);
  };

  // Atualizar conta bancária
  const updateContaBancaria = async (id: string, data: Partial<ContaBancaria>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await updateContaMutation.mutateAsync({ id, data });
  };

  // Deletar conta bancária
  const deleteContaBancaria = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await deleteContaMutation.mutateAsync(id);
  };

  // Criar fluxo de caixa
  const createFluxoCaixa = async (data: Partial<FluxoCaixa>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await createFluxoMutation.mutateAsync(data);
  };

  // Atualizar fluxo de caixa
  const updateFluxoCaixa = async (id: string, data: Partial<FluxoCaixa>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await updateFluxoMutation.mutateAsync({ id, data });
  };

  // Deletar fluxo de caixa
  const deleteFluxoCaixa = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await deleteFluxoMutation.mutateAsync(id);
  };

  // Processar conciliação bancária
  const processarConciliacao = async (contaId: string, dataInicio: string, dataFim: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    await EntityService.create({
      schema: 'financeiro',
      table: 'conciliacoes_bancarias',
      companyId: selectedCompany.id,
      data: {
        conta_bancaria_id: contaId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'em_processamento',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  };

  // Importar extrato bancário
  const importarExtrato = async (contaId: string, arquivo: File) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Nota: Upload de arquivo pode precisar de um endpoint específico ou RPC
    // Por enquanto, vamos criar um registro de conciliação pendente
    await EntityService.create({
      schema: 'financeiro',
      table: 'conciliacoes_bancarias',
      companyId: selectedCompany.id,
      data: {
        conta_bancaria_id: contaId,
        status: 'pendente_importacao',
        observacoes: `Extrato importado: ${arquivo.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  };

  // Gerar projeção de fluxo de caixa
  const gerarProjecaoFluxo = async (dias: number): Promise<FluxoCaixa[]> => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Buscar fluxo de caixa existente e projetar baseado em padrões
    const result = await EntityService.list<FluxoCaixa>({
      schema: 'financeiro',
      table: 'fluxo_caixa',
      companyId: selectedCompany.id,
      filters: {},
      page: 1,
      pageSize: 1000
    });
    
    // Nota: A projeção pode ser calculada no frontend ou via RPC específico
    // Por enquanto, retornar os dados existentes filtrados
    return result.data || [];
  };

  // Recarregar dados
  const refresh = async () => {
    // Os dados são recarregados automaticamente pelo React Query
    return;
  };

  return {
    contasBancarias,
    fluxoCaixa,
    conciliacoes,
    loading,
    error,
    createContaBancaria,
    updateContaBancaria,
    deleteContaBancaria,
    createFluxoCaixa,
    updateFluxoCaixa,
    deleteFluxoCaixa,
    processarConciliacao,
    importarExtrato,
    gerarProjecaoFluxo,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canProcess,
  };
}
