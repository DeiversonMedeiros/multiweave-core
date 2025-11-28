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
import { supabase } from '@/integrations/supabase/client';
import { calculateDueDateStatus } from '@/utils/financial/dueDateUtils';

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
  reprovarContaPagar: (id: string, observacoes?: string) => Promise<void>;
  suspenderContaPagar: (id: string, observacoes?: string) => Promise<void>;
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

      // Chamar função RPC para buscar contas a pagar com status de aprovação
      // Nota: Funções RPC são chamadas sem o schema, mas precisam estar no schema public ou ter GRANT apropriado
      console.log('🔍 [useContasPagar] Chamando RPC list_contas_pagar_with_approval_status com:', {
        p_company_id: selectedCompany.id
      });

      const { data, error: rpcError } = await supabase.rpc(
        'list_contas_pagar_with_approval_status',
        {
          p_company_id: selectedCompany.id
        }
      );

      console.log('📥 [useContasPagar] Resposta RPC:', {
        hasData: !!data,
        dataLength: Array.isArray(data) ? data.length : 'N/A',
        hasError: !!rpcError,
        error: rpcError ? {
          message: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint
        } : null
      });

      if (rpcError) {
        console.error('❌ [useContasPagar] Erro completo da RPC:', rpcError);
        throw new Error(`Erro ao carregar contas a pagar: ${rpcError.message}${rpcError.details ? ` - ${rpcError.details}` : ''}${rpcError.hint ? ` (${rpcError.hint})` : ''}`);
      }

      if (!data) {
        setContasPagar([]);
        return;
      }

      // Aplicar filtros nos dados retornados
      let filteredData = data as ContaPagar[];
      
      // Filtrar por data de vencimento (início)
      if (filters.data_vencimento_inicio) {
        const dataInicio = new Date(filters.data_vencimento_inicio);
        filteredData = filteredData.filter(conta => {
          const dataVencimento = new Date(conta.data_vencimento);
          return dataVencimento >= dataInicio;
        });
      }
      
      // Filtrar por data de vencimento (fim)
      if (filters.data_vencimento_fim) {
        const dataFim = new Date(filters.data_vencimento_fim);
        filteredData = filteredData.filter(conta => {
          const dataVencimento = new Date(conta.data_vencimento);
          return dataVencimento <= dataFim;
        });
      }
      
      // Filtrar por status
      if (filters.status) {
        filteredData = filteredData.filter(conta => conta.status === filters.status);
      }
      
      // Filtrar por fornecedor
      if (filters.fornecedor_nome) {
        filteredData = filteredData.filter(conta => 
          conta.fornecedor_nome?.toLowerCase().includes(filters.fornecedor_nome!.toLowerCase())
        );
      }
      
      // Filtrar por valor mínimo
      if (filters.valor_minimo !== undefined) {
        filteredData = filteredData.filter(conta => conta.valor_atual >= filters.valor_minimo!);
      }
      
      // Filtrar por valor máximo
      if (filters.valor_maximo !== undefined) {
        filteredData = filteredData.filter(conta => conta.valor_atual <= filters.valor_maximo!);
      }
      
      // Filtrar por centro de custo
      if (filters.centro_custo_id) {
        filteredData = filteredData.filter(conta => conta.centro_custo_id === filters.centro_custo_id);
      }
      
      // Filtrar por departamento
      if (filters.departamento) {
        filteredData = filteredData.filter(conta => 
          conta.departamento?.toLowerCase().includes(filters.departamento!.toLowerCase())
        );
      }
      
      // Filtrar por classe financeira
      if (filters.classe_financeira) {
        filteredData = filteredData.filter(conta => 
          conta.classe_financeira?.toLowerCase().includes(filters.classe_financeira!.toLowerCase())
        );
      }
      
      // Filtrar por número do título
      if (filters.numero_titulo) {
        filteredData = filteredData.filter(conta => 
          conta.numero_titulo?.toLowerCase().includes(filters.numero_titulo!.toLowerCase())
        );
      }
      
      // Filtrar por CNPJ do fornecedor
      if (filters.fornecedor_cnpj) {
        filteredData = filteredData.filter(conta => 
          conta.fornecedor_cnpj?.toLowerCase().includes(filters.fornecedor_cnpj!.toLowerCase())
        );
      }
      
      // Filtrar por categoria
      if (filters.categoria) {
        filteredData = filteredData.filter(conta => 
          conta.categoria?.toLowerCase().includes(filters.categoria!.toLowerCase())
        );
      }
      
      // Filtrar por forma de pagamento
      if (filters.forma_pagamento) {
        filteredData = filteredData.filter(conta => 
          conta.forma_pagamento?.toLowerCase().includes(filters.forma_pagamento!.toLowerCase())
        );
      }
      
      // Filtrar por projeto
      if (filters.projeto_id) {
        filteredData = filteredData.filter(conta => conta.projeto_id === filters.projeto_id);
      }
      
      // Filtrar por conta bancária
      if (filters.conta_bancaria_id) {
        filteredData = filteredData.filter(conta => conta.conta_bancaria_id === filters.conta_bancaria_id);
      }
      
      // Filtrar por data de emissão (início)
      if (filters.data_emissao_inicio) {
        const dataInicio = new Date(filters.data_emissao_inicio);
        filteredData = filteredData.filter(conta => {
          if (!conta.data_emissao) return false;
          const dataEmissao = new Date(conta.data_emissao);
          return dataEmissao >= dataInicio;
        });
      }
      
      // Filtrar por data de emissão (fim)
      if (filters.data_emissao_fim) {
        const dataFim = new Date(filters.data_emissao_fim);
        filteredData = filteredData.filter(conta => {
          if (!conta.data_emissao) return false;
          const dataEmissao = new Date(conta.data_emissao);
          return dataEmissao <= dataFim;
        });
      }
      
      // Filtrar por data de pagamento (início)
      if (filters.data_pagamento_inicio) {
        const dataInicio = new Date(filters.data_pagamento_inicio);
        filteredData = filteredData.filter(conta => {
          if (!conta.data_pagamento) return false;
          const dataPagamento = new Date(conta.data_pagamento);
          return dataPagamento >= dataInicio;
        });
      }
      
      // Filtrar por data de pagamento (fim)
      if (filters.data_pagamento_fim) {
        const dataFim = new Date(filters.data_pagamento_fim);
        filteredData = filteredData.filter(conta => {
          if (!conta.data_pagamento) return false;
          const dataPagamento = new Date(conta.data_pagamento);
          return dataPagamento <= dataFim;
        });
      }
      
      // Filtrar por parcelada
      if (filters.is_parcelada !== undefined) {
        filteredData = filteredData.filter(conta => conta.is_parcelada === filters.is_parcelada);
      }
      
      // Calcular status de vencimento para cada conta
      const diasAlerta = filters.dias_alerta || 7;
      const contasComAlerta = filteredData.map(conta => {
        const dueDateStatus = calculateDueDateStatus(
          conta.data_vencimento,
          conta.status,
          conta.data_pagamento,
          diasAlerta
        );
        
        return {
          ...conta,
          dias_ate_vencimento: dueDateStatus.dias_ate_vencimento,
          tipo_alerta: dueDateStatus.tipo_alerta,
          esta_vencida: dueDateStatus.esta_vencida,
          esta_proxima_vencer: dueDateStatus.esta_proxima_vencer,
        };
      });
      
      // Aplicar filtros de vencimento
      let contasFiltradas = contasComAlerta;
      
      if (filters.apenas_vencidas) {
        contasFiltradas = contasFiltradas.filter(conta => conta.esta_vencida);
      }
      
      if (filters.apenas_proximas_vencer) {
        contasFiltradas = contasFiltradas.filter(conta => conta.esta_proxima_vencer || conta.esta_vencida);
      }
      
      setContasPagar(contasFiltradas);
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

  // Reprovar conta a pagar (resetar aprovações e voltar para primeira etapa)
  const reprovarContaPagar = async (id: string, observacoes?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('reprovar_conta_pagar', {
        p_conta_pagar_id: id,
        p_company_id: selectedCompany.id,
        p_reprovado_por: user.id,
        p_observacoes: observacoes || null,
      });

      if (error) {
        console.error('Erro ao reprovar conta a pagar:', error);
        throw new Error(`Erro ao reprovar conta a pagar: ${error.message}`);
      }

      await loadContasPagar();
    } catch (err) {
      throw err;
    }
  };

  // Suspender conta a pagar (cancelar e finalizar processo)
  const suspenderContaPagar = async (id: string, observacoes?: string) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc('suspender_conta_pagar', {
        p_conta_pagar_id: id,
        p_company_id: selectedCompany.id,
        p_suspenso_por: user.id,
        p_observacoes: observacoes || null,
      });

      if (error) {
        console.error('Erro ao suspender conta a pagar:', error);
        throw new Error(`Erro ao suspender conta a pagar: ${error.message}`);
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
    reprovarContaPagar,
    suspenderContaPagar,
    payContaPagar,
    refresh,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
  };
}

