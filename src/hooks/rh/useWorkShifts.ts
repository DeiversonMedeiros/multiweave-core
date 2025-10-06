// =====================================================
// HOOK PARA TURNOS DE TRABALHO (WORK SHIFTS)
// =====================================================

import { useState, useEffect } from 'react';
import { 
  getWorkShifts, 
  getWorkShiftById, 
  createWorkShift, 
  updateWorkShift, 
  deleteWorkShift,
  getActiveWorkShifts,
  getWorkShiftsByType,
  WorkShiftFilters 
} from '@/services/rh/workShiftsService';
import { WorkShift } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useWorkShifts(companyId: string, filters: WorkShiftFilters = {}) {
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkShifts = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getWorkShifts(companyId, filters);
      setWorkShifts(result.data);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Erro ao buscar turnos de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkShifts();
  }, [companyId, JSON.stringify(filters)]);

  const refetch = () => {
    fetchWorkShifts();
  };

  return {
    workShifts,
    totalCount,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA TURNO ESPECÍFICO
// =====================================================

export function useWorkShift(id: string, companyId: string) {
  const [workShift, setWorkShift] = useState<WorkShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkShift = async () => {
    if (!id || !companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getWorkShiftById(id, companyId);
      setWorkShift(result);
    } catch (err) {
      console.error('Erro ao buscar turno de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkShift();
  }, [id, companyId]);

  const refetch = () => {
    fetchWorkShift();
  };

  return {
    workShift,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA MUTAÇÕES
// =====================================================

export function useWorkShiftMutations(companyId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = async (data: Parameters<typeof createWorkShift>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await createWorkShift(data);
      return result;
    } catch (err) {
      console.error('Erro ao criar turno de trabalho:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMutation = async (data: Parameters<typeof updateWorkShift>[0]) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await updateWorkShift(data);
      return result;
    } catch (err) {
      console.error('Erro ao atualizar turno de trabalho:', err);
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
      await deleteWorkShift(id, companyId);
    } catch (err) {
      console.error('Erro ao excluir turno de trabalho:', err);
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
// HOOK PARA TURNOS ATIVOS
// =====================================================

export function useActiveWorkShifts(companyId: string) {
  const [activeWorkShifts, setActiveWorkShifts] = useState<WorkShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveWorkShifts = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getActiveWorkShifts(companyId);
      setActiveWorkShifts(result);
    } catch (err) {
      console.error('Erro ao buscar turnos ativos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveWorkShifts();
  }, [companyId]);

  const refetch = () => {
    fetchActiveWorkShifts();
  };

  return {
    activeWorkShifts,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA TURNOS POR TIPO
// =====================================================

export function useWorkShiftsByType(companyId: string, tipoTurno: string) {
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkShiftsByType = async () => {
    if (!companyId || !tipoTurno) return;

    try {
      setIsLoading(true);
      setError(null);
      const result = await getWorkShiftsByType(companyId, tipoTurno);
      setWorkShifts(result);
    } catch (err) {
      console.error('Erro ao buscar turnos por tipo:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkShiftsByType();
  }, [companyId, tipoTurno]);

  const refetch = () => {
    fetchWorkShiftsByType();
  };

  return {
    workShifts,
    isLoading,
    error,
    refetch,
  };
}

// =====================================================
// HOOK PARA ESTATÍSTICAS
// =====================================================

export function useWorkShiftStats(companyId: string) {
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    por_tipo: {} as Record<string, number>,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const { data: allWorkShifts } = await getWorkShifts(companyId);
      
      const stats = {
        total: allWorkShifts.length,
        ativos: allWorkShifts.filter(ws => ws.status === 'ativo').length,
        inativos: allWorkShifts.filter(ws => ws.status === 'inativo').length,
        por_tipo: allWorkShifts.reduce((acc, ws) => {
          acc[ws.tipo_turno] = (acc[ws.tipo_turno] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      setStats(stats);
    } catch (err) {
      console.error('Erro ao buscar estatísticas de turnos:', err);
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

