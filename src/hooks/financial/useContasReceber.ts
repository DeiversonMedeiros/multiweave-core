// =====================================================
// HOOK: USAR CONTAS A RECEBER
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar contas a receber
// Autor: Sistema MultiWeave Core

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuthorization } from '@/hooks/useAuthorization';
import { ContaReceber, ContaReceberFormData, ContaReceberFilters } from '@/integrations/supabase/financial-types';

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
  const { checkModulePermission, checkEntityPermission } = useAuthorization();
  
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContaReceberFilters>({});

  // Verificar permissões
  const canCreate = checkModulePermission('financeiro', 'create') && checkEntityPermission('contas_receber', 'create');
  const canEdit = checkModulePermission('financeiro', 'edit') && checkEntityPermission('contas_receber', 'edit');
  const canDelete = checkModulePermission('financeiro', 'delete') && checkEntityPermission('contas_receber', 'delete');
  const canConfirm = checkModulePermission('financeiro', 'edit') && checkEntityPermission('contas_receber', 'edit');

  // Carregar contas a receber
  const loadContasReceber = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Dados mockados temporariamente até implementar a API
      const mockData: ContaReceber[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          numero_titulo: 'REC-001',
          cliente_id: '1',
          cliente_nome: 'Cliente ABC Ltda',
          cliente_cnpj: '12.345.678/0001-90',
          descricao: 'Venda de produtos - Material industrial',
          valor_original: 2500.00,
          valor_atual: 2500.00,
          data_emissao: '2025-01-15',
          data_vencimento: '2025-01-20',
          centro_custo_id: '1',
          projeto_id: '1',
          departamento: 'Vendas',
          classe_financeira: 'Receita Operacional',
          categoria: 'Venda de Produtos',
          status: 'pendente',
          forma_recebimento: 'Boleto',
          conta_bancaria_id: '1',
          observacoes: 'Venda de produtos',
          anexos: [],
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          company_id: selectedCompany.id,
          numero_titulo: 'REC-002',
          cliente_id: '2',
          cliente_nome: 'Empresa XYZ S/A',
          cliente_cnpj: '98.765.432/0001-10',
          descricao: 'Serviços de consultoria prestados',
          valor_original: 1800.00,
          valor_atual: 1800.00,
          data_emissao: '2025-01-18',
          data_vencimento: '2025-01-25',
          centro_custo_id: '2',
          projeto_id: '2',
          departamento: 'Técnico',
          classe_financeira: 'Receita Operacional',
          categoria: 'Serviços',
          status: 'pendente',
          forma_recebimento: 'Transferência',
          conta_bancaria_id: '1',
          observacoes: 'Serviços prestados',
          anexos: [],
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          company_id: selectedCompany.id,
          numero_titulo: 'REC-003',
          cliente_id: '3',
          cliente_nome: 'Consultoria ABC Ltda',
          cliente_cnpj: '11.222.333/0001-44',
          descricao: 'Consultoria técnica especializada',
          valor_original: 1200.00,
          valor_atual: 0.00,
          data_emissao: '2025-01-05',
          data_vencimento: '2025-01-10',
          data_recebimento: '2025-01-10',
          centro_custo_id: '1',
          projeto_id: '1',
          departamento: 'Técnico',
          classe_financeira: 'Receita Operacional',
          categoria: 'Serviços',
          status: 'recebido',
          forma_recebimento: 'PIX',
          conta_bancaria_id: '1',
          observacoes: 'Consultoria técnica',
          anexos: [],
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContasReceber(mockData);

      // TODO: Implementar API real
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Criar conta a receber
  const createContaReceber = async (data: ContaReceberFormData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-receber', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar conta a receber');
      }

      await loadContasReceber();
    } catch (err) {
      throw err;
    }
  };

  // Atualizar conta a receber
  const updateContaReceber = async (id: string, data: Partial<ContaReceberFormData>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/contas-receber/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar conta a receber');
      }

      await loadContasReceber();
    } catch (err) {
      throw err;
    }
  };

  // Deletar conta a receber
  const deleteContaReceber = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/contas-receber/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar conta a receber');
      }

      await loadContasReceber();
    } catch (err) {
      throw err;
    }
  };

  // Confirmar conta a receber
  const confirmContaReceber = async (id: string, observacoes?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-receber/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          conta_receber_id: id,
          observacoes,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao confirmar conta a receber');
      }

      await loadContasReceber();
    } catch (err) {
      throw err;
    }
  };

  // Receber conta a receber
  const receiveContaReceber = async (id: string, dataRecebimento: string, valorRecebido: number) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-receber/receive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          conta_receber_id: id,
          data_recebimento: dataRecebimento,
          valor_recebido: valorRecebido,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar recebimento');
      }

      await loadContasReceber();
    } catch (err) {
      throw err;
    }
  };

  // Recarregar dados
  const refresh = async () => {
    await loadContasReceber();
  };

  // Carregar dados quando a empresa ou filtros mudarem
  useEffect(() => {
    loadContasReceber();
  }, [selectedCompany?.id, filters]);

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

