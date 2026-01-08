import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useTrainingNotifications, TrainingNotification } from '@/hooks/rh/useTrainingNotifications';
import { useBrowserNotifications } from '@/hooks/rh/useBrowserNotifications';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TrainingNotificationsBadge: React.FC = () => {
  const { notifications, loading, unreadCount, overdueCount } = useTrainingNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  // Ativar notificações do navegador
  useBrowserNotifications();

  const handleTrainingClick = (trainingId: string) => {
    navigate(`/rh/treinamentos-online/${trainingId}`);
    setOpen(false);
  };

  const getNotificationIcon = (notification: TrainingNotification) => {
    if (notification.isOverdue) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (notification.daysRemaining !== undefined && notification.daysRemaining <= 7) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-blue-500" />;
  };

  const getNotificationColor = (notification: TrainingNotification) => {
    if (notification.isOverdue) {
      return 'border-red-200 bg-red-50';
    }
    if (notification.daysRemaining !== undefined && notification.daysRemaining <= 7) {
      return 'border-yellow-200 bg-yellow-50';
    }
    return 'border-blue-200 bg-blue-50';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Treinamentos Obrigatórios</h4>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Nenhum treinamento obrigatório pendente!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.trainingId}
                  onClick={() => handleTrainingClick(notification.trainingId)}
                  className={`w-full p-4 text-left hover:bg-accent transition-colors ${getNotificationColor(notification)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1">
                        {notification.trainingName}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>Progresso: {Math.round(notification.progress)}%</span>
                        {notification.deadline && (
                          <>
                            <span>•</span>
                            <span>
                              {notification.isOverdue ? (
                                <span className="text-red-600 font-medium">
                                  Vencido há {Math.abs(notification.daysRemaining || 0)} dia(s)
                                </span>
                              ) : notification.daysRemaining !== undefined ? (
                                <span>
                                  {notification.daysRemaining === 0
                                    ? 'Vence hoje'
                                    : `Vence em ${notification.daysRemaining} dia(s)`}
                                </span>
                              ) : (
                                <span>
                                  {format(new Date(notification.deadline), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${notification.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                navigate('/rh/treinamentos');
                setOpen(false);
              }}
            >
              Ver todos os treinamentos
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

