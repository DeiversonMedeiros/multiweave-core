// =====================================================
// DASHBOARD DE COMBUSTÍVEL
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Droplets,
  Car,
  Users,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useDashboardStats, useRefuelRequests, useAlerts } from '@/hooks/combustivel/useCombustivel';
import { RequireModule } from '@/components/RequireAuth';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardCombustivel() {
  const currentDate = new Date();
  const [mes, setMes] = useState(currentDate.getMonth() + 1);
  const [ano, setAno] = useState(currentDate.getFullYear());

  const { data: stats, isLoading: statsLoading } = useDashboardStats(mes, ano);
  const { data: pendingRequests } = useRefuelRequests({ status: 'pendente' });
  const { data: alerts } = useAlerts({ resolvido: false });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
      </div>
    );
  }

  const dashboardStats = stats?.data || {
    consumo_mensal_litros: 0,
    consumo_mensal_valor: 0,
    consumo_por_veiculo: [],
    consumo_por_colaborador: [],
    consumo_por_centro_custo: [],
    consumo_por_projeto: [],
    orcamento_previsto: 0,
    orcamento_realizado: 0,
    abastecimentos_pendentes: 0
  };

  const percentualOrcamento = dashboardStats.orcamento_previsto > 0
    ? (dashboardStats.orcamento_realizado / dashboardStats.orcamento_previsto) * 100
    : 0;

  const saldoOrcamento = dashboardStats.orcamento_previsto - dashboardStats.orcamento_realizado;

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Combustível</h1>
            <p className="text-gray-600">Visão geral do consumo e orçamento de combustível</p>
          </div>
          <div className="flex gap-2">
            <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano.toString()} onValueChange={(v) => setAno(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map((a) => (
                  <SelectItem key={a} value={a.toString()}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumo Mensal (Litros)</CardTitle>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {dashboardStats.consumo_mensal_litros.toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} L
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Total de litros consumidos no mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumo Mensal (Valor)</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(dashboardStats.consumo_mensal_valor)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Total gasto no mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orçamento</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {formatCurrency(dashboardStats.orcamento_realizado)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {percentualOrcamento.toFixed(1)}% de {formatCurrency(dashboardStats.orcamento_previsto)}
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      percentualOrcamento > 100 ? 'bg-red-500' :
                      percentualOrcamento > 80 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentualOrcamento, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes de Aprovação</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {dashboardStats.abastecimentos_pendentes || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Solicitações aguardando aprovação
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Saldo do Orçamento e Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Saldo do Orçamento
              </CardTitle>
              <CardDescription>Disponível para o mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                saldoOrcamento < 0 ? 'text-red-500' :
                saldoOrcamento < (dashboardStats.orcamento_previsto * 0.2) ? 'text-orange-500' :
                'text-green-500'
              }`}>
                {formatCurrency(saldoOrcamento)}
              </div>
              {saldoOrcamento < 0 && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Orçamento estourado
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas Ativos
              </CardTitle>
              <CardDescription>Requerem atenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {alerts?.totalCount || 0}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Alertas não resolvidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Consumo por Veículo e Colaborador */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Top Veículos por Consumo
              </CardTitle>
              <CardDescription>Maiores consumidores do mês</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardStats.consumo_por_veiculo.length > 0 ? (
                <div className="space-y-3">
                  {dashboardStats.consumo_por_veiculo
                    .sort((a, b) => b.total_valor - a.total_valor)
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={item.veiculo_id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.veiculo_placa || 'N/A'}</p>
                            <p className="text-xs text-gray-500">
                              {item.total_litros.toFixed(2)} L
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(item.total_valor)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum consumo registrado no período
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Colaboradores por Consumo
              </CardTitle>
              <CardDescription>Maiores consumidores do mês</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardStats.consumo_por_colaborador.length > 0 ? (
                <div className="space-y-3">
                  {dashboardStats.consumo_por_colaborador
                    .sort((a, b) => b.total_valor - a.total_valor)
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={item.condutor_id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.condutor_nome || 'N/A'}</p>
                            <p className="text-xs text-gray-500">
                              {item.total_litros.toFixed(2)} L
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(item.total_valor)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum consumo registrado no período
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Solicitações Pendentes */}
        {pendingRequests && pendingRequests.totalCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Solicitações Pendentes de Aprovação
              </CardTitle>
              <CardDescription>
                {pendingRequests.totalCount} solicitação(ões) aguardando aprovação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingRequests.data.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{request.numero_solicitacao}</p>
                      <p className="text-sm text-gray-500">
                        {request.veiculo_placa} • {request.condutor_nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(request.valor_solicitado)}</p>
                      <Badge variant="outline" className="mt-1">
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {pendingRequests.totalCount > 5 && (
                <Button variant="outline" className="w-full mt-4">
                  Ver todas as solicitações ({pendingRequests.totalCount})
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RequireModule>
  );
}

