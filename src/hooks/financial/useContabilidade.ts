// =====================================================
// HOOK: USAR MÓDULO CONTABILIDADE
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar módulo contabilidade
// Autor: Sistema MultiWeave Core

import { useState } from 'react';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  PlanoContas, 
  LancamentoContabil, 
  RateioContabil,
  SpedFiscal,
  SpedContabil,
  Balancete,
  DRE,
  BalancoPatrimonial
} from '@/integrations/supabase/financial-types';
import { useFinanceiroData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EntityService } from '@/services/generic/entityService';

interface UseContabilidadeReturn {
  planoContas: PlanoContas[];
  lancamentos: LancamentoContabil[];
  rateios: RateioContabil[];
  spedFiscal: SpedFiscal[];
  spedContabil: SpedContabil[];
  balancete: Balancete[];
  dre: DRE[];
  balanco: BalancoPatrimonial[];
  loading: boolean;
  error: string | null;
  
  // Plano de Contas
  createPlanoContas: (data: Partial<PlanoContas>) => Promise<void>;
  updatePlanoContas: (id: string, data: Partial<PlanoContas>) => Promise<void>;
  deletePlanoContas: (id: string) => Promise<void>;
  
  // Lançamentos Contábeis
  createLancamento: (data: Partial<LancamentoContabil>) => Promise<void>;
  updateLancamento: (id: string, data: Partial<LancamentoContabil>) => Promise<void>;
  deleteLancamento: (id: string) => Promise<void>;
  estornarLancamento: (id: string) => Promise<void>;
  
  
  // Rateios
  createRateio: (data: Partial<RateioContabil>) => Promise<void>;
  updateRateio: (id: string, data: Partial<RateioContabil>) => Promise<void>;
  deleteRateio: (id: string) => Promise<void>;
  
  // SPED
  gerarSpedFiscal: (periodo: string) => Promise<void>;
  gerarSpedContabil: (periodo: string) => Promise<void>;
  validarSped: (id: string, tipo: 'fiscal' | 'contabil') => Promise<void>;
  
  // Relatórios
  gerarBalancete: (periodo: string) => Promise<void>;
  gerarDRE: (periodo: string) => Promise<void>;
  gerarBalanco: (periodo: string) => Promise<void>;
  
  // Utilitários
  refresh: () => Promise<void>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canGenerate: boolean;
}

