import React, { useState, useMemo } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  Download, 
  Search,
  Calendar,
  RefreshCw,
  X
} from 'lucide-react';
import { useFollowUp, FollowUpComprasItem, FollowUpComprasFilters } from '@/hooks/compras/useComprasData';
import { FollowUpCard } from '@/components/Compras/FollowUpCard';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUsers } from '@/hooks/useUsers';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '@/services/compras/purchaseService';
import { CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';

// Componente principal protegido por permissões
export default function FollowUpComprasPage() {
  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'page', 
        name: '/compras/follow-up*', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Follow-up de Compras</h1>
        </div>

        <FollowUpContent />
      </div>
    </RequireAuth>
  );
}

function FollowUpContent() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<FollowUpComprasFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FollowUpComprasItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: followUpData = [], isLoading, refetch } = useFollowUp(filters);
  const { data: users = [] } = useUsers(selectedCompany?.id || '');

  // Buscar fornecedores para o filtro
  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const result = await EntityService.list({
        schema: 'compras',
        table: 'fornecedores_dados',
        companyId: selectedCompany.id,
      });
      return result.data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Filtrar dados localmente por termo de busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return followUpData;

    const term = searchTerm.toLowerCase();
    return followUpData.filter((item) => {
      return (
        item.numero_requisicao?.toLowerCase().includes(term) ||
        item.numero_cotacao?.toLowerCase().includes(term) ||
        item.numero_pedido?.toLowerCase().includes(term) ||
        item.solicitante_nome?.toLowerCase().includes(term) ||
        item.fornecedor_nome?.toLowerCase().includes(term) ||
        item.numero_nota_fiscal?.toLowerCase().includes(term)
      );
    });
  }, [followUpData, searchTerm]);

  const handleFilterChange = (key: keyof FollowUpComprasFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm.length > 0;

  return (
    <>
      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros e Busca</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Busca rápida */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, solicitante, fornecedor, NF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Período */}
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                  />
                </div>

                {/* Status Requisição */}
                <div className="space-y-2">
                  <Label>Status Requisição</Label>
                  <Select
                    value={filters.statusRequisicao || ''}
                    onValueChange={(value) => handleFilterChange('statusRequisicao', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="criada">Criada</SelectItem>
                      <SelectItem value="pendente_aprovacao">Pendente Aprovação</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Cotação */}
                <div className="space-y-2">
                  <Label>Status Cotação</Label>
                  <Select
                    value={filters.statusCotacao || ''}
                    onValueChange={(value) => handleFilterChange('statusCotacao', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="completa">Completa</SelectItem>
                      <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="em_pedido">Em Pedido</SelectItem>
                      <SelectItem value="reprovada">Reprovada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Pedido */}
                <div className="space-y-2">
                  <Label>Status Pedido</Label>
                  <Select
                    value={filters.statusPedido || ''}
                    onValueChange={(value) => handleFilterChange('statusPedido', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Conta */}
                <div className="space-y-2">
                  <Label>Status Conta</Label>
                  <Select
                    value={filters.statusConta || ''}
                    onValueChange={(value) => handleFilterChange('statusConta', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="paga">Paga</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Solicitante */}
                <div className="space-y-2">
                  <Label>Solicitante</Label>
                  <Select
                    value={filters.solicitanteId || ''}
                    onValueChange={(value) => handleFilterChange('solicitanteId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fornecedor */}
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={filters.fornecedorId || ''}
                    onValueChange={(value) => handleFilterChange('fornecedorId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {fornecedores.map((fornecedor: any) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.razao_social || fornecedor.nome_fantasia || fornecedor.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Indicador de filtros ativos */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {filters.dataInicio && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    De {new Date(filters.dataInicio).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
                {filters.dataFim && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Até {new Date(filters.dataFim).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
                {filters.statusRequisicao && (
                  <Badge variant="secondary">Req: {filters.statusRequisicao}</Badge>
                )}
                {filters.statusCotacao && (
                  <Badge variant="secondary">Cot: {filters.statusCotacao}</Badge>
                )}
                {filters.statusPedido && (
                  <Badge variant="secondary">Ped: {filters.statusPedido}</Badge>
                )}
                {filters.statusConta && (
                  <Badge variant="secondary">Conta: {filters.statusConta}</Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary">Busca: {searchTerm}</Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Follow-up */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Resultados ({filteredData.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando dados do follow-up...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum resultado encontrado.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredData.map((item, index) => (
                <FollowUpCard
                  key={`${item.requisicao_id}-${item.cotacao_id || 'no-cot'}-${item.pedido_id || 'no-ped'}-${item.conta_id || 'no-conta'}-${item.entrada_id || 'no-ent'}-${index}`}
                  item={item}
                  onViewDetails={setSelectedItem}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {selectedItem && (
        <FollowUpDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

interface FollowUpDetailsModalProps {
  item: FollowUpComprasItem;
  onClose: () => void;
}

function FollowUpDetailsModal({ item, onClose }: FollowUpDetailsModalProps) {
  const { selectedCompany } = useCompany();

  // Buscar itens da requisição
  const { data: requisicaoItems = [] } = useQuery({
    queryKey: ['requisicao-items', item.requisicao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getRequisitionItems(item.requisicao_id, selectedCompany?.id || ''),
    enabled: !!item.requisicao_id && !!selectedCompany?.id,
  });

  // Buscar itens da cotação
  const { data: cotacaoItems = [] } = useQuery({
    queryKey: ['cotacao-items', item.cotacao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getCotacaoItems(item.cotacao_id!, selectedCompany?.id || ''),
    enabled: !!item.cotacao_id && !!selectedCompany?.id,
  });

  // Buscar itens do pedido
  const { data: pedidoItems = [] } = useQuery({
    queryKey: ['pedido-items', item.pedido_id, selectedCompany?.id],
    queryFn: () => purchaseService.getPedidoItems(item.pedido_id!, selectedCompany?.id || ''),
    enabled: !!item.pedido_id && !!selectedCompany?.id,
  });

  // Buscar aprovações da requisição
  const { data: requisicaoApprovals = [] } = useQuery({
    queryKey: ['requisicao-approvals', item.requisicao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getApprovals('requisicao_compra', item.requisicao_id, selectedCompany?.id || ''),
    enabled: !!item.requisicao_id && !!selectedCompany?.id,
  });

  // Buscar aprovações da cotação
  const { data: cotacaoApprovals = [] } = useQuery({
    queryKey: ['cotacao-approvals', item.cotacao_id, selectedCompany?.id],
    queryFn: () => purchaseService.getApprovals('cotacao_compra', item.cotacao_id!, selectedCompany?.id || ''),
    enabled: !!item.cotacao_id && !!selectedCompany?.id,
  });

  // Buscar aprovações do pedido (se existir tipo de processo para pedidos)
  const { data: pedidoApprovals = [] } = useQuery({
    queryKey: ['pedido-approvals', item.pedido_id, selectedCompany?.id],
    queryFn: async () => {
      // Verificar se existe tipo de processo para pedidos
      // Por enquanto, retornar array vazio se não houver tipo definido
      try {
        return await purchaseService.getApprovals('pedido_compra', item.pedido_id!, selectedCompany?.id || '');
      } catch (error) {
        // Se não existir tipo de processo para pedidos, retornar vazio
        return [];
      }
    },
    enabled: !!item.pedido_id && !!selectedCompany?.id,
  });

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pendente':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes do Follow-up - {item.numero_requisicao}</DialogTitle>
          <DialogDescription>
            Informações completas de todas as etapas do processo de compra
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Requisição */}
            <div>
              <h3 className="font-semibold text-lg mb-3">1. Requisição de Compra</h3>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600">Número:</span>
                  <span className="ml-2 font-medium">{item.numero_requisicao}</span>
                </div>
                <div>
                  <span className="text-gray-600">Solicitante:</span>
                  <span className="ml-2 font-medium">{item.solicitante_nome || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Data Solicitação:</span>
                  <span className="ml-2 font-medium">{formatDate(item.data_solicitacao)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Data Necessidade:</span>
                  <span className="ml-2 font-medium">{formatDate(item.data_necessidade)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 font-medium">{item.requisicao_workflow_state || item.requisicao_status || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Valor Estimado:</span>
                  <span className="ml-2 font-medium">{formatCurrency(item.valor_total_estimado)}</span>
                </div>
              </div>

              <Accordion type="multiple" className="w-full">
                {/* Itens da Requisição */}
                <AccordionItem value="requisicao-itens">
                  <AccordionTrigger className="text-sm font-medium">
                    Itens da Requisição ({requisicaoItems.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Valor Unit.</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requisicaoItems.length > 0 ? (
                          requisicaoItems.map((reqItem: any) => (
                            <TableRow key={reqItem.id}>
                              <TableCell>
                                {reqItem.material?.nome || reqItem.material?.codigo || '—'}
                              </TableCell>
                              <TableCell>{reqItem.quantidade || '—'}</TableCell>
                              <TableCell>{reqItem.unidade_medida || 'UN'}</TableCell>
                              <TableCell>{formatCurrency(reqItem.valor_unitario_estimado)}</TableCell>
                              <TableCell>{formatCurrency(reqItem.valor_total_estimado)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{reqItem.status || 'pendente'}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-400">
                              Nenhum item encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>

                {/* Aprovações da Requisição */}
                {requisicaoApprovals.length > 0 && (
                  <AccordionItem value="requisicao-approvals">
                    <AccordionTrigger className="text-sm font-medium">
                      Aprovações ({requisicaoApprovals.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {requisicaoApprovals.map((approval: any) => (
                          <div key={approval.id} className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="flex items-start gap-3 flex-1">
                              {getApprovalStatusIcon(approval.status)}
                              <div className="flex-1">
                                <div className="font-medium">
                                  Nível {approval.nivel_aprovacao} - {approval.aprovador?.nome || approval.aprovador?.email || 'Usuário'}
                                </div>
                                {approval.observacoes && (
                                  <div className="text-sm text-gray-600 mt-1">{approval.observacoes}</div>
                                )}
                                {approval.data_aprovacao && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {formatDate(approval.data_aprovacao)}
                                  </div>
                                )}
                              </div>
                              {getApprovalStatusBadge(approval.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>

            <Separator />

            {/* Cotação */}
            {item.cotacao_id ? (
              <div>
                <h3 className="font-semibold text-lg mb-3">2. Cotação de Preços</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Número:</span>
                    <span className="ml-2 font-medium">{item.numero_cotacao || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data:</span>
                    <span className="ml-2 font-medium">{formatDate(item.data_cotacao)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">{item.cotacao_workflow_state || item.cotacao_status || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Prazo Resposta:</span>
                    <span className="ml-2 font-medium">{item.prazo_resposta ? formatDate(item.prazo_resposta) : '—'}</span>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {/* Itens da Cotação */}
                  <AccordionItem value="cotacao-itens">
                    <AccordionTrigger className="text-sm font-medium">
                      Itens da Cotação ({cotacaoItems.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Prazo Entrega</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cotacaoItems.length > 0 ? (
                            cotacaoItems.map((cotItem: any) => (
                              <TableRow key={cotItem.id}>
                                <TableCell>
                                  {cotItem.material?.nome || cotItem.material?.codigo || '—'}
                                </TableCell>
                                <TableCell>{cotItem.quantidade || '—'}</TableCell>
                                <TableCell>{formatCurrency(cotItem.valor_unitario)}</TableCell>
                                <TableCell>{formatCurrency(cotItem.valor_total)}</TableCell>
                                <TableCell>
                                  {cotItem.prazo_entrega ? `${cotItem.prazo_entrega} dias` : '—'}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-400">
                                Nenhum item encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Aprovações da Cotação */}
                  {cotacaoApprovals.length > 0 && (
                    <AccordionItem value="cotacao-approvals">
                      <AccordionTrigger className="text-sm font-medium">
                        Aprovações ({cotacaoApprovals.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {cotacaoApprovals.map((approval: any) => (
                            <div key={approval.id} className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="flex items-start gap-3 flex-1">
                                {getApprovalStatusIcon(approval.status)}
                                <div className="flex-1">
                                  <div className="font-medium">
                                    Nível {approval.nivel_aprovacao} - {approval.aprovador?.nome || approval.aprovador?.email || 'Usuário'}
                                  </div>
                                  {approval.observacoes && (
                                    <div className="text-sm text-gray-600 mt-1">{approval.observacoes}</div>
                                  )}
                                  {approval.data_aprovacao && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {formatDate(approval.data_aprovacao)}
                                    </div>
                                  )}
                                </div>
                                {getApprovalStatusBadge(approval.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            ) : (
              <div className="text-gray-400 italic">2. Cotação de Preços - Não iniciada</div>
            )}

            <Separator />

            {/* Pedido */}
            {item.pedido_id ? (
              <div>
                <h3 className="font-semibold text-lg mb-3">3. Pedido de Compra</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Número:</span>
                    <span className="ml-2 font-medium">{item.numero_pedido || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fornecedor:</span>
                    <span className="ml-2 font-medium">{item.fornecedor_nome || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Pedido:</span>
                    <span className="ml-2 font-medium">{formatDate(item.data_pedido)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Entrega Prevista:</span>
                    <span className="ml-2 font-medium">{formatDate(item.data_entrega_prevista)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Entrega Real:</span>
                    <span className="ml-2 font-medium">{formatDate(item.data_entrega_real)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">{item.pedido_workflow_state || item.pedido_status || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="ml-2 font-medium">{formatCurrency(item.pedido_valor_total)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor Final:</span>
                    <span className="ml-2 font-medium">{formatCurrency(item.pedido_valor_final)}</span>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {/* Itens do Pedido */}
                  <AccordionItem value="pedido-itens">
                    <AccordionTrigger className="text-sm font-medium">
                      Itens do Pedido ({pedidoItems.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Qtd. Entregue</TableHead>
                            <TableHead>Valor Unit.</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pedidoItems.length > 0 ? (
                            pedidoItems.map((pedItem: any) => (
                              <TableRow key={pedItem.id}>
                                <TableCell>
                                  {pedItem.material?.nome || pedItem.material?.codigo || '—'}
                                </TableCell>
                                <TableCell>{pedItem.quantidade || '—'}</TableCell>
                                <TableCell>{pedItem.quantidade_entregue || 0}</TableCell>
                                <TableCell>{formatCurrency(pedItem.valor_unitario)}</TableCell>
                                <TableCell>{formatCurrency(pedItem.valor_total)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{pedItem.status || 'pendente'}</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-gray-400">
                                Nenhum item encontrado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Aprovações do Pedido */}
                  {pedidoApprovals.length > 0 && (
                    <AccordionItem value="pedido-approvals">
                      <AccordionTrigger className="text-sm font-medium">
                        Aprovações ({pedidoApprovals.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {pedidoApprovals.map((approval: any) => (
                            <div key={approval.id} className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="flex items-start gap-3 flex-1">
                                {getApprovalStatusIcon(approval.status)}
                                <div className="flex-1">
                                  <div className="font-medium">
                                    Nível {approval.nivel_aprovacao} - {approval.aprovador?.nome || approval.aprovador?.email || 'Usuário'}
                                  </div>
                                  {approval.observacoes && (
                                    <div className="text-sm text-gray-600 mt-1">{approval.observacoes}</div>
                                  )}
                                  {approval.data_aprovacao && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {formatDate(approval.data_aprovacao)}
                                    </div>
                                  )}
                                </div>
                                {getApprovalStatusBadge(approval.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            ) : (
              <div className="text-gray-400 italic">3. Pedido de Compra - Não criado</div>
            )}

            <Separator />

            {/* Conta a Pagar */}
            {item.conta_id ? (
              <div>
                <h3 className="font-semibold text-lg mb-3">4. Conta a Pagar</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Descrição:</span>
                    <span className="ml-2 font-medium">{item.conta_descricao || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Número NF:</span>
                    <span className="ml-2 font-medium">{item.numero_nota_fiscal || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor Original:</span>
                    <span className="ml-2 font-medium">{formatCurrency(item.conta_valor_original)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Valor Atual:</span>
                    <span className="ml-2 font-medium">{formatCurrency(item.conta_valor_atual)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Vencimento:</span>
                    <span className="ml-2 font-medium">{formatDate(item.data_vencimento)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">{item.conta_status || '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic">4. Conta a Pagar - Não criada</div>
            )}

            <Separator />

            {/* Entrada em Estoque */}
            {item.entrada_id ? (
              <div>
                <h3 className="font-semibold text-lg mb-3">5. Entrada em Estoque</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Número Documento:</span>
                    <span className="ml-2 font-medium">{item.entrada_numero_documento || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Data Entrada:</span>
                    <span className="ml-2 font-medium">{formatDate(item.data_entrada)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium">{item.entrada_status || '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic">5. Entrada em Estoque - Não registrada</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
