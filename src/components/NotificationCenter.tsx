import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// COMPONENTE DE CENTRO DE NOTIFICAÇÕES
// =====================================================

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    is_read: boolean;
    created_at: string;
  };
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead 
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'compensation_request':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'compensation_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'compensation_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'compensation_reminder':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case 'compensation_request':
        return 'Solicitação de Compensação';
      case 'compensation_approved':
        return 'Compensação Aprovada';
      case 'compensation_rejected':
        return 'Compensação Rejeitada';
      case 'compensation_reminder':
        return 'Lembrete';
      default:
        return 'Notificação';
    }
  };

  return (
    <div 
      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">
              {notification.title}
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {getTypeLabel()}
              </Badge>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications(20);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsRead.isPending}
                    className="text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Carregando notificações...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma notificação encontrada
                </div>
              ) : (
                <div>
                  {unreadNotifications.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-blue-50 border-b">
                        <p className="text-xs font-medium text-blue-700">
                          Não lidas ({unreadNotifications.length})
                        </p>
                      </div>
                      {unreadNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      ))}
                    </>
                  )}
                  
                  {readNotifications.length > 0 && (
                    <>
                      {unreadNotifications.length > 0 && <Separator />}
                      <div className="px-3 py-2 bg-gray-50 border-b">
                        <p className="text-xs font-medium text-gray-700">
                          Lidas ({readNotifications.length})
                        </p>
                      </div>
                      {readNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
