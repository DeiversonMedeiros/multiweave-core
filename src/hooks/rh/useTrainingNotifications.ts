import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface TrainingNotificationType {
  id: string;
  company_id: string;
  tipo: string;
  nome: string;
  descricao?: string;
  template_titulo: string;
  template_mensagem: string;
  dias_antecedencia: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingNotificationRule {
  id: string;
  company_id: string;
  training_id?: string;
  notification_type_id: string;
  target_audience: 'inscritos' | 'todos_funcionarios' | 'gestores' | 'rh';
  dias_antecedencia: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingNotificationHistory {
  id: string;
  training_id?: string;
  training_name?: string;
  titulo: string;
  mensagem: string;
  data_envio: string;
  status: 'enviada' | 'falhou';
  tipo: string;
}

export interface TrainingNotificationQueue {
  id: string;
  company_id: string;
  training_id?: string;
  notification_type_id: string;
  user_id?: string;
  employee_id?: string;
  titulo: string;
  mensagem: string;
  data_agendamento: string;
  status: 'pendente' | 'enviada' | 'falhou' | 'cancelada';
  tentativas: number;
  max_tentativas: number;
  data_envio?: string;
  erro_mensagem?: string;
  created_at: string;
  updated_at: string;
}

export const useTrainingNotifications = () => {
  const { selectedCompany } = useCompany();
  const [notificationTypes, setNotificationTypes] = useState<TrainingNotificationType[]>([]);
  const [notificationRules, setNotificationRules] = useState<TrainingNotificationRule[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<TrainingNotificationHistory[]>([]);
  const [notificationQueue, setNotificationQueue] = useState<TrainingNotificationQueue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Early return if no company selected
  if (!selectedCompany?.id) {
    return {
      notificationTypes: [],
      notificationRules: [],
      notificationHistory: [],
      notificationQueue: [],
      loading: false,
      error: null,
      fetchNotificationTypes: () => {},
      fetchNotificationRules: () => {},
      fetchNotificationHistory: () => {},
      fetchNotificationQueue: () => {},
      processNotificationQueue: () => {},
      createNotificationRule: () => Promise.resolve(),
      updateNotificationRule: () => Promise.resolve(),
      deleteNotificationRule: () => Promise.resolve(),
      createNotificationType: () => Promise.resolve(),
      updateNotificationType: () => Promise.resolve(),
      deleteNotificationType: () => Promise.resolve(),
      scheduleTrainingNotifications: () => Promise.resolve(),
    };
  }

  // Fetch notification types
  const fetchNotificationTypes = useCallback(async () => {
    if (!selectedCompany?.id) {
      console.log('🔍 fetchNotificationTypes: No company selected, skipping');
      return;
    }

    console.log('🔍 fetchNotificationTypes: Starting with company:', selectedCompany.id);

    try {
      setLoading(true);
      console.log('🔍 fetchNotificationTypes: Calling EntityService...');
      
      const result = await EntityService.list<TrainingNotificationType>({
        schema: 'rh',
        table: 'training_notification_types',
        companyId: selectedCompany.id,
        filters: { is_active: true },
        orderBy: 'tipo',
        orderDirection: 'ASC'
      });

      console.log('🔍 fetchNotificationTypes: Success, data:', result.data);
      setNotificationTypes(result.data || []);
    } catch (err) {
      console.error('🔍 fetchNotificationTypes: Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar tipos de notificação');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  // Fetch notification rules for a specific training
  const fetchNotificationRules = useCallback(async (trainingId?: string) => {
    if (!selectedCompany?.id) {
      console.log('🔍 fetchNotificationRules: No company selected, skipping');
      return;
    }

    console.log('🔍 fetchNotificationRules: Starting with company:', selectedCompany.id, 'trainingId:', trainingId);

    try {
      setLoading(true);
      console.log('🔍 fetchNotificationRules: Calling EntityService...');
      
      const result = await EntityService.list<TrainingNotificationRule>({
        schema: 'rh',
        table: 'training_notification_rules',
        companyId: selectedCompany.id,
        filters: trainingId ? { training_id: trainingId } : {},
        orderBy: 'created_at',
        orderDirection: 'ASC'
      });

      console.log('🔍 fetchNotificationRules: Success, data:', result.data);
      setNotificationRules(result.data || []);
    } catch (err) {
      console.error('🔍 fetchNotificationRules: Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar regras de notificação');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  // Fetch notification history for current user
  const fetchNotificationHistory = useCallback(async (limit = 50, offset = 0) => {
    if (!selectedCompany?.id) {
      console.log('🔍 fetchNotificationHistory: No company selected, skipping');
      return;
    }

    console.log('🔍 fetchNotificationHistory: Starting with company:', selectedCompany.id);

    try {
      setLoading(true);
      console.log('🔍 fetchNotificationHistory: Calling RPC function...');
      
      // For now, just return empty array since the RPC function doesn't exist
      console.log('🔍 fetchNotificationHistory: RPC function not available, returning empty array');
      setNotificationHistory([]);
      return;
      
      // TODO: Implement RPC function or use EntityService
      // const { data, error } = await supabase.rpc('get_training_notifications', {
      //   p_user_id: (await supabase.auth.getUser()).data.user?.id,
      //   p_company_id: selectedCompany.id,
      //   p_limit: limit,
      //   p_offset: offset
      // }, { schema: 'rh' });

      // if (error) {
      //   console.error('🔍 fetchNotificationHistory: RPC error:', error);
      //   throw error;
      // }
      
      // console.log('🔍 fetchNotificationHistory: Success, data:', data);
      // setNotificationHistory(data || []);
    } catch (err) {
      console.error('🔍 fetchNotificationHistory: Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico de notificações');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  // Fetch notification queue
  const fetchNotificationQueue = useCallback(async () => {
    if (!selectedCompany?.id) {
      console.log('🔍 fetchNotificationQueue: No company selected, skipping');
      return;
    }

    console.log('🔍 fetchNotificationQueue: Starting with company:', selectedCompany.id);

    try {
      setLoading(true);
      console.log('🔍 fetchNotificationQueue: Calling EntityService...');
      
      const result = await EntityService.list<TrainingNotificationQueue>({
        schema: 'rh',
        table: 'training_notification_queue',
        companyId: selectedCompany.id,
        orderBy: 'data_agendamento',
        orderDirection: 'ASC'
      });

      console.log('🔍 fetchNotificationQueue: Success, data:', result.data);
      setNotificationQueue(result.data || []);
    } catch (err) {
      console.error('🔍 fetchNotificationQueue: Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar fila de notificações');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  // Create notification rule
  const createNotificationRule = useCallback(async (ruleData: Partial<TrainingNotificationRule>) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const result = await EntityService.create<TrainingNotificationRule>({
        schema: 'rh',
        table: 'training_notification_rules',
        companyId: selectedCompany.id,
        data: ruleData
      });
      
      // Refresh rules
      await fetchNotificationRules(ruleData.training_id);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar regra de notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationRules]);

  // Update notification rule
  const updateNotificationRule = useCallback(async (ruleId: string, updates: Partial<TrainingNotificationRule>) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const result = await EntityService.update<TrainingNotificationRule>({
        schema: 'rh',
        table: 'training_notification_rules',
        companyId: selectedCompany.id,
        id: ruleId,
        data: updates
      });
      
      // Refresh rules
      await fetchNotificationRules(updates.training_id);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar regra de notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationRules]);

  // Delete notification rule
  const deleteNotificationRule = useCallback(async (ruleId: string) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      await EntityService.delete({
        schema: 'rh',
        table: 'training_notification_rules',
        companyId: selectedCompany.id,
        id: ruleId
      });
      
      // Refresh rules
      await fetchNotificationRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir regra de notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationRules]);

  // Schedule notifications for a training
  const scheduleTrainingNotifications = useCallback(async (trainingId: string) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('schedule_training_notifications');

      if (error) throw error;
      
      // Refresh queue
      await fetchNotificationQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar notificações');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationQueue]);

  // Process notification queue
  const processNotificationQueue = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('process_notification_queue');

      if (error) throw error;
      
      // Refresh queue and history
      await Promise.all([
        fetchNotificationQueue(),
        fetchNotificationHistory()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar fila de notificações');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchNotificationQueue, fetchNotificationHistory]);

  // Create notification type
  const createNotificationType = useCallback(async (typeData: Partial<TrainingNotificationType>) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const result = await EntityService.create<TrainingNotificationType>({
        schema: 'rh',
        table: 'training_notification_types',
        companyId: selectedCompany.id,
        data: typeData
      });
      
      // Refresh types
      await fetchNotificationTypes();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tipo de notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationTypes]);

  // Update notification type
  const updateNotificationType = useCallback(async (typeId: string, updates: Partial<TrainingNotificationType>) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      const result = await EntityService.update<TrainingNotificationType>({
        schema: 'rh',
        table: 'training_notification_types',
        companyId: selectedCompany.id,
        id: typeId,
        data: updates
      });
      
      // Refresh types
      await fetchNotificationTypes();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tipo de notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationTypes]);

  // Delete notification type
  const deleteNotificationType = useCallback(async (typeId: string) => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      await EntityService.delete({
        schema: 'rh',
        table: 'training_notification_types',
        companyId: selectedCompany.id,
        id: typeId
      });
      
      // Refresh types
      await fetchNotificationTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir tipo de notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, fetchNotificationTypes]);

  // Load initial data
  useEffect(() => {
    console.log('🔍 useEffect: selectedCompany changed:', selectedCompany?.id);
    
    if (selectedCompany?.id) {
      console.log('🔍 useEffect: Loading initial data...');
      fetchNotificationTypes();
      fetchNotificationHistory();
    } else {
      console.log('🔍 useEffect: No company selected, skipping initial data load');
    }
  }, [selectedCompany?.id]); // Removidas as dependências que causavam o loop

  return {
    // State
    notificationTypes,
    notificationRules,
    notificationHistory,
    notificationQueue,
    loading,
    error,

    // Actions
    fetchNotificationTypes,
    fetchNotificationRules,
    fetchNotificationHistory,
    fetchNotificationQueue,
    createNotificationRule,
    updateNotificationRule,
    deleteNotificationRule,
    scheduleTrainingNotifications,
    processNotificationQueue,
    createNotificationType,
    updateNotificationType,
    deleteNotificationType,

    // Utilities
    clearError: () => setError(null)
  };
};
