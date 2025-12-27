// =====================================================
// DASHBOARD LOGÍSTICA
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Package, 
  DollarSign, 
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useLogisticsRequests, useTrips, useTripCosts } from '@/hooks/logistica/useLogisticaData';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardLogistica() {
  const navigate = useNavigate();
  const { data: requests, isLoading: requestsLoading } = useLogisticsRequests({ limit: 100 });
  const { data: trips, isLoading: tripsLoading } = useTrips({ limit: 100 });
  const { data: costs, isLoading: costsLoading } = useTripCosts({ 
    data_inicio: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    data_fim: format(new Date(), 'yyyy-MM-dd')
  });

  const stats = useMemo(() => {
    const requestsData = requests || [];
    const tripsData = trips || [];
    const costsData = costs || [];

    return {
      solicitacoes_pendentes: requestsData.filter(r => r.status === 'pendente').length,
      solicitacoes_aprovadas: requestsData.filter(r => r.status === 'aprovado').length,
      solicitacoes_rejeitadas: requestsData.filter(r => r.status === 'rejeitado').length,
      viagens_agendadas: tripsData.filter(t => t.status === 'agendada').length,
      viagens_em_andamento: tripsData.filter(t => t.status === 'em_viagem').length,
      viagens_concluidas: tripsData.filter(t => t.status === 'concluida').length,
      custos_mes: costsData.reduce((sum, c) => sum + (c.valor || 0), 0),
      total_solicitacoes: requestsData.length,
      total_viagens: tripsData.length,
    };
  }, [requests, trips, costs]);

  if (requestsLoading || tripsLoading || costsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
      </div>
    );
  }

  const recentRequests = (requests || []).slice(0, 5);
  const upcomingTrips = (trips || []).filter(t => t.status === 'agendada').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Logística</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral do módulo de logística
          </p>
        </div>
        <Button 
          onClick={() => navigate('/logistica/calendario')}
          className="bg-[#049940] hover:bg-[#038830]"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Ver Calendário
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.solicitacoes_pendentes}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viagens em Andamento</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viagens_em_andamento}</div>
            <p className="text-xs text-muted-foreground">
              Em execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.custos_mes)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total registrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viagens Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viagens_agendadas}</div>
            <p className="text-xs text-muted-foreground">
              Próximas viagens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Solicitações Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.solicitacoes_aprovadas}
            </div>
            <p className="text-xs text-muted-foreground">Total: {stats.total_solicitacoes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Package className="w-4 h-4 mr-2 text-blue-500" />
              Viagens Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats.viagens_concluidas}
            </div>
            <p className="text-xs text-muted-foreground">Total: {stats.total_viagens}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <XCircle className="w-4 h-4 mr-2 text-red-500" />
              Solicitações Rejeitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.solicitacoes_rejeitadas}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Solicitações Recentes e Próximas Viagens */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Solicitações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Solicitações Recentes
            </CardTitle>
            <CardDescription>
              Últimas solicitações de logística
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/logistica/viagens?request=${request.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{request.numero_solicitacao}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.endereco_retirada} → {request.endereco_entrega}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(request.previsao_envio), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="ml-4">
                      <Badge 
                        variant={
                          request.status === 'aprovado' ? 'default' :
                          request.status === 'pendente' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {request.status === 'pendente' ? 'Pendente' :
                         request.status === 'aprovado' ? 'Aprovado' :
                         request.status === 'rejeitado' ? 'Rejeitado' :
                         'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {requests && requests.length > 5 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate('/logistica/viagens')}
                  >
                    Ver todas ({requests.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma solicitação encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Viagens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="w-5 h-5 mr-2" />
              Próximas Viagens
            </CardTitle>
            <CardDescription>
              Viagens agendadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTrips.length > 0 ? (
              <div className="space-y-3">
                {upcomingTrips.map((trip) => (
                  <div 
                    key={trip.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/logistica/viagens?trip=${trip.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {trip.vehicle_placa || 'Veículo'} - {trip.driver_nome || 'Condutor'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trip.request_numero || 'Solicitação'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(trip.data_saida), "dd/MM/yyyy", { locale: ptBR })}
                        {trip.hora_saida && ` às ${trip.hora_saida}`}
                      </p>
                    </div>
                    <div className="ml-4">
                      <Badge variant="outline">
                        Agendada
                      </Badge>
                    </div>
                  </div>
                ))}
                {trips && trips.filter(t => t.status === 'agendada').length > 5 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate('/logistica/viagens')}
                  >
                    Ver todas ({trips.filter(t => t.status === 'agendada').length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma viagem agendada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => navigate('/logistica/calendario')}
            >
              <Calendar className="w-6 h-6 mb-2" />
              <span className="text-sm">Calendário</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => navigate('/logistica/viagens')}
            >
              <Truck className="w-6 h-6 mb-2" />
              <span className="text-sm">Viagens</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => navigate('/logistica/custos')}
            >
              <DollarSign className="w-6 h-6 mb-2" />
              <span className="text-sm">Custos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => navigate('/portal-gestor/aprovacoes?tipo=logistica')}
            >
              <AlertCircle className="w-6 h-6 mb-2" />
              <span className="text-sm">Aprovações</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
