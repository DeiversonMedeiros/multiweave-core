// =====================================================
// SOLICITAÇÕES DE ABASTECIMENTO
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  X,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { 
  useRefuelRequests,
  useCreateRefuelRequest,
  useUpdateRefuelRequest,
  useCancelRefuelRequest
} from '@/hooks/combustivel/useCombustivel';
import { RefuelRequestForm } from '@/components/combustivel/RefuelRequestForm';
import { RecargaConfirmModal } from '@/components/combustivel/RecargaConfirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RefuelRequest } from '@/types/combustivel';

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aprovada: 'bg-green-100 text-green-800',
  reprovada: 'bg-red-100 text-red-800',
  recarregada: 'bg-blue-100 text-blue-800',
  cancelada: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  pendente: Clock,
  aprovada: CheckCircle,
  reprovada: XCircle,
  recarregada: RefreshCw,
  cancelada: X,
};

export default function SolicitacoesAbastecimento() {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [recargaDialogOpen, setRecargaDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RefuelRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<RefuelRequest | null>(null);
  const [recargaRequest, setRecargaRequest] = useState<RefuelRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filters: any = {};
  if (statusFilter !== 'all') {
    filters.status = statusFilter;
  }
  if (searchTerm) {
    filters.search = searchTerm;
  }

  const { data: requests, isLoading } = useRefuelRequests(filters);
  const createRequest = useCreateRefuelRequest();
  const updateRequest = useUpdateRefuelRequest();
  const cancelRequest = useCancelRefuelRequest();

  const handleSubmit = (data: any) => {
    if (editingRequest) {
      updateRequest.mutate({ id: editingRequest.id, data });
    } else {
      createRequest.mutate(data);
    }
    setRequestDialogOpen(false);
    setEditingRequest(null);
  };

  const handleCancel = (id: string) => {
    if (confirm('Deseja realmente cancelar esta solicitação?')) {
      cancelRequest.mutate(id);
    }
  };

  return (
    <RequireModule moduleName="combustivel" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solicitações de Abastecimento</h1>
            <p className="text-gray-600">Gerencie solicitações de abastecimento de combustível</p>
          </div>
          <PermissionButton
            page="/combustivel/solicitacoes*"
            action="create"
            onClick={() => {
              setEditingRequest(null);
              setRequestDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Solicitação
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por número, veículo, condutor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="reprovada">Reprovada</SelectItem>
                  <SelectItem value="recarregada">Recarregada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Solicitações */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações</CardTitle>
            <CardDescription>
              {requests?.totalCount || 0} solicitação(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
              </div>
            ) : requests?.data && requests.data.length > 0 ? (
              <div className="space-y-4">
                {requests.data.map((request) => {
                  const StatusIcon = statusIcons[request.status] || Clock;
                  return (
                    <div
                      key={request.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-bold text-lg">{request.numero_solicitacao}</p>
                            <Badge className={statusColors[request.status]}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                            {request.recarga_confirmada && (
                              <Badge variant="outline" className="bg-blue-50">
                                Recarga Confirmada
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Veículo</p>
                              <p className="font-medium">{request.veiculo_placa || 'N/A'}</p>
                              {request.veiculo_modelo && (
                                <p className="text-xs text-gray-400">{request.veiculo_modelo}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-500">Condutor</p>
                              <p className="font-medium">{request.condutor_nome || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Valor Solicitado</p>
                              <p className="font-bold text-green-600">
                                {formatCurrency(request.valor_solicitado)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Data</p>
                              <p className="font-medium">
                                {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          {request.centro_custo_nome && (
                            <div className="mt-2 text-sm text-gray-500">
                              Centro de Custo: {request.centro_custo_nome}
                              {request.projeto_nome && ` • Projeto: ${request.projeto_nome}`}
                            </div>
                          )}
                          {request.rota && (
                            <div className="mt-1 text-sm text-gray-500">
                              Rota: {request.rota}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingRequest(request);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {request.status === 'pendente' && (
                            <PermissionButton
                              page="/combustivel/solicitacoes*"
                              action="edit"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRequest(request);
                                setRequestDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </PermissionButton>
                          )}
                          {request.status === 'pendente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(request.id)}
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                          {request.status === 'aprovada' && !request.recarga_confirmada && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRecargaRequest(request);
                                setRecargaDialogOpen(true);
                              }}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Confirmar Recarga
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma solicitação encontrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Solicitação */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRequest ? 'Editar Solicitação' : 'Nova Solicitação de Abastecimento'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da solicitação de abastecimento
              </DialogDescription>
            </DialogHeader>
            <RefuelRequestForm
              request={editingRequest}
              onSubmit={handleSubmit}
              onCancel={() => {
                setRequestDialogOpen(false);
                setEditingRequest(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Recarga */}
        {recargaRequest && (
          <RecargaConfirmModal
            request={recargaRequest}
            isOpen={recargaDialogOpen}
            onClose={() => {
              setRecargaDialogOpen(false);
              setRecargaRequest(null);
            }}
          />
        )}

        {/* Dialog de Visualização */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
              <DialogDescription>
                {viewingRequest?.numero_solicitacao}
              </DialogDescription>
            </DialogHeader>
            {viewingRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge className={statusColors[viewingRequest.status]}>
                      {viewingRequest.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valor Solicitado</p>
                    <p className="font-bold">{formatCurrency(viewingRequest.valor_solicitado)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Veículo</p>
                    <p className="font-medium">{viewingRequest.veiculo_placa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Condutor</p>
                    <p className="font-medium">{viewingRequest.condutor_nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">KM do Veículo</p>
                    <p className="font-medium">{viewingRequest.km_veiculo.toLocaleString('pt-BR')} km</p>
                  </div>
                  {viewingRequest.km_estimado && (
                    <div>
                      <p className="text-sm text-gray-500">KM Estimado</p>
                      <p className="font-medium">{viewingRequest.km_estimado.toLocaleString('pt-BR')} km</p>
                    </div>
                  )}
                  {viewingRequest.centro_custo_nome && (
                    <div>
                      <p className="text-sm text-gray-500">Centro de Custo</p>
                      <p className="font-medium">{viewingRequest.centro_custo_nome}</p>
                    </div>
                  )}
                  {viewingRequest.projeto_nome && (
                    <div>
                      <p className="text-sm text-gray-500">Projeto</p>
                      <p className="font-medium">{viewingRequest.projeto_nome}</p>
                    </div>
                  )}
                </div>
                {viewingRequest.recarga_confirmada && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">Recarga Confirmada</p>
                    <p className="text-sm text-blue-700">
                      Valor recarregado: {formatCurrency(viewingRequest.valor_recarregado || 0)}
                    </p>
                    {viewingRequest.recarga_observacoes && (
                      <p className="text-sm text-blue-600 mt-1">
                        {viewingRequest.recarga_observacoes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RequireModule>
  );
}

