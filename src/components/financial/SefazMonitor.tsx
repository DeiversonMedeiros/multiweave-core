// =====================================================
// COMPONENTE: MONITOR SEFAZ
// =====================================================
// Data: 2025-01-15
// Descrição: Monitor de status dos serviços SEFAZ
// Autor: Sistema MultiWeave Core

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Globe,
  Zap,
  Shield,
  Activity
} from 'lucide-react';
import { SefazStatus } from '@/integrations/supabase/financial-types';
import { useFiscal } from '@/hooks/financial/useFiscal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SefazMonitorProps {
  onClose: () => void;
}

export function SefazMonitor({ onClose }: SefazMonitorProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Carregar dados reais usando hook useFiscal
  const { sefazStatus, loading, refresh } = useFiscal();
  
  const [status, setStatus] = useState(sefazStatus || []);

  useEffect(() => {
    setStatus(sefazStatus || []);
  }, [sefazStatus]);

  const handleRefresh = async () => {
    await refresh();
    setLastUpdate(new Date());
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { label: 'Online', variant: 'success' as const, icon: CheckCircle },
      offline: { label: 'Offline', variant: 'destructive' as const, icon: XCircle },
      indisponivel: { label: 'Indisponível', variant: 'secondary' as const, icon: Clock },
      contingencia: { label: 'Contingência', variant: 'default' as const, icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'contingencia':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  };

  const formatTime = (ms: number) => {
    return `${ms}ms`;
  };

  // Agrupar por UF
  const statusByUF = status.reduce((acc, item) => {
    if (!acc[item.uf]) {
      acc[item.uf] = [];
    }
    acc[item.uf].push(item);
    return acc;
  }, {} as Record<string, SefazStatus[]>);

  // Calcular estatísticas
  const totalServices = status.length;
  const onlineServices = status.filter(s => s.status === 'online').length;
  const offlineServices = status.filter(s => s.status === 'offline').length;
  const contingencyServices = status.filter(s => s.status === 'contingencia').length;
  const availabilityRate = totalServices > 0 ? (onlineServices / totalServices) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Monitor SEFAZ
              </CardTitle>
              <CardDescription>
                Status dos serviços SEFAZ por UF e tipo de serviço
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Disponibilidade</p>
                    <p className="text-2xl font-bold text-green-600">{availabilityRate.toFixed(1)}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Online</p>
                    <p className="text-2xl font-bold text-green-600">{onlineServices}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contingência</p>
                    <p className="text-2xl font-bold text-yellow-600">{contingencyServices}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Offline</p>
                    <p className="text-2xl font-bold text-red-600">{offlineServices}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status por UF */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status por UF</h3>
            {Object.entries(statusByUF).map(([uf, services]) => (
              <Card key={uf}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {uf}
                    <Badge variant="outline">{services.length} serviços</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(service.status)}
                          <div>
                            <p className="font-medium">{service.servico}</p>
                            <p className="text-sm text-muted-foreground">
                              Última verificação: {formatDate(service.ultima_verificacao)}
                            </p>
                            {service.observacoes && (
                              <p className="text-sm text-muted-foreground">
                                {service.observacoes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {service.tempo_resposta && (
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatTime(service.tempo_resposta)}
                              </p>
                              <p className="text-xs text-muted-foreground">Tempo resposta</p>
                            </div>
                          )}
                          {getStatusBadge(service.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alertas */}
          {offlineServices > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {offlineServices} serviço(s) SEFAZ estão offline. 
                Verifique a conectividade e tente novamente.
              </AlertDescription>
            </Alert>
          )}

          {contingencyServices > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {contingencyServices} serviço(s) SEFAZ estão em contingência. 
                O sistema está funcionando com limitações.
              </AlertDescription>
            </Alert>
          )}

          {/* Informações de Atualização */}
          <div className="text-center text-sm text-muted-foreground">
            Última atualização: {formatDate(lastUpdate.toISOString())}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
