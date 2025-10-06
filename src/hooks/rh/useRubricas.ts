// =====================================================
// HOOK PARA RUBRICAS
// =====================================================

import { useState, useEffect } from 'react';
import { 
  getRubricas, 
  getRubricaById, 
  createRubrica, 
  updateRubrica, 
  deleteRubrica,
  getActiveRubricas,
  getRubricasByType,
  getRubricasByCategoria,
  RubricaFilters 
} from '@/services/rh/rubricasService';
import { Rubrica } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useRubricas(companyId: string, filters: RubricaFilters = {}) {
  const [rubricas, setRubricas] = useState<Rubrica[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRubricas = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getRubricas(companyId, filters);
      setRubricas(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Erro ao buscar rubricas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRubricas();
  }, [companyId, JSON.stringify(filters)]);

  const refetch = () => {
    fetchRubricas();
  };

  return {
    rubricas,
    totalCount,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA RUBRICA ESPECÍFICA
// =====================================================

export function useRubrica(id: string, companyId: string) {
  const [rubrica, setRubrica] = useState<Rubrica | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRubrica = async () => {
    if (!id || !companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getRubricaById(id, companyId);
      setRubrica(result);
    } catch (err) {
      console.error('Erro ao buscar rubrica:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRubrica();
  }, [id, companyId]);

  const refetch = () => {
    fetchRubrica();
  };

  return {
    rubrica,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA MUTAÇÕES
// =====================================================

export function useRubricaMutations(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = async (data: Parameters<typeof createRubrica>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await createRubrica(data);
      return result;
    } catch (err) {
      console.error('Erro ao criar rubrica:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMutation = async (data: Parameters<typeof updateRubrica>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await updateRubrica(data);
      return result;
    } catch (err) {
      console.error('Erro ao atualizar rubrica:', err);
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
      await deleteRubrica(id, companyId);
    } catch (err) {
      console.error('Erro ao excluir rubrica:', err);
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
    isLoading,
    error,
  };
}

// =====================================================
// HOOK PARA RUBRICAS ATIVAS
// =====================================================

export function useActiveRubricas(companyId: string) {
  const [activeRubricas, setActiveRubricas] = useState<Rubrica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveRubricas = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getActiveRubricas(companyId);
      setActiveRubricas(result);
    } catch (err) {
      console.error('Erro ao buscar rubricas ativas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRubricas();
  }, [companyId]);

  const refetch = () => {
    fetchActiveRubricas();
  };

  return {
    activeRubricas,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA RUBRICAS POR TIPO
// =====================================================

export function useRubricasByType(companyId: string, tipo: string) {
  const [rubricas, setRubricas] = useState<Rubrica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRubricasByType = async () => {
    if (!companyId || !tipo) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getRubricasByType(companyId, tipo);
      setRubricas(result);
    } catch (err) {
      console.error('Erro ao buscar rubricas por tipo:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRubricasByType();
  }, [companyId, tipo]);

  const refetch = () => {
    fetchRubricasByType();
  };

  return {
    rubricas,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA RUBRICAS POR CATEGORIA
// =====================================================

export function useRubricasByCategoria(companyId: string, categoria: string) {
  const [rubricas, setRubricas] = useState<Rubrica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRubricasByCategoria = async () => {
    if (!companyId || !categoria) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getRubricasByCategoria(companyId, categoria);
      setRubricas(result);
    } catch (err) {
      console.error('Erro ao buscar rubricas por categoria:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRubricasByCategoria();
  }, [companyId, categoria]);

  const refetch = () => {
    fetchRubricasByCategoria();
  };

  return {
    rubricas,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA ESTATÍSTICAS
// =====================================================

export function useRubricaStats(companyId: string) {
  const [stats, setStats] = useState({
    total: 0,
    ativas: 0,
    inativas: 0,
    por_tipo: {} as Record<string, number>,
    por_natureza: {} as Record<string, number>,
    por_categoria: {} as Record<string, number>,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: allRubricas } = await getRubricas(companyId);
      
      const stats = {
        total: allRubricas.length,
        ativas: allRubricas.filter(r => r.ativo).length,
        inativas: allRubricas.filter(r => !r.ativo).length,
        por_tipo: allRubricas.reduce((acc, r) => {
          acc[r.tipo] = (acc[r.tipo] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        por_natureza: allRubricas.reduce((acc, r) => {
          acc[r.natureza] = (acc[r.natureza] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        por_categoria: allRubricas.reduce((acc, r) => {
          const categoria = r.categoria || 'Sem categoria';
          acc[categoria] = (acc[categoria] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      setStats(stats);
    } catch (err) {
      console.error('Erro ao buscar estatísticas de rubricas:', err);
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

