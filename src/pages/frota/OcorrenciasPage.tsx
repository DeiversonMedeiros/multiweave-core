// =====================================================
// PÁGINA DE OCORRÊNCIAS
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
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Car,
  Users,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { useOccurrences, useDeleteOccurrence } from '@/hooks/frota/useFrotaData';
import { VehicleOccurrence, OccurrenceType, OccurrenceStatus } from '@/types/frota';
import IncidentForm from '@/components/frota/IncidentForm';

export default function OcorrenciasPage() {
  const [filters, setFilters] = useState({
    search: '',
    vehicle_id: '',
    driver_id: '',
    tipo: '',
    status: '',
    limit: 50,
    offset: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<VehicleOccurrence | null>(null);

  const { data: occurrences, isLoading, refetch } = useOccurrences(filters);
  const deleteOccurrence = useDeleteOccurrence();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta ocorrência?')) {
      await deleteOccurrence.mutateAsync(id);
    }
  };

  const handleNewOccurrence = () => {
    setSelectedOccurrence(null);
    setIsFormOpen(true);
  };

  const handleEditOccurrence = (occurrence: VehicleOccurrence) => {
    setSelectedOccurrence(occurrence);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedOccurrence(null);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const getTypeBadge = (tipo: OccurrenceType) => {
    const variants = {
      multa: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      sinistro: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <Badge variant="outline" className={variants[tipo]}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: OccurrenceStatus) => {
    const variants = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pago: 'bg-green-100 text-green-800 border-green-200',
      contestacao: 'bg-blue-100 text-blue-800 border-blue-200',
      encerrado: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: OccurrenceStatus) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'pago':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'contestacao':
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      case 'encerrado':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalCost = () => {
    if (!occurrences) return 0;
    return (occurrences as VehicleOccurrence[])
      .filter(o => o.status === 'pago')
      .reduce((total, o) => total + (o.valor || 0), 0);
  };

  const getPendingCost = () => {
    if (!occurrences) return 0;
    return (occurrences as VehicleOccurrence[])
      .filter(o => o.status === 'pendente')
      .reduce((total, o) => total + (o.valor || 0), 0);
  };

  const getContestationCount = () => {
    if (!occurrences) return 0;
    return (occurrences as VehicleOccurrence[])
      .filter(o => o.status === 'contestacao')
      .length;
  };

  const getOccurrencesByType = (tipo: OccurrenceType) => {
    if (!occurrences) return 0;
    return (occurrences as VehicleOccurrence[])
      .filter(o => o.tipo === tipo)
      .length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ocorrências</h1>
          <p className="text-gray-600">Controle de multas e sinistros</p>
        </div>
        <Button 
          className="bg-[#049940] hover:bg-[#038830]"
          onClick={handleNewOccurrence}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Ocorrência
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Ocorrências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#049940]">{occurrences?.length || 0}</div>
            <p className="text-xs text-gray-600">Este período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Multas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getOccurrencesByType('multa')}</div>
            <p className="text-xs text-gray-600">
              {Math.round((getOccurrencesByType('multa') / (occurrences?.length || 1)) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sinistros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getOccurrencesByType('sinistro')}</div>
            <p className="text-xs text-gray-600">
              {Math.round((getOccurrencesByType('sinistro') / (occurrences?.length || 1)) * 100)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalCost())}</div>
            <p className="text-xs text-gray-600">Ocorrências pagas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(getPendingCost())}</div>
            <p className="text-xs text-gray-600">Valor pendente</p>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por descrição, local..."
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

            <Select 
              value={filters.tipo} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="multa">Multa</SelectItem>
                <SelectItem value="sinistro">Sinistro</SelectItem>
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
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="contestacao">Contestação</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', vehicle_id: 'all', driver_id: 'all', tipo: 'all', status: 'all', limit: 50, offset: 0 })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Ocorrências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Ocorrências</span>
            <span className="text-sm font-normal text-gray-500">
              {occurrences?.length || 0} ocorrências encontradas
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
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Condutor</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occurrences && occurrences.length > 0 ? (
                    (occurrences as VehicleOccurrence[]).map((occurrence) => (
                      <TableRow key={occurrence.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-[#049940]" />
                            <span className="text-sm">{formatDate(occurrence.data)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(occurrence.tipo)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Car className="w-4 h-4 mr-2 text-[#93C21E]" />
                            <span className="font-medium">{occurrence.placa}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {occurrence.condutor_nome ? (
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-2 text-blue-500" />
                              <span>{occurrence.condutor_nome}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-sm">{occurrence.local || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm font-medium truncate">{occurrence.descricao}</div>
                            {occurrence.observacoes && (
                              <div className="text-xs text-gray-500 truncate">{occurrence.observacoes}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                            <span className="font-medium">{formatCurrency(occurrence.valor || 0)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getStatusIcon(occurrence.status)}
                            <span className="ml-2">{getStatusBadge(occurrence.status)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditOccurrence(occurrence)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {occurrence.arquivo_url && (
                              <Button variant="ghost" size="sm">
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(occurrence.id)}
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
                          <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500">Nenhuma ocorrência encontrada</p>
                          <p className="text-sm text-gray-400">
                            {filters.search || filters.vehicle_id || filters.driver_id || filters.tipo || filters.status
                              ? 'Tente ajustar os filtros de busca'
                              : 'Comece registrando uma nova ocorrência'
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
      {occurrences && occurrences.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {filters.offset + occurrences.length} de {occurrences.length} ocorrências
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
              disabled={occurrences.length < filters.limit}
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Alertas de Contestação */}
      {occurrences && occurrences.length > 0 && getContestationCount() > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Ocorrências em Contestação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(occurrences as VehicleOccurrence[])
                .filter(o => o.status === 'contestacao')
                .map((occurrence) => (
                  <div key={occurrence.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                    <div>
                      <p className="font-medium text-sm">
                        {occurrence.placa} - {occurrence.tipo.charAt(0).toUpperCase() + occurrence.tipo.slice(1)}
                      </p>
                      <p className="text-xs text-gray-600">{occurrence.descricao}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(occurrence.data)} - {formatCurrency(occurrence.valor || 0)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTypeBadge(occurrence.tipo)}
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                        <FileText className="w-4 h-4 mr-1" />
                        Acompanhar
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Ocorrência */}
      <IncidentForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        incident={selectedOccurrence}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
