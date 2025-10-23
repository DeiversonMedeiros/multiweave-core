// =====================================================
// HOOK: USAR MÓDULO CONTABILIDADE
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar módulo contabilidade
// Autor: Sistema MultiWeave Core

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuthorization } from '@/hooks/useAuthorization';
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
  const { checkModulePermission, checkEntityPermission } = useAuthorization();
  
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoContabil[]>([]);
  const [rateios, setRateios] = useState<RateioContabil[]>([]);
  const [spedFiscal, setSpedFiscal] = useState<SpedFiscal[]>([]);
  const [spedContabil, setSpedContabil] = useState<SpedContabil[]>([]);
  const [balancete, setBalancete] = useState<Balancete[]>([]);
  const [dre, setDre] = useState<DRE[]>([]);
  const [balanco, setBalanco] = useState<BalancoPatrimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar permissões
  const canCreate = checkModulePermission('financeiro', 'create') && checkEntityPermission('lancamentos_contabeis', 'create');
  const canEdit = checkModulePermission('financeiro', 'edit') && checkEntityPermission('lancamentos_contabeis', 'edit');
  const canDelete = checkModulePermission('financeiro', 'delete') && checkEntityPermission('lancamentos_contabeis', 'delete');
  const canGenerate = checkModulePermission('financeiro', 'read') && checkEntityPermission('lancamentos_contabeis', 'read');

  // Carregar dados contábeis
  const loadContabilidade = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Dados mockados temporariamente até implementar a API
      const mockPlanoContas: PlanoContas[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          codigo: '1.1.01',
          nome: 'Caixa',
          tipo: 'ativo',
          nivel: 3,
          conta_pai_id: '1.1',
          aceita_lancamento: true,
          saldo_inicial: 10000.00,
          saldo_atual: 15000.00,
          natureza: 'devedora',
          observacoes: 'Conta de caixa da empresa',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          company_id: selectedCompany.id,
          codigo: '1.1.02',
          nome: 'Bancos Conta Movimento',
          tipo: 'ativo',
          nivel: 3,
          conta_pai_id: '1.1',
          aceita_lancamento: true,
          saldo_inicial: 50000.00,
          saldo_atual: 45000.00,
          natureza: 'devedora',
          observacoes: 'Conta corrente bancária',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockLancamentos: LancamentoContabil[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          data_lancamento: '2025-01-15',
          data_competencia: '2025-01-15',
          numero_documento: 'LC001',
          historico: 'Venda de produtos',
          valor_total: 1500.00,
          tipo_lancamento: 'manual',
          origem: 'manual',
          status: 'aprovado',
          observacoes: 'Lançamento de venda',
          created_by: 'user1',
          aprovado_by: 'user1',
          aprovado_at: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];


      const mockRateios: RateioContabil[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          conta_id: '1',
          centro_custo_id: '1',
          percentual: 100.00,
          valor: 1500.00,
          periodo_inicio: '2025-01-01',
          periodo_fim: '2025-01-31',
          observacoes: 'Rateio mensal',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSpedFiscal: SpedFiscal[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          periodo: '202501',
          versao_layout: '010',
          status: 'gerado',
          arquivo_url: 'https://example.com/sped-fiscal.txt',
          data_geracao: new Date().toISOString(),
          observacoes: 'SPED Fiscal gerado com sucesso',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSpedContabil: SpedContabil[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          periodo: '202501',
          versao_layout: '010',
          status: 'gerado',
          arquivo_url: 'https://example.com/sped-contabil.txt',
          data_geracao: new Date().toISOString(),
          observacoes: 'SPED Contábil gerado com sucesso',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockBalancete: Balancete[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          periodo: '202501',
          conta_id: '1',
          saldo_anterior: 10000.00,
          debito_periodo: 5000.00,
          credito_periodo: 0,
          saldo_atual: 15000.00,
          natureza: 'devedora',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockDRE: DRE[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          periodo: '202501',
          conta_id: '3.1.01',
          descricao: 'Receita de Vendas',
          valor_periodo: 15000.00,
          valor_acumulado: 15000.00,
          nivel: 1,
          ordem: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockBalanco: BalancoPatrimonial[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          periodo: '202501',
          conta_id: '1.1.01',
          descricao: 'Caixa',
          valor_atual: 15000.00,
          valor_anterior: 10000.00,
          variacao: 5000.00,
          percentual_variacao: 50.00,
          nivel: 1,
          ordem: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPlanoContas(mockPlanoContas);
      setLancamentos(mockLancamentos);
      setRateios(mockRateios);
      setSpedFiscal(mockSpedFiscal);
      setSpedContabil(mockSpedContabil);
      setBalancete(mockBalancete);
      setDre(mockDRE);
      setBalanco(mockBalanco);

      // TODO: Implementar API real
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Plano de Contas
  const createPlanoContas = async (data: Partial<PlanoContas>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/plano-contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar conta no plano de contas');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const updatePlanoContas = async (id: string, data: Partial<PlanoContas>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/plano-contas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar conta no plano de contas');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const deletePlanoContas = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/plano-contas/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar conta do plano de contas');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  // Lançamentos Contábeis
  const createLancamento = async (data: Partial<LancamentoContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/lancamentos-contabeis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar lançamento contábil');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const updateLancamento = async (id: string, data: Partial<LancamentoContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/lancamentos-contabeis/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar lançamento contábil');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const deleteLancamento = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/lancamentos-contabeis/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar lançamento contábil');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const estornarLancamento = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/lancamentos-contabeis/estornar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          lancamento_id: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao estornar lançamento contábil');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };


  // Rateios
  const createRateio = async (data: Partial<RateioContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/rateios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar rateio');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const updateRateio = async (id: string, data: Partial<RateioContabil>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/rateios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar rateio');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const deleteRateio = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/rateios/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar rateio');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  // SPED
  const gerarSpedFiscal = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/sped-fiscal/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          periodo: periodo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar SPED Fiscal');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const gerarSpedContabil = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/sped-contabil/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          periodo: periodo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar SPED Contábil');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const validarSped = async (id: string, tipo: 'fiscal' | 'contabil') => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/sped-${tipo}/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          sped_id: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao validar SPED');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  // Relatórios
  const gerarBalancete = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/balancete/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          periodo: periodo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar balancete');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const gerarDRE = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/dre/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          periodo: periodo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar DRE');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  const gerarBalanco = async (periodo: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/balanco/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          periodo: periodo,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar balanço patrimonial');
      }

      await loadContabilidade();
    } catch (err) {
      throw err;
    }
  };

  // Recarregar dados
  const refresh = async () => {
    await loadContabilidade();
  };

  // Carregar dados quando a empresa mudar
  useEffect(() => {
    loadContabilidade();
  }, [selectedCompany?.id]);

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
