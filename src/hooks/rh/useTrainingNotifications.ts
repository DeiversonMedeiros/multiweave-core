import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { OnlineTrainingService } from '@/services/rh/onlineTrainingService';

// =====================================================
// HOOK PARA NOTIFICAÇÕES DE TREINAMENTOS OBRIGATÓRIOS
// =====================================================

export interface TrainingNotification {
  trainingId: string;
  trainingName: string;
  deadline?: string;
  progress: number;
  isOverdue: boolean;
  daysRemaining?: number;
}

export const useTrainingNotifications = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const [notifications, setNotifications] = useState<TrainingNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employees = employeesData?.data || [];
  const employee = employees.find((e: any) => e?.user_id === user?.id);
  const employeeId = employee?.id;

  const loadNotifications = useCallback(async () => {
    // Aguardar carregamento dos funcionários
    if (isLoadingEmployees) {
      return;
    }

    if (!selectedCompany?.id || !employeeId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await OnlineTrainingService.getMandatoryTrainingsPending(
        selectedCompany.id,
        employeeId
      );

      // O resultado pode vir como data.result ou diretamente
      const data = (result as any)?.result || result;

      if (data && !data.error && data.pending_trainings) {
        const pendingTrainings = Array.isArray(data.pending_trainings) 
          ? data.pending_trainings 
          : [];

        const notificationsData: TrainingNotification[] = pendingTrainings.map((training: any) => {
          const deadline = training.deadline ? new Date(training.deadline) : null;
          const now = new Date();
          const isOverdue = deadline ? deadline < now : false;
          const daysRemaining = deadline
            ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          return {
            trainingId: String(training.training_id || ''),
            trainingName: String(training.training_name || ''),
            deadline: training.deadline ? String(training.deadline) : undefined,
            progress: parseFloat(String(training.progress || '0')) || 0,
            isOverdue,
            daysRemaining
          };
        });

        setNotifications(notificationsData);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, employeeId, isLoadingEmployees]);

  useEffect(() => {
    if (isLoadingEmployees) {
      return;
    }

    loadNotifications();
    
    // Recarregar a cada 5 minutos
    const interval = setInterval(() => {
      if (!isLoadingEmployees) {
        loadNotifications();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [loadNotifications, isLoadingEmployees]);

  const unreadCount = notifications.length;
  const overdueCount = notifications.filter(n => n.isOverdue).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    overdueCount,
    refresh: loadNotifications
  };
};
