// =====================================================
// PÁGINA DE VISTORIAS
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Car,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useInspections, useDeleteInspection } from '@/hooks/frota/useFrotaData';
import { VehicleInspection } from '@/types/frota';
import InspectionForm from '@/components/frota/InspectionForm';

export default function VistoriasPage() {
  const [filters, setFilters] = useState({
    search: '',
    vehicle_id: '',
    driver_id: '',
    limit: 50,
    offset: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: inspections, isLoading, refetch } = useInspections(filters);
  const deleteInspection = useDeleteInspection();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta vistoria?')) {
      await deleteInspection.mutateAsync(id);
    }
  };

  const handleNewInspection = () => {
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const getStatusBadge = (assinaturaCondutor: boolean, assinaturaGestor: boolean) => {
    if (assinaturaCondutor && assinaturaGestor) {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completa</Badge>;
    } else if (assinaturaCondutor || assinaturaGestor) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Parcial</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Pendente</Badge>;
    }
  };

  const getIssuesCount = (avarias?: string) => {
    if (!avarias) return 0;
    return avarias.split('\n').filter(line => line.trim().length > 0).length;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vistorias</h1>
          <p className="text-gray-600">Controle de vistorias de veículos</p>
        </div>
        <Button 
          className="bg-[#049940] hover:bg-[#038830]"
          onClick={handleNewInspection}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Vistoria
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
                placeholder="Buscar por placa, condutor..."
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
              value={filters.driver_id} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, driver_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Condutor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os condutores</SelectItem>
                {/* Aqui você pode carregar a lista de condutores */}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', vehicle_id: 'all', driver_id: 'all', limit: 50, offset: 0 })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vistorias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Vistorias</span>
            <span className="text-sm font-normal text-gray-500">
              {inspections?.length || 0} vistorias encontradas
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
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Condutor</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>KM Inicial/Final</TableHead>
                    <TableHead>Avarias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections && inspections.length > 0 ? (
                    (inspections as VehicleInspection[]).map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-[#049940]" />
                            <div>
                              <div className="text-sm font-medium">{formatDate(inspection.data)}</div>
                              <div className="text-xs text-gray-500">{formatDateTime(inspection.data).split(' ')[1]}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-2 text-[#93C21E]" />
                            <span className="font-medium">{inspection.placa}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-blue-500" />
                            <span>{inspection.condutor_nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {inspection.base || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {inspection.km_inicial ? (
                              <div>
                                <div>Inicial: {inspection.km_inicial.toLocaleString('pt-BR')} km</div>
                                {inspection.km_final && (
                                  <div>Final: {inspection.km_final.toLocaleString('pt-BR')} km</div>
                                )}
                              </div>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getIssuesCount(inspection.avarias) > 0 ? (
                              <div className="flex items-center text-red-600">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                <span className="text-sm font-medium">{getIssuesCount(inspection.avarias)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-sm">OK</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(inspection.assinatura_condutor, inspection.assinatura_gestor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(inspection.id)}
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
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <FileText className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500">Nenhuma vistoria encontrada</p>
                          <p className="text-sm text-gray-400">
                            {filters.search || filters.vehicle_id || filters.driver_id
                              ? 'Tente ajustar os filtros de busca'
                              : 'Comece criando uma nova vistoria'
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
      {inspections && inspections.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {filters.offset + inspections.length} de {inspections.length} vistorias
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
              disabled={inspections.length < filters.limit}
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Estatísticas de Vistorias */}
      {inspections && inspections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Vistorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#049940]">{inspections.length}</div>
              <p className="text-xs text-gray-600">Este período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vistorias Completas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(inspections as VehicleInspection[]).filter(i => i.assinatura_condutor && i.assinatura_gestor).length}
              </div>
              <p className="text-xs text-gray-600">
                {Math.round(((inspections as VehicleInspection[]).filter(i => i.assinatura_condutor && i.assinatura_gestor).length / inspections.length) * 100)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Com Avarias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(inspections as VehicleInspection[]).filter(i => getIssuesCount(i.avarias) > 0).length}
              </div>
              <p className="text-xs text-gray-600">
                {Math.round(((inspections as VehicleInspection[]).filter(i => getIssuesCount(i.avarias) > 0).length / inspections.length) * 100)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {(inspections as VehicleInspection[]).filter(i => !i.assinatura_condutor || !i.assinatura_gestor).length}
              </div>
              <p className="text-xs text-gray-600">
                {Math.round(((inspections as VehicleInspection[]).filter(i => !i.assinatura_condutor || !i.assinatura_gestor).length / inspections.length) * 100)}% do total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulário de Vistoria */}
      <InspectionForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
