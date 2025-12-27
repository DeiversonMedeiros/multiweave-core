// =====================================================
// PÁGINA DE VEÍCULOS
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Wrench,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useVehicles, useDeleteVehicle, useVehicle, useVehicleDocuments } from '@/hooks/frota/useFrotaData';
import { Vehicle, VehicleType, VehicleStatus } from '@/types/frota';
import VehicleForm from '@/components/frota/VehicleForm';
import { VehicleDocumentsTab } from '@/components/frota/VehicleDocumentsTab';

export default function VeiculosPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    tipo: '',
    situacao: '',
    limit: 50,
    offset: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDocumentsDialogOpen, setIsDocumentsDialogOpen] = useState(false);
  const [viewingVehicleId, setViewingVehicleId] = useState<string | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles, isLoading, refetch } = useVehicles(filters);
  const deleteVehicle = useDeleteVehicle();
  const { data: vehicleDetails, isLoading: isLoadingDetails } = useVehicle(viewingVehicleId || '');
  const { data: vehicleDocuments, isLoading: isLoadingDocuments } = useVehicleDocuments(viewingVehicleId || '');

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      await deleteVehicle.mutateAsync(id);
    }
  };

  const handleNewVehicle = () => {
    setSelectedVehicle(null);
    setIsFormOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedVehicle(null);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setViewingVehicle(vehicle);
    setViewingVehicleId(vehicle.id);
    setIsViewDialogOpen(true);
  };

  const handleViewMaintenances = (vehicle: Vehicle) => {
    navigate('/frota/manutencoes', { state: { vehicleId: vehicle.id } });
  };

  const handleViewDocuments = (vehicle: Vehicle) => {
    setViewingVehicleId(vehicle.id);
    setIsDocumentsDialogOpen(true);
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const variants = {
      ativo: 'bg-green-100 text-green-800 border-green-200',
      inativo: 'bg-gray-100 text-gray-800 border-gray-200',
      manutencao: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (tipo: VehicleType) => {
    const variants = {
      proprio: 'bg-blue-100 text-blue-800 border-blue-200',
      locado: 'bg-purple-100 text-purple-800 border-purple-200',
      agregado: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    return (
      <Badge variant="outline" className={variants[tipo]}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Veículos</h1>
          <p className="text-gray-600">Gestão da frota de veículos</p>
        </div>
        <Button 
          className="bg-[#049940] hover:bg-[#038830]"
          onClick={handleNewVehicle}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Veículo
        </Button>
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
                placeholder="Buscar por placa, marca, modelo..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.tipo} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="proprio">Próprio</SelectItem>
                <SelectItem value="locado">Locado</SelectItem>
                <SelectItem value="agregado">Agregado</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.situacao} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, situacao: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="manutencao">Em Manutenção</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', tipo: 'all', situacao: 'all', limit: 50, offset: 0 })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Veículos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Veículos</span>
            <span className="text-sm font-normal text-gray-500">
              {vehicles?.length || 0} veículos encontrados
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
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Quilometragem</TableHead>
                    <TableHead>Condutor Atual</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles && vehicles.length > 0 ? (
                    (vehicles as Vehicle[]).map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-2 text-[#049940]" />
                            {vehicle.placa}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{vehicle.marca}</div>
                            <div className="text-sm text-gray-500">{vehicle.modelo}</div>
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.ano}</TableCell>
                        <TableCell>{getTypeBadge(vehicle.tipo)}</TableCell>
                        <TableCell>{getStatusBadge(vehicle.situacao)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {vehicle.quilometragem.toLocaleString('pt-BR')} km
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle.condutor_atual ? (
                            <div className="text-sm">
                              <div className="font-medium">{vehicle.condutor_atual}</div>
                              <div className="text-gray-500">Em uso</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Disponível</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewVehicle(vehicle)}
                              title="Visualizar detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditVehicle(vehicle)}
                              title="Editar veículo"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewMaintenances(vehicle)}
                              title="Ver manutenções"
                            >
                              <Wrench className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewDocuments(vehicle)}
                              title="Ver documentos"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(vehicle.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Excluir veículo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Car className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500">Nenhum veículo encontrado</p>
                          <p className="text-sm text-gray-400">
                            {filters.search || filters.tipo || filters.situacao 
                              ? 'Tente ajustar os filtros de busca'
                              : 'Comece adicionando um novo veículo'
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
      {vehicles && vehicles.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {filters.offset + vehicles.length} de {vehicles.length} veículos
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
              disabled={vehicles.length < filters.limit}
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Formulário de Veículo */}
      <VehicleForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        vehicle={selectedVehicle}
        onSuccess={handleFormSuccess}
      />

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Detalhes do Veículo
            </DialogTitle>
            <DialogDescription>
              Informações completas do veículo
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetails && !vehicleDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
            </div>
          ) : (vehicleDetails || viewingVehicle) ? (
            <div className="space-y-4">
              {(() => {
                const vehicle = vehicleDetails || viewingVehicle;
                if (!vehicle) return null;
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Placa</p>
                      <p className="text-base font-semibold">{vehicle.placa}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Marca</p>
                      <p className="text-base">{vehicle.marca || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Modelo</p>
                      <p className="text-base">{vehicle.modelo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ano</p>
                      <p className="text-base">{vehicle.ano || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cor</p>
                      <p className="text-base">{vehicle.cor || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tipo</p>
                      <div>{getTypeBadge(vehicle.tipo)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Situação</p>
                      <div>{getStatusBadge(vehicle.situacao)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Quilometragem</p>
                      <p className="text-base">
                        {typeof vehicle.quilometragem === 'number' 
                          ? vehicle.quilometragem.toLocaleString('pt-BR') 
                          : vehicle.quilometragem || '0'} km
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">RENAVAM</p>
                      <p className="text-base">{vehicle.renavam || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Chassi</p>
                      <p className="text-base">{vehicle.chassi || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Locadora</p>
                      <p className="text-base">{vehicle.locadora || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Criado em</p>
                      <p className="text-base">
                        {vehicle.created_at 
                          ? new Date(vehicle.created_at).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Não foi possível carregar os detalhes do veículo</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Documentos */}
      <Dialog open={isDocumentsDialogOpen} onOpenChange={setIsDocumentsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos do Veículo
            </DialogTitle>
            <DialogDescription>
              Gerencie os documentos do veículo
            </DialogDescription>
          </DialogHeader>
          {viewingVehicleId && (
            <VehicleDocumentsTab vehicleId={viewingVehicleId} mode="edit" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
