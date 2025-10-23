import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Upload,
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { useESocialStats } from '@/hooks/rh/useESocialEvents';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// DASHBOARD DE INTEGRAÇÃO eSOCIAL
// =====================================================

interface ESocialIntegrationDashboardProps {
  className?: string;
}

export default function ESocialIntegrationDashboard({ className }: ESocialIntegrationDashboardProps) {
  const { data: stats, isLoading } = useESocialStats();

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum dado disponível</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =====================================================
  // CÁLCULOS DE ESTATÍSTICAS
  // =====================================================

  const totalEvents = stats.total;
  const pendingEvents = stats.pending;
  const acceptedEvents = stats.accepted;
  const rejectedEvents = stats.rejected + stats.error;
  const sentEvents = stats.sent;

  const successRate = totalEvents > 0 ? ((acceptedEvents / totalEvents) * 100).toFixed(1) : '0';
  const pendingRate = totalEvents > 0 ? ((pendingEvents / totalEvents) * 100).toFixed(1) : '0';
  const errorRate = totalEvents > 0 ? ((rejectedEvents / totalEvents) * 100).toFixed(1) : '0';

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cards de Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Eventos processados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEvents}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando envio ({pendingRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedEvents}</div>
            <p className="text-xs text-muted-foreground">
              Processados com sucesso ({successRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedEvents}</div>
            <p className="text-xs text-muted-foreground">
              Com problemas ({errorRate}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Análise */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Taxa de Sucesso */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Eventos aceitos pelo eSocial
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Eventos Enviados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <Upload className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sentEvents}</div>
            <p className="text-xs text-muted-foreground">
              Eventos enviados para eSocial
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: totalEvents > 0 ? `${(sentEvents / totalEvents) * 100}%` : '0%' }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Status Geral */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {acceptedEvents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Aceitos</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {acceptedEvents}
                  </Badge>
                </div>
              )}
              {pendingEvents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-600">Pendentes</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {pendingEvents}
                  </Badge>
                </div>
              )}
              {rejectedEvents > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">Rejeitados</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    {rejectedEvents}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Tipo de Evento */}
      {stats.byType && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Distribuição por Tipo de Evento
            </CardTitle>
            <CardDescription>
              Eventos processados por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.byType)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([tipo, count]) => {
                  const percentage = totalEvents > 0 ? ((count / totalEvents) * 100).toFixed(1) : '0';
                  return (
                    <div key={tipo} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tipo}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count} eventos</span>
                          <Badge variant="outline">{percentage}%</Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Operações frequentes para gestão do eSocial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="h-6 w-6" />
              <span className="text-sm">Processar eSocial</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Upload className="h-6 w-6" />
              <span className="text-sm">Enviar Lotes</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Download className="h-6 w-6" />
              <span className="text-sm">Baixar Relatórios</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm">Ver Logs</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Informações do Sistema
          </CardTitle>
          <CardDescription>
            Status e configurações do sistema eSocial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Última Sincronização</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Status da Conexão</div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Conectado</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Ambiente</div>
              <Badge variant="outline">Produção</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
