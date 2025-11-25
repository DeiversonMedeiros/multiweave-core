// =====================================================
// HOOK PARA FAIXAS INSS
// =====================================================

import { useState, useEffect } from 'react';
import { 
  getInssBrackets, 
  getInssBracketById, 
  createInssBracket, 
  updateInssBracket, 
  deleteInssBracket,
  getActiveInssBrackets,
  getCurrentInssBrackets,
  getInssBracketsByPeriod,
  InssBracketFilters 
} from '@/services/rh/inssBracketsService';
import { InssBracket } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useInssBrackets(companyId: string, filters: InssBracketFilters = {}) {
  const [brackets, setBrackets] = useState<InssBracket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrackets = async () => {
    console.log('🔍 [useInssBrackets] Buscando faixas INSS:', { companyId, filters });
    
    if (!companyId) {
      console.warn('⚠️ [useInssBrackets] companyId não fornecido');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await getInssBrackets(companyId, filters);
      
      console.log('✅ [useInssBrackets] Resultado recebido:', {
        hasData: !!result.data,
        dataLength: result.data?.length || 0,
        totalCount: result.totalCount
      });
      
      if (result.data && result.data.length > 0) {
        console.log('📊 [useInssBrackets] Primeiras faixas:', result.data.slice(0, 2).map(b => ({
          id: b.id,
          codigo: b.codigo,
          descricao: b.descricao,
          company_id: b.company_id
        })));
      } else {
        console.warn('⚠️ [useInssBrackets] Nenhuma faixa encontrada para companyId:', companyId);
        console.warn('⚠️ [useInssBrackets] result completo:', {
          hasData: !!result.data,
          dataType: typeof result.data,
          isArray: Array.isArray(result.data),
          dataLength: result.data?.length,
          totalCount: result.totalCount,
          resultKeys: Object.keys(result)
        });
      }
      
      console.log('🔄 [useInssBrackets] Atualizando estado:', {
        dataLength: result.data?.length || 0,
        totalCount: result.totalCount,
        firstItem: result.data?.[0] ? { id: result.data[0].id, codigo: result.data[0].codigo } : null
      });
      
      setBrackets(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('❌ [useInssBrackets] Erro na busca:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrackets();
  }, [companyId, JSON.stringify(filters)]);

  const refetch = () => {
    fetchBrackets();
  };

  return {
    brackets,
    totalCount,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA FAIXA ESPECÍFICA
// =====================================================

export function useInssBracket(id: string, companyId: string) {
  const [bracket, setBracket] = useState<InssBracket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBracket = async () => {
    if (!id || !companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getInssBracketById(id, companyId);
      setBracket(result);
    } catch (err) {
      console.error('Erro ao buscar faixa INSS:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBracket();
  }, [id, companyId]);

  const refetch = () => {
    fetchBracket();
  };

  return {
    bracket,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA MUTAÇÕES
// =====================================================

export function useInssBracketMutations(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = async (data: Parameters<typeof createInssBracket>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await createInssBracket(data);
      return result;
    } catch (err) {
      console.error('Erro ao criar faixa INSS:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMutation = async (data: Parameters<typeof updateInssBracket>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await updateInssBracket(data);
      return result;
    } catch (err) {
      console.error('Erro ao atualizar faixa INSS:', err);
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
      await deleteInssBracket(id, companyId);
    } catch (err) {
      console.error('Erro ao excluir faixa INSS:', err);
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
// HOOK PARA FAIXAS ATIVAS
// =====================================================

export function useActiveInssBrackets(
  companyId: string, 
  anoVigencia?: number, 
  mesVigencia?: number
) {
  const [activeBrackets, setActiveBrackets] = useState<InssBracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveBrackets = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getActiveInssBrackets(companyId, anoVigencia, mesVigencia);
      setActiveBrackets(result);
    } catch (err) {
      console.error('Erro ao buscar faixas INSS ativas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBrackets();
  }, [companyId, anoVigencia, mesVigencia]);

  const refetch = () => {
    fetchActiveBrackets();
  };

  return {
    activeBrackets,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA FAIXAS ATUAIS
// =====================================================

export function useCurrentInssBrackets(companyId: string) {
  const [currentBrackets, setCurrentBrackets] = useState<InssBracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentBrackets = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getCurrentInssBrackets(companyId);
      setCurrentBrackets(result);
    } catch (err) {
      console.error('Erro ao buscar faixas INSS atuais:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentBrackets();
  }, [companyId]);

  const refetch = () => {
    fetchCurrentBrackets();
  };

  return {
    currentBrackets,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA FAIXAS POR PERÍODO
// =====================================================

export function useInssBracketsByPeriod(
  companyId: string, 
  anoVigencia: number, 
  mesVigencia: number
) {
  const [periodBrackets, setPeriodBrackets] = useState<InssBracket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriodBrackets = async () => {
    if (!companyId || !anoVigencia || !mesVigencia) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getInssBracketsByPeriod(companyId, anoVigencia, mesVigencia);
      setPeriodBrackets(result);
    } catch (err) {
      console.error('Erro ao buscar faixas INSS por período:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodBrackets();
  }, [companyId, anoVigencia, mesVigencia]);

  const refetch = () => {
    fetchPeriodBrackets();
  };

  return {
    periodBrackets,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA ESTATÍSTICAS
// =====================================================

export function useInssBracketStats(companyId: string) {
  const [stats, setStats] = useState({
    total: 0,
    ativas: 0,
    inativas: 0,
    por_ano: {} as Record<string, number>,
    por_mes: {} as Record<string, number>,
    aliquota_media: 0,
    valor_medio_deducao: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: allBrackets } = await getInssBrackets(companyId);
      
      const stats = {
        total: allBrackets.length,
        ativas: allBrackets.filter(b => b.ativo).length,
        inativas: allBrackets.filter(b => !b.ativo).length,
        por_ano: allBrackets.reduce((acc, b) => {
          acc[b.ano_vigencia.toString()] = (acc[b.ano_vigencia.toString()] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        por_mes: allBrackets.reduce((acc, b) => {
          acc[b.mes_vigencia.toString()] = (acc[b.mes_vigencia.toString()] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        aliquota_media: allBrackets.length > 0 
          ? allBrackets.reduce((sum, b) => sum + b.aliquota, 0) / allBrackets.length 
          : 0,
        valor_medio_deducao: allBrackets.length > 0 
          ? allBrackets.reduce((sum, b) => sum + b.valor_deducao, 0) / allBrackets.length 
          : 0,
      };

      setStats(stats);
    } catch (err) {
      console.error('Erro ao buscar estatísticas de faixas INSS:', err);
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

// =====================================================
// HOOK PARA CÁLCULOS
// =====================================================

export function useInssCalculation(companyId: string) {
  const [calculationResult, setCalculationResult] = useState<{
    valor: number;
    aliquota: number;
    faixa: InssBracket | null;
    base_calculo: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateInss = async (salary: number, anoVigencia?: number, mesVigencia?: number) => {
    if (!companyId || salary <= 0) return;

    try {
      setIsLoading(true);
      setError(null);
      
      let brackets: InssBracket[];
      
      if (anoVigencia && mesVigencia) {
        brackets = await getInssBracketsByPeriod(companyId, anoVigencia, mesVigencia);
      } else {
        brackets = await getCurrentInssBrackets(companyId);
      }

      // Importar função de cálculo
      const { calculateInssValue } = await import('@/services/rh/inssBracketsService');
      const result = calculateInssValue(salary, brackets);
      
      setCalculationResult(result);
    } catch (err) {
      console.error('Erro ao calcular INSS:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    calculationResult,
    calculateInss,
    isLoading,
    error,
  };
}
