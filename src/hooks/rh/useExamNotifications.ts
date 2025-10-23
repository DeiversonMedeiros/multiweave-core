import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface ExamNotification {
  id: string;
  user_id: string;
  company_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ExamNotificationStats {
  total: number;
  unread: number;
  upcoming: number;
  overdue: number;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para buscar notificações de exames do usuário
 */
export function useExamNotifications() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['exam-notifications', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .in('type', ['exam_reminder', 'exam_overdue', 'exam_scheduled', 'exam_completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ExamNotification[];
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar estatísticas de notificações
 */
export function useExamNotificationStats() {
  const { data: notifications = [] } = useExamNotifications();

  return {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    upcoming: notifications.filter(n => n.type === 'exam_reminder').length,
    overdue: notifications.filter(n => n.type === 'exam_overdue').length,
  };
}

/**
 * Hook para buscar exames que precisam de notificação
 */
export function useExamsNeedingNotification(daysAhead: number = 30) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['exams-needing-notification', selectedCompany?.id, daysAhead],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const { data, error } = await supabase.rpc('get_exams_needing_notification', {
        p_company_id: selectedCompany.id,
        p_days_ahead: daysAhead
      });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para buscar exames vencidos
 */
export function useExpiredExams() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['expired-exams', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const { data, error } = await supabase.rpc('get_expired_exams', {
        p_company_id: selectedCompany.id
      });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para marcar notificação como lida
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-notifications'] });
    },
  });
}

/**
 * Hook para marcar todas as notificações como lidas
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error('Company not selected');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('company_id', selectedCompany.id)
        .in('type', ['exam_reminder', 'exam_overdue', 'exam_scheduled', 'exam_completed']);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-notifications'] });
    },
  });
}

/**
 * Hook para agendar notificações automáticas
 */
export function useScheduleExamNotifications() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error('Company not selected');

      const { data, error } = await supabase.rpc('schedule_exam_notifications', {
        p_company_id: selectedCompany.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (notificationsCreated) => {
      queryClient.invalidateQueries({ queryKey: ['exam-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['periodicExams'] });
      
      return notificationsCreated;
    },
  });
}

/**
 * Hook para criar notificação manual
 */
export function useCreateExamNotification() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({
      userId,
      examId,
      type,
      title,
      message
    }: {
      userId: string;
      examId: string;
      type: string;
      title: string;
      message: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Company not selected');

      const { data, error } = await supabase.rpc('create_exam_notification', {
        p_user_id: userId,
        p_company_id: selectedCompany.id,
        p_exam_id: examId,
        p_notification_type: type,
        p_title: title,
        p_message: message
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-notifications'] });
    },
  });
}

// =====================================================
// HOOKS DE UTILIDADE
// =====================================================

/**
 * Hook para buscar notificações não lidas
 */
export function useUnreadNotifications() {
  const { data: notifications = [] } = useExamNotifications();
  
  return notifications.filter(notification => !notification.is_read);
}

/**
 * Hook para buscar notificações por tipo
 */
export function useNotificationsByType(type: string) {
  const { data: notifications = [] } = useExamNotifications();
  
  return notifications.filter(notification => notification.type === type);
}
