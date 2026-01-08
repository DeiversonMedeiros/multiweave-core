import { useEffect, useState, useRef } from 'react';
import { useTrainingNotifications } from './useTrainingNotifications';

// =====================================================
// HOOK PARA NOTIFICAÇÕES PUSH DO NAVEGADOR
// =====================================================

export const useBrowserNotifications = () => {
  const { notifications, overdueCount } = useTrainingNotifications();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      setPermission(Notification.permission);

      // Solicitar permissão se ainda não foi solicitada
      if (Notification.permission === 'default') {
        requestPermission();
      }
    } catch (err) {
      console.warn('Erro ao verificar permissão de notificações:', err);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setEnabled(result === 'granted');
    } catch (err) {
      console.error('Erro ao solicitar permissão de notificações:', err);
    }
  };

  useEffect(() => {
    if (permission !== 'granted' || !enabled) return;
    if (!('Notification' in window)) return;
    if (notifications.length === 0) return;

    // Usar um timeout para evitar notificações imediatas ao carregar
    const timeoutId = setTimeout(() => {
      // Verificar se já foi notificado recentemente (últimos 5 minutos)
      const lastNotification = sessionStorage.getItem('last_training_notification');
      const now = Date.now();
      
      if (lastNotification && (now - parseInt(lastNotification)) < 5 * 60 * 1000) {
        return; // Não notificar se já foi notificado recentemente
      }

      // Criar notificação para treinamentos vencidos
      const overdueNotifications = notifications.filter(n => n.isOverdue);
      if (overdueNotifications.length > 0) {
        const notification = overdueNotifications[0]; // Primeiro vencido
        const notificationKey = `overdue-${notification.trainingId}`;
        
        // Evitar notificações duplicadas
        if (notifiedRef.current.has(notificationKey)) {
          return;
        }
        
        try {
          const browserNotification = new Notification('Treinamento Obrigatório Vencido', {
            body: `O treinamento "${notification.trainingName}" está vencido. Por favor, conclua o quanto antes.`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `training-overdue-${notification.trainingId}`, // Evita notificações duplicadas
            requireInteraction: true,
            data: {
              trainingId: notification.trainingId,
              url: `/rh/treinamentos-online/${notification.trainingId}`
            }
          });

          // Listener para clique
          browserNotification.onclick = () => {
            window.focus();
            window.location.href = `/rh/treinamentos-online/${notification.trainingId}`;
            browserNotification.close();
          };

          notifiedRef.current.add(notificationKey);
          sessionStorage.setItem('last_training_notification', now.toString());
        } catch (err) {
          console.error('Erro ao criar notificação:', err);
        }
      } else {
        // Notificar sobre treinamentos próximos do vencimento
        const urgentNotifications = notifications.filter(
          n => n.daysRemaining !== undefined && n.daysRemaining <= 7 && n.daysRemaining > 0
        );
        
        if (urgentNotifications.length > 0) {
          const notification = urgentNotifications[0];
          const notificationKey = `urgent-${notification.trainingId}`;
          
          // Evitar notificações duplicadas
          if (notifiedRef.current.has(notificationKey)) {
            return;
          }
          
          try {
            const browserNotification = new Notification('Treinamento Obrigatório - Prazo Próximo', {
              body: `O treinamento "${notification.trainingName}" vence em ${notification.daysRemaining} dia(s).`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `training-urgent-${notification.trainingId}`,
              data: {
                trainingId: notification.trainingId,
                url: `/rh/treinamentos-online/${notification.trainingId}`
              }
            });

            // Listener para clique
            browserNotification.onclick = () => {
              window.focus();
              window.location.href = `/rh/treinamentos-online/${notification.trainingId}`;
              browserNotification.close();
            };

            notifiedRef.current.add(notificationKey);
            sessionStorage.setItem('last_training_notification', now.toString());
          } catch (err) {
            console.error('Erro ao criar notificação:', err);
          }
        }
      }
    }, 2000); // Aguardar 2 segundos antes de notificar

    return () => clearTimeout(timeoutId);
  }, [notifications, permission, enabled]);

  // Listener para cliques nas notificações já está implementado inline
  // Não precisamos de um listener separado para notificações básicas

  return {
    permission,
    enabled,
    requestPermission,
    setEnabled
  };
};



