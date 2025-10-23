import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationService, Notification } from '@/services/rh/notificationService';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';

// =====================================================
// HOOKS DE NOTIFICAÇÕES
// =====================================================

/**
 * Hook para buscar notificações do usuário
 */
export function useNotifications(limit: number = 50) {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id, selectedCompany?.id, limit],
    queryFn: () => NotificationService.getUserNotifications(
      user?.id || '', 
      selectedCompany?.id || '', 
      limit
    ),
    enabled: !!user?.id && !!selectedCompany?.id,
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });
}

/**
 * Hook para contar notificações não lidas
 */
export function useUnreadNotificationsCount() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id, selectedCompany?.id],
    queryFn: () => NotificationService.getUnreadCount(
      user?.id || '', 
      selectedCompany?.id || ''
    ),
    enabled: !!user?.id && !!selectedCompany?.id,
    refetchInterval: 10000, // Refetch a cada 10 segundos
  });
}

/**
 * Hook para marcar notificação como lida
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (notificationId: string) => 
      NotificationService.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id, selectedCompany?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count', user?.id, selectedCompany?.id]
      });
    },
  });
}

/**
 * Hook para marcar todas as notificações como lidas
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(
      user?.id || '', 
      selectedCompany?.id || ''
    ),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id, selectedCompany?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count', user?.id, selectedCompany?.id]
      });
    },
  });
}

/**
 * Hook para criar notificação
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (template: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }) => NotificationService.createNotification(
      user?.id || '', 
      selectedCompany?.id || '', 
      template
    ),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['notifications', user?.id, selectedCompany?.id]
      });
    },
  });
}