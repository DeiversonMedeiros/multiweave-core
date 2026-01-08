import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/company-context';
import { OnlineTrainingService, TrainingContent, TrainingProgress, TrainingExam, TrainingProgressStats, TrainingDashboardStats } from '@/services/rh/onlineTrainingService';

// =====================================================
// HOOK PRINCIPAL DE TREINAMENTOS ONLINE
// =====================================================

export const useOnlineTraining = (trainingId?: string) => {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState<TrainingContent[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [progressStats, setProgressStats] = useState<TrainingProgressStats | null>(null);
  const [exams, setExams] = useState<TrainingExam[]>([]);
  const [dashboardStats, setDashboardStats] = useState<TrainingDashboardStats | null>(null);

  // Carregar conteúdo
  const loadContent = useCallback(async () => {
    if (!selectedCompany?.id || !trainingId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await OnlineTrainingService.listContent(selectedCompany.id, trainingId);
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdo');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId]);

  // Carregar progresso
  const loadProgress = useCallback(async (employeeId: string) => {
    if (!selectedCompany?.id || !trainingId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await OnlineTrainingService.getProgress(selectedCompany.id, trainingId, employeeId);
      setProgress(data);
      
      // Carregar estatísticas
      const stats = await OnlineTrainingService.getProgressStats(selectedCompany.id, trainingId, employeeId);
      setProgressStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar progresso');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId]);

  // Carregar provas
  const loadExams = useCallback(async () => {
    if (!selectedCompany?.id || !trainingId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await OnlineTrainingService.listExams(selectedCompany.id, trainingId);
      setExams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar provas');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId]);

  // Carregar estatísticas do dashboard
  const loadDashboardStats = useCallback(async () => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await OnlineTrainingService.getDashboardStats(selectedCompany.id, trainingId);
      setDashboardStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId]);

  return {
    // Estado
    content,
    progress,
    progressStats,
    exams,
    dashboardStats,
    loading,
    error,

    // Ações
    loadContent,
    loadProgress,
    loadExams,
    loadDashboardStats
  };
};

// =====================================================
// HOOK PARA PROGRESSO DO USUÁRIO
// =====================================================

export const useTrainingProgress = (trainingId: string, employeeId: string) => {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [stats, setStats] = useState<TrainingProgressStats | null>(null);

  const loadProgress = useCallback(async () => {
    if (!selectedCompany?.id || !trainingId || !employeeId) {
      setProgress([]);
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const progressData = await OnlineTrainingService.getProgress(selectedCompany.id, trainingId, employeeId);
      setProgress(progressData);

      const statsData = await OnlineTrainingService.getProgressStats(selectedCompany.id, trainingId, employeeId);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar progresso');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId, employeeId]);

  const updateProgress = useCallback(async (
    contentId: string,
    data: {
      tempo_assistido_segundos?: number;
      ultima_posicao_segundos?: number;
      percentual_concluido?: number;
      concluido?: boolean;
    }
  ) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);
    try {
      await OnlineTrainingService.updateProgress(
        selectedCompany.id,
        trainingId,
        contentId,
        employeeId,
        data
      );
      await loadProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar progresso');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId, employeeId, loadProgress]);

  const markAsCompleted = useCallback(async (contentId: string, tempoAssistidoSegundos: number = 0) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);
    try {
      await OnlineTrainingService.markContentAsCompleted(
        selectedCompany.id,
        trainingId,
        contentId,
        employeeId,
        tempoAssistidoSegundos
      );
      await loadProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar como concluído');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId, employeeId, loadProgress]);

  useEffect(() => {
    if (trainingId && employeeId && selectedCompany?.id) {
      loadProgress();
    }
  }, [loadProgress, trainingId, employeeId, selectedCompany?.id]);

  return {
    progress,
    stats,
    loading,
    error,
    updateProgress,
    markAsCompleted,
    refresh: loadProgress
  };
};

// =====================================================
// HOOK PARA DASHBOARD
// =====================================================

export const useTrainingDashboard = (trainingId?: string) => {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TrainingDashboardStats | null>(null);

  const loadStats = useCallback(async () => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await OnlineTrainingService.getDashboardStats(selectedCompany.id, trainingId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  };
};



