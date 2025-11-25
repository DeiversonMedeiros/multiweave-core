// =====================================================
// DASHBOARD DE FROTA
// Sistema ERP MultiWeave Core
// =====================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  Users, 
  Wrench, 
  FileText, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react';
import { useFrotaDashboard, useUpcomingMaintenances, useExpiringDocuments } from '@/hooks/frota/useFrotaData';
import { FrotaDashboardStats, UpcomingMaintenance, ExpiringDocument } from '@/types/frota';

export default function DashboardFrota() {
  const { data: dashboardStats, isLoading: statsLoading } = useFrotaDashboard();
  const { data: upcomingMaintenances, isLoading: maintenancesLoading } = useUpcomingMaintenances(30);
  const { data: expiringDocuments, isLoading: documentsLoading } = useExpiringDocuments(30);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
      </div>
    );
  }

  const stats = dashboardStats as FrotaDashboardStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Frota</h1>
          <p className="text-gray-600">Visão geral da gestão de veículos</p>
        </div>
        <Button className="bg-[#049940] hover:bg-[#038830]">
          <Car className="w-4 h-4 mr-2" />
          Novo Veículo
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Veículos</CardTitle>
            <Car className="h-4 w-4 text-[#049940]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#049940]">{stats?.total_veiculos || 0}</div>
            <p className="text-xs text-gray-600">
              {stats?.veiculos_ativos || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos por Tipo</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#93C21E]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Próprios:</span>
                <span className="font-medium">{stats?.veiculos_proprios || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Locados:</span>
                <span className="font-medium">{stats?.veiculos_locados || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Agregados:</span>
                <span className="font-medium">{stats?.veiculos_agregados || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manutenções</CardTitle>
            <Wrench className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats?.manutencoes_proximas || 0}
            </div>
            <p className="text-xs text-gray-600">
              Próximas 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.documentos_vencer || 0}
            </div>
            <p className="text-xs text-gray-600">
              Vencendo em 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Notificações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Manutenções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="w-5 h-5 mr-2 text-orange-500" />
              Próximas Manutenções
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maintenancesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#049940]"></div>
              </div>
            ) : upcomingMaintenances && upcomingMaintenances.length > 0 ? (
              <div className="space-y-3">
                {(upcomingMaintenances as UpcomingMaintenance[]).slice(0, 5).map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{maintenance.placa}</p>
                      <p className="text-xs text-gray-600">{maintenance.descricao}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        {maintenance.tipo}
                      </Badge>
                      {maintenance.data_agendada && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(maintenance.data_agendada).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {upcomingMaintenances.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full">
                    Ver todas ({upcomingMaintenances.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Nenhuma manutenção próxima</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos Vencendo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-red-500" />
              Documentos Vencendo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#049940]"></div>
              </div>
            ) : expiringDocuments && expiringDocuments.length > 0 ? (
              <div className="space-y-3">
                {(expiringDocuments as ExpiringDocument[]).slice(0, 5).map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{document.placa}</p>
                      <p className="text-xs text-gray-600">{document.tipo.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={`${
                          document.dias_para_vencer <= 7 
                            ? 'text-red-600 border-red-200 bg-red-100' 
                            : 'text-orange-600 border-orange-200 bg-orange-100'
                        }`}
                      >
                        {document.dias_para_vencer} dias
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(document.vencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {expiringDocuments.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full">
                    Ver todos ({expiringDocuments.length})
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Nenhum documento vencendo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
              Ocorrências Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.ocorrencias_pendentes || 0}
            </div>
            <p className="text-xs text-gray-600">Multas e sinistros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              Vistorias do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.vistorias_mes || 0}
            </div>
            <p className="text-xs text-gray-600">Realizadas este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-yellow-500" />
              Em Manutenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stats?.veiculos_manutencao || 0}
            </div>
            <p className="text-xs text-gray-600">Veículos indisponíveis</p>
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
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Car className="w-6 h-6 mb-2" />
              <span className="text-sm">Novo Veículo</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Users className="w-6 h-6 mb-2" />
              <span className="text-sm">Novo Condutor</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Wrench className="w-6 h-6 mb-2" />
              <span className="text-sm">Nova Manutenção</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <FileText className="w-6 h-6 mb-2" />
              <span className="text-sm">Nova Vistoria</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
