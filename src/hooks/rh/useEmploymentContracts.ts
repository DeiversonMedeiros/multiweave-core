// =====================================================
// HOOK PARA CONTRATOS DE TRABALHO (EMPLOYMENT CONTRACTS)
// =====================================================

import { useState, useEffect } from 'react';
import { 
  getEmploymentContracts, 
  getEmploymentContractById, 
  createEmploymentContract, 
  updateEmploymentContract, 
  deleteEmploymentContract,
  getActiveEmploymentContracts,
  getEmploymentContractsByEmployee,
  terminateEmploymentContract,
  EmploymentContractFilters 
} from '@/services/rh/employmentContractsService';
import { EmploymentContract, EmploymentContractWithEmployee } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useEmploymentContracts(companyId: string, filters: EmploymentContractFilters = {}) {
  const [contracts, setContracts] = useState<EmploymentContractWithEmployee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getEmploymentContracts(companyId, filters);
      setContracts(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Erro ao buscar contratos de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [companyId, JSON.stringify(filters)]);

  const refetch = () => {
    fetchContracts();
  };

  return {
    contracts,
    totalCount,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA CONTRATO ESPECÍFICO
// =====================================================

export function useEmploymentContract(id: string, companyId: string) {
  const [contract, setContract] = useState<EmploymentContractWithEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = async () => {
    if (!id || !companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getEmploymentContractById(id, companyId);
      setContract(result);
    } catch (err) {
      console.error('Erro ao buscar contrato de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [id, companyId]);

  const refetch = () => {
    fetchContract();
  };

  return {
    contract,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA MUTAÇÕES
// =====================================================

export function useEmploymentContractMutations(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = async (data: Parameters<typeof createEmploymentContract>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await createEmploymentContract(data);
      return result;
    } catch (err) {
      console.error('Erro ao criar contrato de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMutation = async (data: Parameters<typeof updateEmploymentContract>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await updateEmploymentContract(data);
      return result;
    } catch (err) {
      console.error('Erro ao atualizar contrato de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMutation = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteEmploymentContract(id, companyId);
    } catch (err) {
      console.error('Erro ao excluir contrato de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const terminateMutation = async (id: string, dataRescisao: string, motivoRescisao: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await terminateEmploymentContract(id, companyId, dataRescisao, motivoRescisao);
      return result;
    } catch (err) {
      console.error('Erro ao encerrar contrato:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    terminateMutation,
    isLoading,
    error,
  };
}

// =====================================================
// HOOK PARA CONTRATOS ATIVOS
// =====================================================

export function useActiveEmploymentContracts(companyId: string) {
  const [activeContracts, setActiveContracts] = useState<EmploymentContractWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveContracts = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getActiveEmploymentContracts(companyId);
      setActiveContracts(result);
    } catch (err) {
      console.error('Erro ao buscar contratos ativos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveContracts();
  }, [companyId]);

  const refetch = () => {
    fetchActiveContracts();
  };

  return {
    activeContracts,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA CONTRATOS POR FUNCIONÁRIO
// =====================================================

export function useEmploymentContractsByEmployee(employeeId: string, companyId: string) {
  const [contracts, setContracts] = useState<EmploymentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractsByEmployee = async () => {
    if (!employeeId || !companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getEmploymentContractsByEmployee(employeeId, companyId);
      setContracts(result);
    } catch (err) {
      console.error('Erro ao buscar contratos do funcionário:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContractsByEmployee();
  }, [employeeId, companyId]);

  const refetch = () => {
    fetchContractsByEmployee();
  };

  return {
    contracts,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA ESTATÍSTICAS
// =====================================================

export function useEmploymentContractStats(companyId: string) {
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    suspensos: 0,
    encerrados: 0,
    rescisoes: 0,
    por_tipo: {} as Record<string, number>,
    por_regime: {} as Record<string, number>,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: allContracts } = await getEmploymentContracts(companyId);
      
      const stats = {
        total: allContracts.length,
        ativos: allContracts.filter(c => c.status === 'ativo').length,
        suspensos: allContracts.filter(c => c.status === 'suspenso').length,
        encerrados: allContracts.filter(c => c.status === 'encerrado').length,
        rescisoes: allContracts.filter(c => c.status === 'rescisao').length,
        por_tipo: allContracts.reduce((acc, c) => {
          acc[c.tipo_contrato] = (acc[c.tipo_contrato] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        por_regime: allContracts.reduce((acc, c) => {
          acc[c.regime_trabalho] = (acc[c.regime_trabalho] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      setStats(stats);
    } catch (err) {
      console.error('Erro ao buscar estatísticas de contratos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [companyId]);

  const refetch = () => {
    fetchStats();
  };

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

