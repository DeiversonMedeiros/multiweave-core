import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { syncPermissions, checkPermissionInconsistencies } from '@/scripts/sync-permissions';
import { useToast } from '@/hooks/use-toast';

export const PermissionSync: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [inconsistencies, setInconsistencies] = useState<string[]>([]);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await syncPermissions();
      setLastSync(new Date());
      toast({
        title: 'Sincronização Concluída',
        description: 'Permissões sincronizadas com sucesso!',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro na Sincronização',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckInconsistencies = async () => {
    setIsLoading(true);
    try {
      await checkPermissionInconsistencies();
      toast({
        title: 'Verificação Concluída',
        description: 'Inconsistências verificadas. Verifique o console para detalhes.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro na Verificação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sincronização de Permissões
        </CardTitle>
        <CardDescription>
          Sincronize as permissões entre o código e o banco de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar Permissões
          </Button>
          
          <Button
            onClick={handleCheckInconsistencies}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            Verificar Inconsistências
          </Button>
        </div>

        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Última sincronização: {lastSync.toLocaleString()}
          </div>
        )}

        {inconsistencies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Inconsistências Encontradas:</h4>
            <div className="flex flex-wrap gap-1">
              {inconsistencies.map((inconsistency, index) => (
                <Badge key={index} variant="destructive">
                  {inconsistency}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Sincronizar Permissões:</strong> Cria permissões padrão para módulos e entidades que não existem no banco.</p>
          <p><strong>Verificar Inconsistências:</strong> Identifica diferenças entre o código e o banco de dados.</p>
        </div>
      </CardContent>
    </Card>
  );
};
