// =====================================================
// PÁGINA DE CONDUTORES
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
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Car,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useDrivers, useDeleteDriver } from '@/hooks/frota/useFrotaData';
import { Driver } from '@/types/frota';
import DriverForm from '@/components/frota/DriverForm';

export default function CondutoresPage() {
  const [filters, setFilters] = useState({
    search: '',
    ativo: '',
    limit: 50,
    offset: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const { data: drivers, isLoading, refetch } = useDrivers(filters);
  const deleteDriver = useDeleteDriver();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este condutor?')) {
      await deleteDriver.mutateAsync(id);
    }
  };

  const handleNewDriver = () => {
    setSelectedDriver(null);
    setIsFormOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedDriver(null);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const getStatusBadge = (ativo: boolean) => {
    return ativo ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        Ativo
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        Inativo
      </Badge>
    );
  };

  const getLicenseStatus = (cnhValidade?: string) => {
    if (!cnhValidade) return null;
    
    const hoje = new Date();
    const vencimento = new Date(cnhValidade);
    const diasParaVencer = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasParaVencer < 0) {
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Vencida</Badge>;
    } else if (diasParaVencer <= 30) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Vence em {diasParaVencer} dias
      </Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Válida</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Condutores</h1>
          <p className="text-gray-600">Gestão de condutores autorizados</p>
        </div>
        <Button 
          className="bg-[#049940] hover:bg-[#038830]"
          onClick={handleNewDriver}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Condutor
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, CPF, matrícula..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.ativo} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, ativo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="true">Ativo</SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', ativo: 'all', limit: 50, offset: 0 })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Condutores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Condutores</span>
            <span className="text-sm font-normal text-gray-500">
              {drivers?.length || 0} condutores encontrados
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
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>CNH</TableHead>
                    <TableHead>Validade CNH</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ADER</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers && drivers.length > 0 ? (
                    (drivers as Driver[]).map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-[#049940]" />
                            {driver.nome}
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.cpf ? (
                            <span className="font-mono text-sm">
                              {driver.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {driver.matricula || '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            {driver.cnh_numero ? (
                              <div className="text-sm">
                                <div className="font-medium">{driver.cnh_numero}</div>
                                <div className="text-gray-500">{driver.cnh_categoria}</div>
                              </div>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{formatDate(driver.cnh_validade)}</span>
                            {getLicenseStatus(driver.cnh_validade)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(driver.ativo)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {driver.ader_validade ? (
                              <div>
                                <div className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(driver.ader_validade)}
                                </div>
                                {new Date(driver.ader_validade) < new Date() && (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs mt-1">
                                    Vencida
                                  </Badge>
                                )}
                              </div>
                            ) : '-'}
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
                              onClick={() => handleEditDriver(driver)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Car className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(driver.id)}
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
                          <Users className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500">Nenhum condutor encontrado</p>
                          <p className="text-sm text-gray-400">
                            {filters.search || filters.ativo 
                              ? 'Tente ajustar os filtros de busca'
                              : 'Comece adicionando um novo condutor'
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
      {drivers && drivers.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {filters.offset + drivers.length} de {drivers.length} condutores
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
              disabled={drivers.length < filters.limit}
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Alertas de Vencimento */}
      {drivers && drivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Alertas de Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(drivers as Driver[]).filter(driver => {
                if (!driver.cnh_validade) return false;
                const hoje = new Date();
                const vencimento = new Date(driver.cnh_validade);
                const diasParaVencer = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                return diasParaVencer <= 30 && diasParaVencer >= 0;
              }).map((driver) => (
                <div key={driver.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{driver.nome}</p>
                    <p className="text-xs text-gray-600">CNH vence em {Math.ceil((new Date(driver.cnh_validade!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias</p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    {driver.cnh_categoria}
                  </Badge>
                </div>
              ))}
              {(drivers as Driver[]).filter(driver => {
                if (!driver.ader_validade) return false;
                const hoje = new Date();
                const vencimento = new Date(driver.ader_validade);
                const diasParaVencer = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                return diasParaVencer <= 30 && diasParaVencer >= 0;
              }).map((driver) => (
                <div key={`ader-${driver.id}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{driver.nome}</p>
                    <p className="text-xs text-gray-600">ADER vence em {Math.ceil((new Date(driver.ader_validade!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias</p>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    ADER
                  </Badge>
                </div>
              ))}
              {(drivers as Driver[]).filter(driver => {
                if (!driver.cnh_validade && !driver.ader_validade) return false;
                const hoje = new Date();
                const cnhVencida = driver.cnh_validade && new Date(driver.cnh_validade) < hoje;
                const aderVencida = driver.ader_validade && new Date(driver.ader_validade) < hoje;
                return cnhVencida || aderVencida;
              }).length === 0 && 
              (drivers as Driver[]).filter(driver => {
                if (!driver.cnh_validade && !driver.ader_validade) return false;
                const hoje = new Date();
                const cnhVence = driver.cnh_validade && Math.ceil((new Date(driver.cnh_validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) <= 30;
                const aderVence = driver.ader_validade && Math.ceil((new Date(driver.ader_validade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) <= 30;
                return cnhVence || aderVence;
              }).length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum documento vencendo</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Condutor */}
      <DriverForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        driver={selectedDriver}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
