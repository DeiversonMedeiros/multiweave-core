import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/rh/useBrowserNotifications';

export const BrowserNotificationSettings: React.FC = () => {
  const { permission, enabled, requestPermission, setEnabled } = useBrowserNotifications();

  const handleToggle = (checked: boolean) => {
    if (checked && permission !== 'granted') {
      requestPermission();
    } else {
      setEnabled(checked);
    }
  };

  const getStatusIcon = () => {
    if (permission === 'granted' && enabled) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (permission === 'denied') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <BellOff className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (permission === 'granted' && enabled) {
      return 'Notificações ativadas';
    }
    if (permission === 'granted' && !enabled) {
      return 'Permissão concedida, mas notificações desativadas';
    }
    if (permission === 'denied') {
      return 'Notificações bloqueadas pelo navegador';
    }
    return 'Permissão não solicitada';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações do Navegador
        </CardTitle>
        <CardDescription>
          Receba notificações sobre treinamentos obrigatórios diretamente no navegador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <Label htmlFor="browser-notifications" className="font-medium">
                Ativar Notificações
              </Label>
              <p className="text-sm text-muted-foreground">
                {getStatusText()}
              </p>
            </div>
          </div>
          <Switch
            id="browser-notifications"
            checked={permission === 'granted' && enabled}
            onCheckedChange={handleToggle}
            disabled={permission === 'denied'}
          />
        </div>

        {permission === 'default' && (
          <Alert>
            <AlertDescription>
              Clique no switch acima para solicitar permissão de notificações do navegador.
            </AlertDescription>
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertDescription>
              As notificações foram bloqueadas. Para ativá-las, acesse as configurações do navegador
              e permita notificações para este site.
            </AlertDescription>
          </Alert>
        )}

        {permission === 'granted' && enabled && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Você receberá notificações sobre treinamentos obrigatórios vencidos ou próximos do vencimento.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">O que você receberá:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Notificações sobre treinamentos obrigatórios vencidos</li>
            <li>• Alertas quando treinamentos estão próximos do vencimento (7 dias)</li>
            <li>• Lembretes sobre novos treinamentos obrigatórios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

