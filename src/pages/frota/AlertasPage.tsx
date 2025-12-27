// =====================================================
// PÁGINA DE ALERTAS DO MÓDULO FROTA
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Wrench,
  Car,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Search
} from 'lucide-react';
import { useExpiringDocuments, useUpcomingMaintenances } from '@/hooks/frota/useFrotaData';
import { format, differenceInDays, isPast, isToday, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

type AlertType = 'document' | 'maintenance' | 'license' | 'inspection';
type AlertSeverity = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  vehicleId: string;
  vehiclePlaca: string;
  vehicleMarca?: string;
  vehicleModelo?: string;
  dueDate?: string;
  daysUntilDue?: number;
  status?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export default function AlertasPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    type: 'all' as 'all' | AlertType,
    severity: 'all' as 'all' | AlertSeverity,
    days: 30,
  });

  const { data: expiringDocuments = [], isLoading: loadingDocuments } = useExpiringDocuments(filters.days);
  const { data: upcomingMaintenances = [], isLoading: loadingMaintenances } = useUpcomingMaintenances(filters.days);

  // Transformar dados em alertas
  const alerts: Alert[] = React.useMemo(() => {
    const alertList: Alert[] = [];

    // Alertas de documentos vencendo
    (expiringDocuments as any[]).forEach((doc: any) => {
      const vencimento = doc.vencimento ? new Date(doc.vencimento) : null;
      const daysUntilDue = vencimento ? differenceInDays(vencimento, new Date()) : null;
      
      let severity: AlertSeverity = 'info';
      if (daysUntilDue !== null) {
        if (daysUntilDue < 0) {
          severity = 'critical';
        } else if (daysUntilDue <= 7) {
          severity = 'critical';
        } else if (daysUntilDue <= 15) {
          severity = 'warning';
        }
      }

      alertList.push({
        id: `doc-${doc.id}`,
        type: 'document',
        severity,
        title: `Documento ${doc.tipo?.toUpperCase()} vencendo`,
        description: `O documento ${doc.numero_documento || doc.tipo} do veículo ${doc.placa} está ${daysUntilDue && daysUntilDue < 0 ? 'vencido' : 'próximo do vencimento'}`,
        vehicleId: doc.vehicle_id,
        vehiclePlaca: doc.placa,
        vehicleMarca: doc.marca,
        vehicleModelo: doc.modelo,
        dueDate: doc.vencimento,
        daysUntilDue: daysUntilDue || undefined,
        status: doc.status,
        actionUrl: `/frota/veiculos`,
        metadata: { documentId: doc.id, documentType: doc.tipo },
      });
    });

    // Alertas de manutenções
    (upcomingMaintenances as any[]).forEach((maint: any) => {
      const dataAgendada = maint.data_agendada ? new Date(maint.data_agendada) : null;
      const daysUntilDue = dataAgendada ? differenceInDays(dataAgendada, new Date()) : null;
      
      let severity: AlertSeverity = 'info';
      if (daysUntilDue !== null) {
        if (daysUntilDue < 0) {
          severity = 'critical';
        } else if (daysUntilDue <= 3) {
          severity = 'critical';
        } else if (daysUntilDue <= 7) {
          severity = 'warning';
        }
      }

      alertList.push({
        id: `maint-${maint.id}`,
        type: 'maintenance',
        severity,
        title: `Manutenção ${maint.tipo} necessária`,
        description: maint.descricao || `Manutenção do veículo ${maint.placa}`,
        vehicleId: maint.vehicle_id,
        vehiclePlaca: maint.placa,
        vehicleMarca: maint.marca,
        vehicleModelo: maint.modelo,
        dueDate: maint.data_agendada,
        daysUntilDue: daysUntilDue || undefined,
        status: maint.status,
        actionUrl: `/frota/manutencoes`,
        metadata: { maintenanceId: maint.id, maintenanceType: maint.tipo },
      });
    });

    return alertList;
  }, [expiringDocuments, upcomingMaintenances]);

  // Filtrar alertas
  const filteredAlerts = alerts.filter(alert => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !alert.vehiclePlaca.toLowerCase().includes(searchLower) &&
        !alert.title.toLowerCase().includes(searchLower) &&
        !alert.description.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    if (filters.type !== 'all' && alert.type !== filters.type) {
      return false;
    }

    if (filters.severity !== 'all' && alert.severity !== filters.severity) {
      return false;
    }

    return true;
  });

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    const variants = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    
    const labels = {
      critical: 'Crítico',
      warning: 'Atenção',
      info: 'Informativo',
    };

    return (
      <Badge variant="outline" className={variants[severity]}>
        {labels[severity]}
      </Badge>
    );
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      case 'license':
        return <FileText className="w-4 h-4" />;
      case 'inspection':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: AlertType) => {
    const labels = {
      document: 'Documento',
      maintenance: 'Manutenção',
      license: 'Licença',
      inspection: 'Vistoria',
    };
    return labels[type];
  };

  const handleAlertClick = (alert: Alert) => {
    if (alert.actionUrl) {
      navigate(alert.actionUrl, { 
        state: alert.metadata 
      });
    }
  };

  const stats = {
    total: filteredAlerts.length,
    critical: filteredAlerts.filter(a => a.severity === 'critical').length,
    warning: filteredAlerts.filter(a => a.severity === 'warning').length,
    info: filteredAlerts.filter(a => a.severity === 'info').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-600">Acompanhe documentos, manutenções e vencimentos</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Alertas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Atenção</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Informativos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por placa, veículo..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            <Select 
              value={filters.type} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de alerta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="document">Documentos</SelectItem>
                <SelectItem value="maintenance">Manutenções</SelectItem>
                <SelectItem value="license">Licenças</SelectItem>
                <SelectItem value="inspection">Vistorias</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.severity} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as severidades</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Atenção</SelectItem>
                <SelectItem value="info">Informativo</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.days.toString()} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, days: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Próximos 7 dias</SelectItem>
                <SelectItem value="15">Próximos 15 dias</SelectItem>
                <SelectItem value="30">Próximos 30 dias</SelectItem>
                <SelectItem value="60">Próximos 60 dias</SelectItem>
                <SelectItem value="90">Próximos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <div className="space-y-4">
        {loadingDocuments || loadingMaintenances ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
              </div>
            </CardContent>
          </Card>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                alert.severity === 'critical' ? 'border-red-200' : 
                alert.severity === 'warning' ? 'border-yellow-200' : 
                'border-blue-200'
              }`}
              onClick={() => handleAlertClick(alert)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'critical' ? 'bg-red-100' : 
                      alert.severity === 'warning' ? 'bg-yellow-100' : 
                      'bg-blue-100'
                    }`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{alert.title}</h3>
                        {getSeverityBadge(alert.severity)}
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTypeIcon(alert.type)}
                          {getTypeLabel(alert.type)}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{alert.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Car className="w-4 h-4" />
                          <span className="font-medium">{alert.vehiclePlaca}</span>
                          {alert.vehicleMarca && alert.vehicleModelo && (
                            <span className="text-gray-400">
                              - {alert.vehicleMarca} {alert.vehicleModelo}
                            </span>
                          )}
                        </div>
                        
                        {alert.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(alert.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            {alert.daysUntilDue !== undefined && (
                              <span className={`ml-2 ${
                                alert.daysUntilDue < 0 ? 'text-red-600 font-semibold' :
                                alert.daysUntilDue <= 7 ? 'text-yellow-600 font-semibold' :
                                'text-gray-600'
                              }`}>
                                {alert.daysUntilDue < 0 
                                  ? `Vencido há ${Math.abs(alert.daysUntilDue)} dias`
                                  : alert.daysUntilDue === 0
                                  ? 'Vence hoje'
                                  : `Vence em ${alert.daysUntilDue} dias`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    Ver detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">Nenhum alerta encontrado</p>
                <p className="text-gray-400 text-sm mt-2">
                  {filters.search || filters.type !== 'all' || filters.severity !== 'all'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Todos os documentos e manutenções estão em dia!'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

