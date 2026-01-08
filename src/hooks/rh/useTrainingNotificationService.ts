import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/company-context';
import { TrainingNotificationService } from '@/services/rh/trainingNotificationService';

// =====================================================
// HOOK PARA SERVIÇO DE NOTIFICAÇÕES DE TREINAMENTOS
// =====================================================

export const useTrainingNotificationService = () => {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Criar notificações para treinamentos obrigatórios
   */
  const createNotifications = async () => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await TrainingNotificationService.createTrainingNotifications(
        selectedCompany.id
      );
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar notificações');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verificar treinamentos vencidos
   */
  const checkOverdue = async () => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await TrainingNotificationService.checkOverdueTrainings(
        selectedCompany.id
      );
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar treinamentos vencidos');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obter histórico de arquivos
   */
  const getFileHistory = async (trainingId?: string, contentId?: string) => {
    if (!selectedCompany?.id) return { files: [], count: 0 };

    setLoading(true);
    setError(null);

    try {
      const result = await TrainingNotificationService.getFileHistory(
        selectedCompany.id,
        trainingId,
        contentId
      );
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
      return { files: [], count: 0 };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createNotifications,
    checkOverdue,
    getFileHistory
  };
};