export function useContabilidade(): UseContabilidadeReturn {
  const { selectedCompany } = useCompany();
  const { canCreateModule, canEditModule, canDeleteModule, canReadModule, canCreatePage, canEditPage, canDeletePage, canReadPage } = usePermissions();
  
  // Carregar dados usando EntityService
  const { data: planoContasData, isLoading: loadingPlano } = useFinanceiroData<PlanoContas>(
    'plano_contas',
    selectedCompany?.id || ''
  );
  const { data: lancamentosData, isLoading: loadingLancamentos } = useFinanceiroData<LancamentoContabil>(
    'lancamentos_contabeis',
    selectedCompany?.id || ''
  );
  // Nota: rateios, sped, balancete, dre e balanco podem ser views ou tabelas separadas
  // Por enquanto, vamos usar as tabelas disponíveis
  const { data: rateiosData, isLoading: loadingRateios } = useFinanceiroData<RateioContabil>(
    'lancamentos_contabeis', // Usar mesma tabela ou criar tabela específica
    selectedCompany?.id || ''
  );

  const planoContas = planoContasData || [];
  const lancamentos = lancamentosData || [];
  const rateios = rateiosData || [];
  // Nota: SPED, Balancete, DRE e Balanço são geralmente gerados/calculados, não armazenados diretamente
  // Podem ser views materializadas ou calculados via RPC
  const spedFiscal: SpedFiscal[] = [];
  const spedContabil: SpedContabil[] = [];
  const balancete: Balancete[] = [];
  const dre: DRE[] = [];
  const balanco: BalancoPatrimonial[] = [];
  
  const loading = loadingPlano || loadingLancamentos || loadingRateios;
  const error = null; // Erros são tratados pelo React Query

  const canCreate = canCreateModule('financeiro') && canCreatePage('/financeiro/contabilidade*');
  const canEdit = canEditModule('financeiro') && canEditPage('/financeiro/contabilidade*');
  const canDelete = canDeleteModule('financeiro') && canDeletePage('/financeiro/contabilidade*');
  const canGenerate = canReadModule('financeiro') && canReadPage('/financeiro/contabilidade*');

  // Mutations
  const createPlanoMutation = useCreateEntity<Partial<PlanoContas>>('financeiro', 'plano_contas', selectedCompany?.id || '');
  const updatePlanoMutation = useUpdateEntity<Partial<PlanoContas>>('financeiro', 'plano_contas', selectedCompany?.id || '');
  const deletePlanoMutation = useDeleteEntity('financeiro', 'plano_contas', selectedCompany?.id || '');
  const createLancamentoMutation = useCreateEntity<Partial<LancamentoContabil>>('financeiro', 'lancamentos_contabeis', selectedCompany?.id || '');
  const updateLancamentoMutation = useUpdateEntity<Partial<LancamentoContabil>>('financeiro', 'lancamentos_contabeis', selectedCompany?.id || '');
  const deleteLancamentoMutation = useDeleteEntity('financeiro', 'lancamentos_contabeis', selectedCompany?.id || '');

  // Plano de Contas
  const createPlanoContas = async (data: Partial<PlanoContas>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await createPlanoMutation.mutateAsync(data);
  };

  const updatePlanoContas = async (id: string, data: Partial<PlanoContas>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await updatePlanoMutation.mutateAsync({ id, data });
  };

  const deletePlanoContas = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await deletePlanoMutation.mutateAsync(id);
  };

  // Lançamentos Contábeis
  const createLancamento = async (data: Partial<LancamentoContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await createLancamentoMutation.mutateAsync(data);
  };

  const updateLancamento = async (id: string, data: Partial<LancamentoContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await updateLancamentoMutation.mutateAsync({ id, data });
  };

  const deleteLancamento = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await deleteLancamentoMutation.mutateAsync(id);
  };

  const estornarLancamento = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Estornar criando um lançamento reverso
    const lancamento = lancamentos.find(l => l.id === id);
    if (!lancamento) throw new Error('Lançamento não encontrado');
    
    await createLancamentoMutation.mutateAsync({
      ...lancamento,
      historico: `Estorno de ${lancamento.numero_documento}`,
      valor_total: -lancamento.valor_total,
      origem: 'estorno',
      tipo_lancamento: 'estorno'
    });
  };


  // Rateios
  const createRateio = async (data: Partial<RateioContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    // Nota: Rateios podem estar em uma tabela separada ou serem parte dos lançamentos
    await EntityService.create({
      schema: 'financeiro',
      table: 'lancamentos_contabeis', // Ou tabela específica de rateios se existir
      companyId: selectedCompany.id,
      data: data
    });
  };

  const updateRateio = async (id: string, data: Partial<RateioContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.update({
      schema: 'financeiro',
      table: 'lancamentos_contabeis', // Ou tabela específica de rateios se existir
      companyId: selectedCompany.id,
      id: id,
      data: data
    });
  };

  const deleteRateio = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    await EntityService.delete({
      schema: 'financeiro',
      table: 'lancamentos_contabeis', // Ou tabela específica de rateios se existir
      companyId: selectedCompany.id,
      id: id
    });
  };

  // SPED
  const gerarSpedFiscal = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Nota: Geração de SPED geralmente é feita via RPC específico
    // Por enquanto, criar registro na tabela se existir
    await EntityService.create({
      schema: 'financeiro',
      table: 'lancamentos_contabeis', // Ou tabela específica de SPED se existir
      companyId: selectedCompany.id,
      data: {
        periodo: periodo,
        tipo_lancamento: 'sped_fiscal',
        origem: 'sistema'
      }
    });
  };

  const gerarSpedContabil = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Nota: Geração de SPED geralmente é feita via RPC específico
    await EntityService.create({
      schema: 'financeiro',
      table: 'lancamentos_contabeis', // Ou tabela específica de SPED se existir
      companyId: selectedCompany.id,
      data: {
        periodo: periodo,
        tipo_lancamento: 'sped_contabil',
        origem: 'sistema'
      }
    });
  };

  const validarSped = async (id: string, tipo: 'fiscal' | 'contabil') => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    
    // Nota: Validação de SPED geralmente é feita via RPC específico
    // Por enquanto, apenas atualizar status
    await EntityService.update({
      schema: 'financeiro',
      table: 'lancamentos_contabeis', // Ou tabela específica de SPED se existir
      companyId: selectedCompany.id,
      id: id,
      data: {
        status: 'validado',
        updated_at: new Date().toISOString()
      }
    });
  };

  // Relatórios
  // Nota: Balancete, DRE e Balanço são geralmente gerados via RPC ou views materializadas
  // Estas funções podem chamar RPCs específicos para gerar os relatórios
  const gerarBalancete = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    // Chamar RPC para gerar balancete ou buscar de view materializada
    // Por enquanto, apenas retornar (dados serão calculados quando necessário)
    return;
  };

  const gerarDRE = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    // Chamar RPC para gerar DRE ou buscar de view materializada
    return;
  };

  const gerarBalanco = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
    // Chamar RPC para gerar balanço ou buscar de view materializada
    return;
  };

  // Recarregar dados
  const refresh = async () => {
    // Os dados são recarregados automaticamente pelo React Query
    return;
  };

  return {
    planoContas,
    lancamentos,
    rateios,
    spedFiscal,
    spedContabil,
    balancete,
    dre,
    balanco,
    loading,
    error,
    createPlanoContas,
    updatePlanoContas,
    deletePlanoContas,
    createLancamento,
    updateLancamento,
    deleteLancamento,
    estornarLancamento,
    createRateio,
    updateRateio,
    deleteRateio,
    gerarSpedFiscal,
    gerarSpedContabil,
    validarSped,
    gerarBalancete,
    gerarDRE,
    gerarBalanco,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canGenerate,
  };
}
