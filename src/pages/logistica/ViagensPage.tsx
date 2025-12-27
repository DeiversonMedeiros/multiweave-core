// =====================================================
// VIAGENS
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Route, 
  Plus, 
  Search, 
  Filter,
  Truck,
  User,
  Calendar,
  MapPin,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useTrips, useLogisticsRequests, useUpdateTripStatus, useCreateTrip } from '@/hooks/logistica/useLogisticaData';
import { useVehicles, useDrivers } from '@/hooks/frota/useFrotaData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ViagensPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: trips, isLoading: tripsLoading, refetch } = useTrips({ limit: 100 });
  const { data: approvedRequests } = useLogisticsRequests({ status: 'aprovado', limit: 100 });
  const { data: pendingRequests, isLoading: pendingRequestsLoading } = useLogisticsRequests({ status: 'pendente', limit: 100 });
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const updateTripStatus = useUpdateTripStatus();

  const filteredTrips = (trips || []).filter(trip => {
    const matchesSearch = 
      trip.request_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.vehicle_placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || trip.vehicle_id === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  const filteredPendingRequests = (pendingRequests || []).filter(request => {
    const matchesSearch = 
      request.numero_solicitacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.endereco_retirada?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.endereco_entrega?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.solicitado_por_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" />Agendada</Badge>;
      case 'em_viagem':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Truck className="w-3 h-3 mr-1" />Em Viagem</Badge>;
      case 'concluida':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Concluída</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusChange = async (tripId: string, newStatus: string) => {
    try {
      await updateTripStatus.mutateAsync({
        tripId,
        status: newStatus as any,
      });
      refetch();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  if (tripsLoading || pendingRequestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Viagens</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie viagens e acompanhe o status das entregas
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#049940] hover:bg-[#038830]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Viagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Viagem</DialogTitle>
              <DialogDescription>
                Crie uma nova viagem baseada em uma solicitação aprovada
              </DialogDescription>
            </DialogHeader>
            <CreateTripForm 
              requests={approvedRequests || []} 
              vehicles={vehicles || []} 
              drivers={drivers || []}
              onSuccess={() => {
                setIsCreateModalOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, placa, condutor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="em_viagem">Em Viagem</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(vehicles || []).map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} {vehicle.modelo && `- ${vehicle.modelo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setVehicleFilter('all');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solicitações Pendentes */}
      {filteredPendingRequests && filteredPendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Solicitações Pendentes ({filteredPendingRequests.length})
            </CardTitle>
            <CardDescription>
              Solicitações aguardando aprovação para criação de viagem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Package className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{request.numero_solicitacao || 'Sem número'}</h3>
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                <Clock className="w-3 h-3 mr-1" />Pendente
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Criada em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Retirada</p>
                              <p className="text-sm font-medium">{request.endereco_retirada}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Entrega</p>
                              <p className="text-sm font-medium">{request.endereco_entrega}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Previsão Envio</p>
                              <p className="text-sm font-medium">
                                {format(new Date(request.previsao_envio), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Prazo Destino</p>
                              <p className="text-sm font-medium">
                                {format(new Date(request.prazo_destino), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          {request.km_estimado && (
                            <div className="flex items-center gap-2">
                              <Route className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">KM Estimado</p>
                                <p className="text-sm font-medium">{request.km_estimado} km</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {request.solicitado_por_nome && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Solicitado por: <strong>{request.solicitado_por_nome}</strong>
                            </span>
                          </div>
                        )}

                        {request.project_nome && (
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Projeto: <strong>{request.project_nome}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Viagens */}
      <Card>
        <CardHeader>
          <CardTitle>Viagens ({filteredTrips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTrips.length > 0 ? (
            <div className="space-y-4">
              {filteredTrips.map((trip) => (
                <Card key={trip.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Route className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{trip.request_numero || 'Sem número'}</h3>
                              {getStatusBadge(trip.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Criada em {format(new Date(trip.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Veículo</p>
                              <p className="text-sm font-medium">{trip.vehicle_placa || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Condutor</p>
                              <p className="text-sm font-medium">{trip.driver_nome || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Data de Saída</p>
                              <p className="text-sm font-medium">
                                {format(new Date(trip.data_saida), "dd/MM/yyyy", { locale: ptBR })}
                                {trip.hora_saida && ` às ${trip.hora_saida}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {trip.km_inicial && (
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">KM Inicial: <strong>{trip.km_inicial}</strong></span>
                            {trip.km_final && (
                              <>
                                <span className="text-muted-foreground">KM Final: <strong>{trip.km_final}</strong></span>
                                {trip.km_percorrido && (
                                  <span className="text-muted-foreground">KM Percorrido: <strong>{trip.km_percorrido}</strong></span>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {trip.project_nome && (
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Projeto: <strong>{trip.project_nome}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        {trip.status === 'agendada' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(trip.id, 'em_viagem')}
                            >
                              Iniciar Viagem
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(trip.id, 'cancelada')}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {trip.status === 'em_viagem' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(trip.id, 'concluida')}
                          >
                            Finalizar Viagem
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma viagem encontrada</p>
              <p className="text-sm">Crie uma nova viagem para começar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de formulário para criar viagem
function CreateTripForm({ 
  requests, 
  vehicles, 
  drivers, 
  onSuccess 
}: { 
  requests: any[]; 
  vehicles: any[]; 
  drivers: any[]; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    request_id: '',
    vehicle_id: '',
    driver_id: '',
    data_saida: format(new Date(), 'yyyy-MM-dd'),
    hora_saida: '',
    km_inicial: '',
    project_id: '',
    cost_center_id: '',
    os_number: '',
    observacoes: ''
  });

  const createTrip = useCreateTrip();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTrip.mutate({
      request_id: formData.request_id,
      vehicle_id: formData.vehicle_id,
      driver_id: formData.driver_id,
      data_saida: formData.data_saida,
      hora_saida: formData.hora_saida || undefined,
      km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : undefined,
      project_id: formData.project_id || undefined,
      cost_center_id: formData.cost_center_id || undefined,
      os_number: formData.os_number || undefined,
      observacoes: formData.observacoes || undefined,
    }, {
      onSuccess: () => {
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="request_id">Solicitação *</Label>
        <Select value={formData.request_id} onValueChange={(v) => setFormData(prev => ({ ...prev, request_id: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma solicitação aprovada" />
          </SelectTrigger>
          <SelectContent>
            {requests.map(req => (
              <SelectItem key={req.id} value={req.id}>
                {req.numero_solicitacao} - {req.endereco_retirada} → {req.endereco_entrega}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vehicle_id">Veículo *</Label>
          <Select value={formData.vehicle_id} onValueChange={(v) => setFormData(prev => ({ ...prev, vehicle_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um veículo" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map(vehicle => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa} {vehicle.modelo && `- ${vehicle.modelo}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver_id">Condutor *</Label>
          <Select value={formData.driver_id} onValueChange={(v) => setFormData(prev => ({ ...prev, driver_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um condutor" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map(driver => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_saida">Data de Saída *</Label>
          <Input
            id="data_saida"
            type="date"
            value={formData.data_saida}
            onChange={(e) => setFormData(prev => ({ ...prev, data_saida: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hora_saida">Hora de Saída</Label>
          <Input
            id="hora_saida"
            type="time"
            value={formData.hora_saida}
            onChange={(e) => setFormData(prev => ({ ...prev, hora_saida: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="km_inicial">KM Inicial</Label>
        <Input
          id="km_inicial"
          type="number"
          step="0.01"
          value={formData.km_inicial}
          onChange={(e) => setFormData(prev => ({ ...prev, km_inicial: e.target.value }))}
          placeholder="Deixe em branco para usar KM atual do veículo"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createTrip.isPending || !formData.request_id || !formData.vehicle_id || !formData.driver_id}>
          {createTrip.isPending ? 'Criando...' : 'Criar Viagem'}
        </Button>
      </div>
    </form>
  );
}
