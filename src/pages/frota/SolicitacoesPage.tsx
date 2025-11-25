// =====================================================
// PÁGINA DE SOLICITAÇÕES
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
  ClipboardList, 
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
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useVehicleRequests, useDeleteVehicleRequest } from '@/hooks/frota/useFrotaData';
import { VehicleRequest, RequestStatus } from '@/types/frota';
import RequestForm from '@/components/frota/RequestForm';

export default function SolicitacoesPage() {
  const [filters, setFilters] = useState({
    search: '',
    solicitante_id: '',
    status: '',
    limit: 50,
    offset: 0
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);

  const { data: requests, isLoading, refetch } = useVehicleRequests(filters);
  const deleteRequest = useDeleteVehicleRequest();

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta solicitação?')) {
      await deleteRequest.mutateAsync(id);
    }
  };

  const handleNewRequest = () => {
    setSelectedRequest(null);
    setIsFormOpen(true);
  };

  const handleEditRequest = (request: VehicleRequest) => {
    setSelectedRequest(request);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedRequest(null);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const getStatusBadge = (status: RequestStatus) => {
    const variants = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      aprovado: 'bg-green-100 text-green-800 border-green-200',
      reprovado: 'bg-red-100 text-red-800 border-red-200',
      devolvido: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'aprovado':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'reprovado':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'devolvido':
        return <Car className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getDaysUntilStart = (dataInicio: string) => {
    const hoje = new Date();
    const inicio = new Date(dataInicio);
    const dias = Math.ceil((inicio.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const getDaysUntilEnd = (dataFim: string) => {
    const hoje = new Date();
    const fim = new Date(dataFim);
    const dias = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const getTotalRequests = () => {
    return requests?.length || 0;
  };

  const getRequestsByStatus = (status: RequestStatus) => {
    if (!requests) return 0;
    return (requests as VehicleRequest[])
      .filter(r => r.status === status)
      .length;
  };

  const getApprovalRate = () => {
    if (!requests || requests.length === 0) return 0;
    const aprovados = getRequestsByStatus('aprovado');
    const total = requests.length;
    return Math.round((aprovados / total) * 100);
  };

  const getPendingRequests = () => {
    if (!requests) return [];
    return (requests as VehicleRequest[])
      .filter(r => r.status === 'pendente')
      .sort((a, b) => getDaysUntilStart(a.data_inicio) - getDaysUntilStart(b.data_inicio));
  };

  const getOverdueRequests = () => {
    if (!requests) return [];
    return (requests as VehicleRequest[])
      .filter(r => {
        if (r.status !== 'aprovado') return false;
        const diasFim = getDaysUntilEnd(r.data_fim || r.data_inicio);
        return diasFim < 0;
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitações</h1>
          <p className="text-gray-600">Controle de solicitações e devoluções de veículos</p>
        </div>
        <Button 
          className="bg-[#049940] hover:bg-[#038830]"
          onClick={handleNewRequest}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#049940]">{getTotalRequests()}</div>
            <p className="text-xs text-gray-600">Este período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getRequestsByStatus('pendente')}</div>
            <p className="text-xs text-gray-600">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getRequestsByStatus('aprovado')}</div>
            <p className="text-xs text-gray-600">Em uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Devolvidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getRequestsByStatus('devolvido')}</div>
            <p className="text-xs text-gray-600">Finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{getApprovalRate()}%</div>
            <p className="text-xs text-gray-600">Aprovações</p>
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
                placeholder="Buscar por finalidade, observações..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.solicitante_id} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, solicitante_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Solicitante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os solicitantes</SelectItem>
                {/* Aqui você pode carregar a lista de usuários */}
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
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                <SelectItem value="devolvido">Devolvido</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ search: '', solicitante_id: 'all', status: 'all', limit: 50, offset: 0 })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Solicitações</span>
            <span className="text-sm font-normal text-gray-500">
              {requests?.length || 0} solicitações encontradas
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
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aprovado Por</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests && requests.length > 0 ? (
                    (requests as VehicleRequest[]).map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-[#049940]" />
                            <div>
                              <div className="font-medium">{request.solicitante_nome}</div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(request.created_at)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.placa ? (
                            <div className="flex items-center">
                              <Car className="w-4 h-4 mr-2 text-[#93C21E]" />
                              <span className="font-medium">{request.placa}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Não especificado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm font-medium truncate">{request.finalidade}</div>
                            {request.observacoes && (
                              <div className="text-xs text-gray-500 truncate">{request.observacoes}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <div>
                                <div>Início: {formatDate(request.data_inicio)}</div>
                                {request.data_fim && (
                                  <div>Fim: {formatDate(request.data_fim)}</div>
                                )}
                              </div>
                            </div>
                            {request.status === 'pendente' && (
                              <div className="text-xs text-gray-500 mt-1">
                                {getDaysUntilStart(request.data_inicio) > 0 
                                  ? `Inicia em ${getDaysUntilStart(request.data_inicio)} dias`
                                  : getDaysUntilStart(request.data_inicio) === 0 
                                    ? 'Inicia hoje'
                                    : `Atrasada em ${Math.abs(getDaysUntilStart(request.data_inicio))} dias`
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getStatusIcon(request.status)}
                            <span className="ml-2">{getStatusBadge(request.status)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.aprovador_nome ? (
                            <div className="text-sm">
                              <div className="font-medium">{request.aprovador_nome}</div>
                              {request.data_aprovacao && (
                                <div className="text-xs text-gray-500">
                                  {formatDateTime(request.data_aprovacao)}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditRequest(request)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {request.status === 'pendente' && (
                              <>
                                <Button variant="ghost" size="sm" className="text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600">
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {request.status === 'aprovado' && (
                              <Button variant="ghost" size="sm" className="text-blue-600">
                                <Car className="w-4 h-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(request.id)}
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
                          <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500">Nenhuma solicitação encontrada</p>
                          <p className="text-sm text-gray-400">
                            {filters.search || filters.solicitante_id || filters.status
                              ? 'Tente ajustar os filtros de busca'
                              : 'Comece criando uma nova solicitação'
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
      {requests && requests.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {filters.offset + requests.length} de {requests.length} solicitações
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
              disabled={requests.length < filters.limit}
              onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Alertas de Solicitações Pendentes */}
      {requests && requests.length > 0 && getPendingRequests().length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-600">
              <Clock className="w-5 h-5 mr-2" />
              Solicitações Pendentes de Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getPendingRequests().slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                  <div>
                    <p className="font-medium text-sm">
                      {request.solicitante_nome} - {request.finalidade}
                    </p>
                    <p className="text-xs text-gray-600">
                      {request.placa ? `Veículo: ${request.placa}` : 'Veículo não especificado'} • 
                      Início: {formatDate(request.data_inicio)}
                      {request.data_fim && ` • Fim: ${formatDate(request.data_fim)}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getDaysUntilStart(request.data_inicio) > 0 
                        ? `Inicia em ${getDaysUntilStart(request.data_inicio)} dias`
                        : getDaysUntilStart(request.data_inicio) === 0 
                          ? 'Inicia hoje'
                          : `Atrasada em ${Math.abs(getDaysUntilStart(request.data_inicio))} dias`
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="text-green-600 border-green-200">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                      <XCircle className="w-4 h-4 mr-1" />
                      Reprovar
                    </Button>
                  </div>
                </div>
              ))}
              {getPendingRequests().length > 5 && (
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas as pendentes ({getPendingRequests().length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Solicitações Atrasadas */}
      {requests && requests.length > 0 && getOverdueRequests().length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Solicitações Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getOverdueRequests().map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-sm">
                      {request.solicitante_nome} - {request.finalidade}
                    </p>
                    <p className="text-xs text-gray-600">
                      {request.placa ? `Veículo: ${request.placa}` : 'Veículo não especificado'}
                    </p>
                    <p className="text-xs text-red-600">
                      Atrasada em {Math.abs(getDaysUntilEnd(request.data_fim || request.data_inicio))} dias
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                      <Car className="w-4 h-4 mr-1" />
                      Devolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Solicitação */}
      <RequestForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        request={selectedRequest}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
