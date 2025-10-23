// =====================================================
// HOOK: USAR CONTAS A PAGAR
// =====================================================
// Data: 2025-01-15
// Descrição: Hook para gerenciar contas a pagar
// Autor: Sistema MultiWeave Core

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuthorization } from '@/hooks/useAuthorization';
import { ContaPagar, ContaPagarFormData, ContaPagarFilters } from '@/integrations/supabase/financial-types';

interface UseContasPagarReturn {
  contasPagar: ContaPagar[];
  loading: boolean;
  error: string | null;
  filters: ContaPagarFilters;
  setFilters: (filters: ContaPagarFilters) => void;
  createContaPagar: (data: ContaPagarFormData) => Promise<void>;
  updateContaPagar: (id: string, data: Partial<ContaPagarFormData>) => Promise<void>;
  deleteContaPagar: (id: string) => Promise<void>;
  approveContaPagar: (id: string, observacoes?: string) => Promise<void>;
  rejectContaPagar: (id: string, observacoes?: string) => Promise<void>;
  payContaPagar: (id: string, dataPagamento: string, valorPago: number) => Promise<void>;
  refresh: () => Promise<void>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export function useContasPagar(): UseContasPagarReturn {
  const { selectedCompany } = useCompany();
  const { checkModulePermission, checkEntityPermission } = useAuthorization();
  
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContaPagarFilters>({});

  // Verificar permissões
  const canCreate = checkModulePermission('financeiro', 'create') && checkEntityPermission('contas_pagar', 'create');
  const canEdit = checkModulePermission('financeiro', 'edit') && checkEntityPermission('contas_pagar', 'edit');
  const canDelete = checkModulePermission('financeiro', 'delete') && checkEntityPermission('contas_pagar', 'delete');
  const canApprove = checkModulePermission('financeiro', 'edit') && checkEntityPermission('aprovacoes', 'edit');

  // Carregar contas a pagar
  const loadContasPagar = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Dados mockados temporariamente até implementar a API
      const mockData: ContaPagar[] = [
        {
          id: '1',
          company_id: selectedCompany.id,
          numero_titulo: 'TIT-001',
          fornecedor_id: '1',
          fornecedor_nome: 'Fornecedor ABC Ltda',
          fornecedor_cnpj: '12.345.678/0001-90',
          descricao: 'Pagamento de fornecedor - Material de escritório',
          valor_original: 1500.00,
          valor_atual: 1500.00,
          data_emissao: '2025-01-15',
          data_vencimento: '2025-01-20',
          centro_custo_id: '1',
          projeto_id: '1',
          departamento: 'Administrativo',
          classe_financeira: 'Despesa Operacional',
          categoria: 'Material de Escritório',
          status: 'pendente',
          forma_pagamento: 'Boleto',
          conta_bancaria_id: '1',
          observacoes: 'Pagamento de fornecedor',
          anexos: [],
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          company_id: selectedCompany.id,
          numero_titulo: 'TIT-002',
          fornecedor_id: '2',
          fornecedor_nome: 'Consultoria XYZ S/A',
          fornecedor_cnpj: '98.765.432/0001-10',
          descricao: 'Serviços de consultoria técnica',
          valor_original: 2500.00,
          valor_atual: 2500.00,
          data_emissao: '2025-01-18',
          data_vencimento: '2025-01-25',
          centro_custo_id: '2',
          projeto_id: '2',
          departamento: 'Técnico',
          classe_financeira: 'Despesa Operacional',
          categoria: 'Serviços',
          status: 'pendente',
          forma_pagamento: 'Transferência',
          conta_bancaria_id: '1',
          observacoes: 'Serviços de consultoria',
          anexos: [],
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          company_id: selectedCompany.id,
          numero_titulo: 'TIT-003',
          fornecedor_id: '3',
          fornecedor_nome: 'Equipamentos ABC Ltda',
          fornecedor_cnpj: '11.222.333/0001-44',
          descricao: 'Material de escritório e suprimentos',
          valor_original: 800.00,
          valor_atual: 0.00,
          data_emissao: '2025-01-05',
          data_vencimento: '2025-01-10',
          data_pagamento: '2025-01-10',
          centro_custo_id: '1',
          projeto_id: '1',
          departamento: 'Administrativo',
          classe_financeira: 'Despesa Operacional',
          categoria: 'Material de Escritório',
          status: 'pago',
          forma_pagamento: 'PIX',
          conta_bancaria_id: '1',
          observacoes: 'Material de escritório',
          anexos: [],
          created_by: 'user1',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContasPagar(mockData);

      // TODO: Implementar API real
      // const response = await fetch('/api/financial/contas-pagar', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     company_id: selectedCompany.id,
      //     filters,
      //   }),
      // });

      // if (!response.ok) {
      //   throw new Error('Erro ao carregar contas a pagar');
      // }

      // const data = await response.json();
      // setContasPagar(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Criar conta a pagar
  const createContaPagar = async (data: ContaPagarFormData) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-pagar', {
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
        throw new Error('Erro ao criar conta a pagar');
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Atualizar conta a pagar
  const updateContaPagar = async (id: string, data: Partial<ContaPagarFormData>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/contas-pagar/${id}`, {
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
        throw new Error('Erro ao atualizar conta a pagar');
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Deletar conta a pagar
  const deleteContaPagar = async (id: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch(`/api/financial/contas-pagar/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar conta a pagar');
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Aprovar conta a pagar
  const approveContaPagar = async (id: string, observacoes?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-pagar/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          conta_pagar_id: id,
          status: 'aprovado',
          observacoes,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao aprovar conta a pagar');
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Rejeitar conta a pagar
  const rejectContaPagar = async (id: string, observacoes?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-pagar/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          conta_pagar_id: id,
          status: 'rejeitado',
          observacoes,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao rejeitar conta a pagar');
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Pagar conta a pagar
  const payContaPagar = async (id: string, dataPagamento: string, valorPago: number) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const response = await fetch('/api/financial/contas-pagar/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          conta_pagar_id: id,
          data_pagamento: dataPagamento,
          valor_pago: valorPago,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar pagamento');
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Recarregar dados
  const refresh = async () => {
    await loadContasPagar();
  };

  // Carregar dados quando a empresa ou filtros mudarem
  useEffect(() => {
    loadContasPagar();
  }, [selectedCompany?.id, filters]);

  return {
    contasPagar,
    loading,
    error,
    filters,
    setFilters,
    createContaPagar,
    updateContaPagar,
    deleteContaPagar,
    approveContaPagar,
    rejectContaPagar,
    payContaPagar,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
  };
}

