// =====================================================
// PÁGINA DE MANUTENÇÕES
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Car,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useMaintenances, useDeleteMaintenance } from '@/hooks/frota/useFrotaData';
import { VehicleMaintenance, MaintenanceType, MaintenanceStatus } from '@/types/frota';
import MaintenanceForm from '@/components/frota/MaintenanceForm';

export default function ManutencoesPage() {
  const location = useLocation();
  const [filters, setFilters] = useState({
    search: '',
    vehicle_id: '',
    tipo: '',
    status: '',
    limit: 50,
    offset: 0
  });

  // Aplicar filtro de vehicle_id se vier da navegação
  useEffect(() => {
    if (location.state?.vehicleId) {
      setFilters(prev => ({ ...prev, vehicle_id: location.state.vehicleId }));
      // Limpar o state após aplicar para não manter o filtro em navegações futuras
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<VehicleMaintenance | null>(null);

  const { data: maintenances, isLoading, refetch } = useMaintenances(filters);
  const deleteMaintenance = useDeleteMaintenance();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      await deleteMaintenance.mutateAsync(id);
    }
  };

  const handleNewMaintenance = () => {
    setSelectedMaintenance(null);
    setIsFormOpen(true);
  };

  const handleEditMaintenance = (maintenance: VehicleMaintenance) => {
    setSelectedMaintenance(maintenance);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedMaintenance(null);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const getTypeBadge = (tipo: MaintenanceType) => {
    const variants = {
      preventiva: 'bg-blue-100 text-blue-800 border-blue-200',
      corretiva: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge variant="outline" className={variants[tipo]}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    const variants = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      em_execucao: 'bg-blue-100 text-blue-800 border-blue-200',
      finalizada: 'bg-green-100 text-green-800 border-green-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (dataAgendada?: string, kmProxima?: number, quilometragemAtual?: number) => {
    if (!dataAgendada && !kmProxima) return null;
    
    const hoje = new Date();
    
    if (dataAgendada) {
      const dataAgendadaDate = new Date(dataAgendada);
      const diasParaAgendamento = Math.ceil((dataAgendadaDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasParaAgendamento < 0) {
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Atrasada</Badge>;
      } else if (diasParaAgendamento <= 3) {
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Urgente</Badge>;
      } else if (diasParaAgendamento <= 7) {
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Próxima</Badge>;
      }
    }
    
    if (kmProxima && quilometragemAtual) {
      const kmRestantes = kmProxima - quilometragemAtual;
      if (kmRestantes <= 0) {
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Atrasada</Badge>;
      } else if (kmRestantes <= 500) {
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Urgente</Badge>;
      } else if (kmRestantes <= 1000) {
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Próxima</Badge>;
      }
    }
    
    return null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalCost = () => {
    if (!maintenances) return 0;
    return (maintenances as VehicleMaintenance[])
      .filter(m => m.status === 'finalizada')
      .reduce((total, m) => total + (m.valor || 0), 0);
  };

  const getPendingCount = () => {
    if (!maintenances) return 0;
    return (maintenances as VehicleMaintenance[])
      .filter(m => m.status === 'pendente')
      .length;
  };

  const getOverdueCount = () => {
    if (!maintenances) return 0;
    const hoje = new Date();
    return (maintenances as VehicleMaintenance[])
      .filter(m => {
        if (m.status !== 'pendente') return false;
        if (m.data_agendada) {
          return new Date(m.data_agendada) < hoje;
        }
        if (m.km_proxima && m.quilometragem_atual) {
          return m.km_proxima <= m.quilometragem_atual;
        }
        return false;
      })
      .length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manutenções</h1>
          <p className="text-gray-600">Controle de manutenções preventivas e corretivas</p>
        </div>
        <Button 
          className="bg-[#049940] hover:bg-[#038830]"
          onClick={handleNewMaintenance}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Manutenção
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Manutenções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#049940]">{maintenances?.length || 0}</div>
            <p className="text-xs text-gray-600">Este período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalCost())}</div>
            <p className="text-xs text-gray-600">Manutenções finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getPendingCount()}</div>
            <p className="text-xs text-gray-600">Aguardando execução</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getOverdueCount()}</div>
            <p className="text-xs text-gray-600">Fora do prazo</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por descrição, oficina..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.vehicle_id} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, vehicle_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {/* Aqui você pode carregar a lista de veículos */}
              </SelectContent>
            </Select>

            <Select 
              value={filters.tipo} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_execucao">Em Execução</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', vehicle_id: 'all', tipo: 'all', status: 'all', limit: 50, offset: 0 })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Manutenções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Manutenções</span>
            <span className="text-sm font-normal text-gray-500">
              {maintenances?.length || 0} manutenções encontradas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Oficina</TableHead>
                    <TableHead>Data Agendada</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances && maintenances.length > 0 ? (
                    (maintenances as VehicleMaintenance[]).map((maintenance) => (
                      <TableRow key={maintenance.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-2 text-[#93C21E]" />
                            <div>
                              <div className="font-medium">{maintenance.placa}</div>
                              <div className="text-sm text-gray-500">
                                {maintenance.marca} {maintenance.modelo}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(maintenance.tipo)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm font-medium truncate">{maintenance.descricao}</div>
                            {maintenance.observacoes && (
                              <div className="text-xs text-gray-500 truncate">{maintenance.observacoes}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {maintenance.oficina || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div className="text-sm">{formatDate(maintenance.data_agendada)}</div>
                              {maintenance.data_realizada && (
                                <div className="text-xs text-gray-500">
                                  Realizada: {formatDate(maintenance.data_realizada)}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                            <span className="font-medium">{formatCurrency(maintenance.valor || 0)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(maintenance.status)}
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(maintenance.data_agendada, maintenance.km_proxima, maintenance.quilometragem_atual)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditMaintenance(maintenance)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {maintenance.status === 'pendente' && (
                              <Button variant="ghost" size="sm" className="text-green-600">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(maintenance.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Wrench className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500">Nenhuma manutenção encontrada</p>
                          <p className="text-sm text-gray-400">
                            {filters.search || filters.vehicle_id || filters.tipo || filters.status
                              ? 'Tente ajustar os filtros de busca'
                              : 'Comece criando uma nova manutenção'
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {maintenances && maintenances.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {filters.offset + maintenances.length} de {maintenances.length} manutenções
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={filters.offset === 0}
              onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={maintenances.length < filters.limit}
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Alertas de Manutenções Atrasadas */}
      {maintenances && maintenances.length > 0 && getOverdueCount() > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Manutenções Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(maintenances as VehicleMaintenance[])
                .filter(m => {
                  if (m.status !== 'pendente') return false;
                  const hoje = new Date();
                  if (m.data_agendada) {
                    return new Date(m.data_agendada) < hoje;
                  }
                  if (m.km_proxima && m.quilometragem_atual) {
                    return m.km_proxima <= m.quilometragem_atual;
                  }
                  return false;
                })
                .map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-sm">{maintenance.placa} - {maintenance.descricao}</p>
                      <p className="text-xs text-gray-600">
                        {maintenance.data_agendada 
                          ? `Agendada para ${formatDate(maintenance.data_agendada)}`
                          : `KM: ${maintenance.km_proxima?.toLocaleString('pt-BR')} (atual: ${maintenance.quilometragem_atual?.toLocaleString('pt-BR')})`
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTypeBadge(maintenance.tipo)}
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                        <Settings className="w-4 h-4 mr-1" />
                        Executar
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Manutenção */}
      <MaintenanceForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        maintenance={selectedMaintenance}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
