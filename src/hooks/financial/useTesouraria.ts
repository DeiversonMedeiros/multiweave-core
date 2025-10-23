// =====================================================
// HOOK: USAR TESOURARIA
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar tesouraria e conciliação bancária
// Autor: Sistema MultiWeave Core

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuthorization } from '@/hooks/useAuthorization';
import { ContaBancaria, FluxoCaixa, ConciliacaoBancaria } from '@/integrations/supabase/financial-types';

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
  const { checkModulePermission, checkEntityPermission } = useAuthorization();
  
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixa[]>([]);
  const [conciliacoes, setConciliacoes] = useState<ConciliacaoBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar permissões
  const canCreate = checkModulePermission('financeiro', 'create') && checkEntityPermission('contas_bancarias', 'create');
  const canEdit = checkModulePermission('financeiro', 'edit') && checkEntityPermission('contas_bancarias', 'edit');
  const canDelete = checkModulePermission('financeiro', 'delete') && checkEntityPermission('contas_bancarias', 'delete');
  const canProcess = checkModulePermission('financeiro', 'edit') && checkEntityPermission('conciliacoes_bancarias', 'create');

  // Carregar dados da tesouraria
  const loadTesouraria = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Dados mockados temporariamente até implementar a API
      const mockContas: ContaBancaria[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          banco: 'Banco do Brasil',
          agencia: '1234',
          conta: '12345-6',
          tipo_conta: 'corrente',
          saldo_atual: 15000.00,
          saldo_conciliado: 14800.00,
          ativa: true,
          observacoes: 'Conta principal da empresa',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          company_id: selectedCompany.id,
          banco: 'Bradesco',
          agencia: '5678',
          conta: '98765-4',
          tipo_conta: 'poupanca',
          saldo_atual: 5000.00,
          saldo_conciliado: 5000.00,
          ativa: true,
          observacoes: 'Conta poupança para reservas',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockFluxo: FluxoCaixa[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          conta_bancaria_id: '1',
          data_projecao: '2025-01-20',
          tipo_movimento: 'entrada',
          valor: 5000.00,
          descricao: 'Recebimento de cliente',
          categoria: 'vendas',
          status: 'confirmado',
          data_confirmacao: '2025-01-20',
          observacoes: 'Recebimento confirmado',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          company_id: selectedCompany.id,
          conta_bancaria_id: '1',
          data_projecao: '2025-01-21',
          tipo_movimento: 'saida',
          valor: 2000.00,
          descricao: 'Pagamento de fornecedor',
          categoria: 'compras',
          status: 'confirmado',
          data_confirmacao: '2025-01-21',
          observacoes: 'Pagamento confirmado',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockConciliacoes: ConciliacaoBancaria[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          conta_bancaria_id: '1',
          data_inicio: '2025-01-01',
          data_fim: '2025-01-31',
          saldo_inicial: 10000.00,
          saldo_final: 15000.00,
          total_entradas: 8000.00,
          total_saidas: 3000.00,
          status: 'concluida',
          observacoes: 'Conciliação mensal',
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContasBancarias(mockContas);
      setFluxoCaixa(mockFluxo);
      setConciliacoes(mockConciliacoes);

      // TODO: Implementar API real
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Criar conta bancária
  const createContaBancaria = async (data: Partial<ContaBancaria>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-bancarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar conta bancária');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Atualizar conta bancária
  const updateContaBancaria = async (id: string, data: Partial<ContaBancaria>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/contas-bancarias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar conta bancária');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Deletar conta bancária
  const deleteContaBancaria = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/contas-bancarias/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar conta bancária');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Criar fluxo de caixa
  const createFluxoCaixa = async (data: Partial<FluxoCaixa>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/fluxo-caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar fluxo de caixa');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Atualizar fluxo de caixa
  const updateFluxoCaixa = async (id: string, data: Partial<FluxoCaixa>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/fluxo-caixa/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar fluxo de caixa');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Deletar fluxo de caixa
  const deleteFluxoCaixa = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/fluxo-caixa/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar fluxo de caixa');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Processar conciliação bancária
  const processarConciliacao = async (contaId: string, dataInicio: string, dataFim: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/conciliacoes/processar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          conta_id: contaId,
          data_inicio: dataInicio,
          data_fim: dataFim,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar conciliação');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Importar extrato bancário
  const importarExtrato = async (contaId: string, arquivo: File) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const formData = new FormData();
      formData.append('conta_id', contaId);
      formData.append('arquivo', arquivo);
      formData.append('company_id', selectedCompany.id);

      const response = await fetch('/api/financial/conciliacoes/importar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao importar extrato');
      }

      await loadTesouraria();
    } catch (err) {
      throw err;
    }
  };

  // Gerar projeção de fluxo de caixa
  const gerarProjecaoFluxo = async (dias: number) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/fluxo-caixa/projecao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          dias: dias,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar projeção');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Recarregar dados
  const refresh = async () => {
    await loadTesouraria();
  };

  // Carregar dados quando a empresa mudar
  useEffect(() => {
    loadTesouraria();
  }, [selectedCompany?.id]);

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
