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
    console.log('[useTrainingProgress.loadProgress] INÍCIO', {
      companyId: selectedCompany?.id,
      trainingId,
      employeeId,
      timestamp: new Date().toISOString()
    });

    if (!selectedCompany?.id || !trainingId || !employeeId) {
      console.log('[useTrainingProgress.loadProgress] ABORTADO: parâmetros faltando');
      setProgress([]);
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('[useTrainingProgress.loadProgress] Buscando progresso...');
      const progressData = await OnlineTrainingService.getProgress(selectedCompany.id, trainingId, employeeId);
      console.log('[useTrainingProgress.loadProgress] Progresso recebido', {
        count: progressData.length,
        items: progressData.map(p => ({ content_id: p.content_id, concluido: p.concluido }))
      });
      setProgress(progressData);

      console.log('[useTrainingProgress.loadProgress] Buscando stats...');
      const statsData = await OnlineTrainingService.getProgressStats(selectedCompany.id, trainingId, employeeId);
      console.log('[useTrainingProgress.loadProgress] Stats recebidos', statsData);
      setStats(statsData);
    } catch (err) {
      console.error('[useTrainingProgress.loadProgress] ERRO', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar progresso');
    } finally {
      setLoading(false);
      console.log('[useTrainingProgress.loadProgress] FIM');
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
    console.log('[useTrainingProgress.updateProgress] INÍCIO', {
      contentId,
      data,
      trainingId,
      employeeId,
      timestamp: new Date().toISOString()
    });

    if (!selectedCompany?.id) {
      console.log('[useTrainingProgress.updateProgress] ABORTADO: sem company_id');
      return;
    }

    // Usar uma flag para evitar atualizações durante unmount
    let isMounted = true;

    // Atualizar estado local imediatamente para feedback visual
    // Mas apenas se os dados realmente mudaram para evitar loops
    setProgress(prev => {
      const existingIndex = prev.findIndex(p => p.content_id === contentId);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        // Verificar se realmente precisa atualizar
        const needsUpdate = 
          (data.tempo_assistido_segundos !== undefined && data.tempo_assistido_segundos !== existing.tempo_assistido_segundos) ||
          (data.percentual_concluido !== undefined && Math.abs(data.percentual_concluido - existing.percentual_concluido) > 0.1) ||
          (data.concluido !== undefined && data.concluido !== existing.concluido);
        
        console.log('[useTrainingProgress.updateProgress] Verificação de atualização', {
          needsUpdate,
          existing: {
            tempo_assistido_segundos: existing.tempo_assistido_segundos,
            percentual_concluido: existing.percentual_concluido,
            concluido: existing.concluido
          },
          new: data
        });
        
        if (!needsUpdate && !data.concluido) {
          console.log('[useTrainingProgress.updateProgress] PULANDO: dados não mudaram');
          return prev; // Não atualizar se nada mudou
        }

        console.log('[useTrainingProgress.updateProgress] ATUALIZANDO estado local');
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          ...data,
          data_ultima_atualizacao: new Date().toISOString(),
          status: data.concluido ? 'concluido' : 'em_andamento',
        };
        return updated;
      }
      console.log('[useTrainingProgress.updateProgress] Conteúdo não encontrado no progresso local');
      return prev;
    });

    // Atualizar no backend sem setLoading para não bloquear UI
    try {
      console.log('[useTrainingProgress.updateProgress] Chamando OnlineTrainingService.updateProgress');
      await OnlineTrainingService.updateProgress(
        selectedCompany.id,
        trainingId,
        contentId,
        employeeId,
        data
      );
      console.log('[useTrainingProgress.updateProgress] Backend atualizado com sucesso');
      
      // Atualizar stats localmente se foi marcado como concluído
      // Apenas se ainda estiver montado
      if (isMounted && data.concluido) {
        console.log('[useTrainingProgress.updateProgress] Atualizando stats localmente');
        setStats(prev => {
          if (!prev) return prev;
          const newCompleted = prev.completed_content + 1;
          const newPercent = prev.total_content > 0 
            ? (newCompleted / prev.total_content) * 100 
            : 0;
          return {
            ...prev,
            completed_content: newCompleted,
            progress_percent: Math.min(newPercent, 100)
          };
        });
      }
    } catch (err) {
      console.error('[useTrainingProgress.updateProgress] ERRO', err);
      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar progresso');
      }
      throw err;
    }
    console.log('[useTrainingProgress.updateProgress] FIM');
  }, [selectedCompany?.id, trainingId, employeeId]);

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
      
      // Aguardar um pouco para garantir que o banco de dados processou a atualização
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recarregar progresso para atualizar as estatísticas
      await loadProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar como concluído');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, trainingId, employeeId, loadProgress]);

  useEffect(() => {
    console.log('[useTrainingProgress.useEffect] Executado', {
      trainingId,
      employeeId,
      companyId: selectedCompany?.id,
      timestamp: new Date().toISOString()
    });
    
    if (trainingId && employeeId && selectedCompany?.id) {
      console.log('[useTrainingProgress.useEffect] Chamando loadProgress');
      loadProgress();
    } else {
      console.log('[useTrainingProgress.useEffect] Condições não atendidas, não carregando');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId, employeeId, selectedCompany?.id]);

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



