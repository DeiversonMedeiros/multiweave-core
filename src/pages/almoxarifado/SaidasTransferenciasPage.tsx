import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowUpFromLine, 
  ArrowRightLeft,
  Plus, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTransferencias, Transferencia } from '@/hooks/almoxarifado/useTransferenciasQuery';
import { useMovimentacoesEstoque } from '@/hooks/almoxarifado/useMovimentacoesEstoqueQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { useMaterialExitRequests } from '@/hooks/approvals/useMaterialExitRequests';
import { usePendingApprovals } from '@/hooks/approvals/useApprovals';
import { MaterialExitRequest } from '@/services/approvals/approvalService';
import { MaterialExitRequestForm } from '@/components/almoxarifado/MaterialExitRequestForm';
import { toast } from 'sonner';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const SaidasTransferenciasPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterAlmoxarifado, setFilterAlmoxarifado] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState('transferencias');
  const [selectedSaidaMaterial, setSelectedSaidaMaterial] = useState<MaterialExitRequest | null>(null);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);

  // Hooks para dados
  const { 
    data: transferenciasData,
    loading: transferenciasLoading, 
    error: transferenciasError, 
    refetch: refetchTransferencias, 
    createTransferencia, 
    aprovarTransferencia, 
    rejeitarTransferencia, 
    executarTransferencia 
  } = useTransferencias();
  
  const transferencias = transferenciasData || [];

  const { 
    movimentacoes, 
    loading: movimentacoesLoading, 
    error: movimentacoesError, 
    refetch: refetchMovimentacoes,
    getResumoMovimentacoes,
    getMovimentacoesRecentes
  } = useMovimentacoesEstoque();

  const { data: almoxarifadosData } = useAlmoxarifados();
  const { data: materiaisData } = useMateriaisEquipamentos();

  // Hooks para saídas de materiais
  const { 
    data: saidasMateriais = [], 
    isLoading: saidasLoading,
    error: saidasError,
    createRequest,
    updateRequest,
    deleteRequest
  } = useMaterialExitRequests();

  // Hooks para aprovações
  const { 
    data: pendingApprovals = []
  } = usePendingApprovals();
  
  const almoxarifados = almoxarifadosData || [];
  const materiais = materiaisData || [];
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];

  // Aplicar filtros
  useEffect(() => {
    if (activeTab === 'transferencias') {
      refetchTransferencias({
        status: filterStatus !== 'todos' ? filterStatus : undefined,
        almoxarifado_origem_id: filterAlmoxarifado !== 'todos' ? filterAlmoxarifado : undefined
      });
    } else {
      refetchMovimentacoes({
        tipo_movimentacao: filterTipo !== 'todos' ? filterTipo : undefined,
        status: filterStatus !== 'todos' ? filterStatus : undefined,
        almoxarifado_id: filterAlmoxarifado !== 'todos' ? filterAlmoxarifado : undefined
      });
    }
  }, [filterStatus, filterTipo, filterAlmoxarifado, activeTab, refetchTransferencias, refetchMovimentacoes]);

  const handleAprovarTransferencia = async (transferenciaId: string) => {
    try {
      const aprovadorId = 'current-user-id'; // TODO: Implementar obtenção do usuário atual
      await aprovarTransferencia(transferenciaId, aprovadorId);
      toast.success('Transferência aprovada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aprovar transferência');
      console.error(error);
    }
  };

  const handleRejeitarTransferencia = async (transferenciaId: string) => {
    const motivo = prompt('Motivo da rejeição:');
    if (!motivo) return;

    try {
      await rejeitarTransferencia(transferenciaId, motivo);
      toast.success('Transferência rejeitada');
    } catch (error) {
      toast.error('Erro ao rejeitar transferência');
      console.error(error);
    }
  };

  const handleExecutarTransferencia = async (transferenciaId: string) => {
    try {
      await executarTransferencia(transferenciaId);
      toast.success('Transferência executada com sucesso!');
    } catch (error) {
      toast.error('Erro ao executar transferência');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente' },
      aprovado: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Aprovado' },
      rejeitado: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejeitado' },
      transferido: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Transferido' },
      confirmado: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Confirmado' },
      cancelado: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Cancelado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getTipoMovimentacaoIcon = (tipo: string) => {
    const iconConfig = {
      entrada: { icon: TrendingUp, color: 'text-green-600' },
      saida: { icon: TrendingDown, color: 'text-red-600' },
      transferencia: { icon: ArrowRightLeft, color: 'text-blue-600' },
      ajuste: { icon: Package, color: 'text-orange-600' },
      inventario: { icon: Package, color: 'text-purple-600' }
    };

    const config = iconConfig[tipo as keyof typeof iconConfig] || iconConfig.entrada;
    const IconComponent = config.icon;

    return <IconComponent className={`h-4 w-4 ${config.color}`} />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const resumoMovimentacoes = getResumoMovimentacoes();
  const movimentacoesRecentes = getMovimentacoesRecentes(5);

  return (
    <RequirePage pagePath="/almoxarifado/saidas*" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <ArrowUpFromLine className="inline-block mr-3 h-8 w-8" />
              Saídas e Transferências
            </h1>
            <p className="text-gray-600">
              Controle de saídas e transferências entre almoxarifados
            </p>
          </div>
          <div className="flex space-x-2">
            <Button className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors duration-200 whitespace-nowrap flex items-center">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Nova Transferência
            </Button>
            <PermissionButton
              page="/almoxarifado/saidas*"
              action="create"
              onClick={() => setIsSaidaModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors duration-200 whitespace-nowrap flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Saída de Material
            </PermissionButton>
          </div>
        </div>

        {/* Resumo de Movimentações */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoMovimentacoes.total_entradas}</div>
              <p className="text-xs text-gray-500">{formatCurrency(resumoMovimentacoes.valor_total_entradas)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoMovimentacoes.total_saidas}</div>
              <p className="text-xs text-gray-500">{formatCurrency(resumoMovimentacoes.valor_total_saidas)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Transferências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoMovimentacoes.total_transferencias}</div>
              <p className="text-xs text-gray-500">Itens movimentados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Ajustes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoMovimentacoes.total_ajustes}</div>
              <p className="text-xs text-gray-500">Itens ajustados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="inventario">Inventário</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAlmoxarifado} onValueChange={setFilterAlmoxarifado}>
                <SelectTrigger>
                  <SelectValue placeholder="Almoxarifado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Almoxarifados</SelectItem>
                  {almoxarifados.map(almoxarifado => (
                    <SelectItem key={almoxarifado.id} value={almoxarifado.id}>
                      {almoxarifado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transferencias">Transferências</TabsTrigger>
          <TabsTrigger value="saidas-materiais">Saídas de Materiais</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        {/* Tab de Transferências */}
        <TabsContent value="transferencias" className="space-y-4">
          {transferenciasLoading && (
            <Card>
              <CardContent className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Carregando transferências...</p>
              </CardContent>
            </Card>
          )}

          {transferenciasError && (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{transferenciasError}</p>
                <Button onClick={() => refetchTransferencias()}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {!transferenciasLoading && !transferenciasError && (
            <div className="space-y-4">
              {transferencias.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <ArrowRightLeft className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma transferência encontrada
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Comece criando uma nova transferência entre almoxarifados
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Transferência
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                transferencias.map((transferencia) => (
                  <Card key={transferencia.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Transferência #{transferencia.id.slice(-8)}
                            </h3>
                            {getStatusBadge(transferencia.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Origem:</span> {transferencia.almoxarifado_origem?.nome}
                            </div>
                            <div>
                              <span className="font-medium">Destino:</span> {transferencia.almoxarifado_destino?.nome}
                            </div>
                            <div>
                              <span className="font-medium">Solicitante:</span> {transferencia.solicitante?.nome}
                            </div>
                            <div>
                              <span className="font-medium">Data:</span> {formatDate(transferencia.data_solicitacao)}
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Itens:</span> {transferencia.itens?.length || 0}
                          </div>

                          {transferencia.observacoes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Observações:</span> {transferencia.observacoes}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {transferencia.status === 'pendente' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleAprovarTransferencia(transferencia.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleRejeitarTransferencia(transferencia.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {transferencia.status === 'aprovado' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleExecutarTransferencia(transferencia.id)}
                            >
                              Executar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab de Saídas de Materiais */}
        <TabsContent value="saidas-materiais" className="space-y-4">
          {saidasLoading && (
            <Card>
              <CardContent className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Carregando saídas de materiais...</p>
              </CardContent>
            </Card>
          )}

          {saidasError && (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Erro ao carregar saídas de materiais</p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {!saidasLoading && !saidasError && (
            <div className="space-y-4">
              {/* Filtros para Saídas de Materiais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Buscar por observações..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os status</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="rejeitado">Rejeitado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Almoxarifado</label>
                      <Select value={filterAlmoxarifado} onValueChange={setFilterAlmoxarifado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os almoxarifados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os almoxarifados</SelectItem>
                          {almoxarifados.map((almoxarifado) => (
                            <SelectItem key={almoxarifado.id} value={almoxarifado.id}>
                              {almoxarifado.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">&nbsp;</label>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchTerm('');
                          setFilterStatus('todos');
                          setFilterAlmoxarifado('todos');
                        }}
                        className="w-full"
                      >
                        Limpar Filtros
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Saídas de Materiais */}
              <div className="space-y-4">
                {saidasMateriais.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma saída de material encontrada</h3>
                      <p className="text-muted-foreground mb-4">
                        Comece criando sua primeira solicitação de saída de material.
                      </p>
                      <div className="flex justify-center">
                        <PermissionButton
                          page="/almoxarifado/saidas*"
                          action="create"
                          onClick={() => setIsSaidaModalOpen(true)}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors duration-200 whitespace-nowrap flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Solicitação
                        </PermissionButton>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  saidasMateriais.map((saida) => (
                    <Card key={saida.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5" />
                            <div>
                              <CardTitle className="text-lg">
                                Solicitação #{saida.id.slice(0, 8)}
                              </CardTitle>
                              <CardDescription>
                                Solicitado em {new Date(saida.data_solicitacao).toLocaleDateString('pt-BR')}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(saida.status)}
                            <PermissionButton
                              page="/almoxarifado/saidas*"
                              action="edit"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSaidaMaterial(saida);
                                setIsSaidaModalOpen(true);
                              }}
                              disabled={saida.status === 'cancelado'}
                            >
                              <Eye className="h-4 w-4" />
                            </PermissionButton>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Solicitante:</span>
                            <p className="font-medium">
                              {saida.funcionario_solicitante_id ? 'Usuário ID: ' + saida.funcionario_solicitante_id.slice(0, 8) : 'Não informado'}
                            </p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-muted-foreground">Receptor:</span>
                            <p className="font-medium">
                              {saida.funcionario_receptor_id ? 'Usuário ID: ' + saida.funcionario_receptor_id.slice(0, 8) : 'Não informado'}
                            </p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-muted-foreground">Valor Total:</span>
                            <p className="font-semibold">
                              {saida.valor_total ? `R$ ${saida.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                            </p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-muted-foreground">Data de Aprovação:</span>
                            <p>
                              {saida.data_aprovacao 
                                ? new Date(saida.data_aprovacao).toLocaleDateString('pt-BR')
                                : 'Pendente'
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab de Movimentações */}
        <TabsContent value="movimentacoes" className="space-y-4">
          {movimentacoesLoading && (
            <Card>
              <CardContent className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Carregando movimentações...</p>
              </CardContent>
            </Card>
          )}

          {movimentacoesError && (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{movimentacoesError}</p>
                <Button onClick={() => refetchMovimentacoes()}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {!movimentacoesLoading && !movimentacoesError && (
            <div className="space-y-4">
              {movimentacoes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma movimentação encontrada
                    </h3>
                    <p className="text-gray-600 mb-4">
                      As movimentações aparecerão aqui conforme forem realizadas
                    </p>
                  </CardContent>
                </Card>
              ) : (
                movimentacoes.map((movimentacao) => (
                  <Card key={movimentacao.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getTipoMovimentacaoIcon(movimentacao.tipo_movimentacao)}
                            <h3 className="text-lg font-semibold text-gray-900">
                              {movimentacao.material?.descricao}
                            </h3>
                            {getStatusBadge(movimentacao.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Quantidade:</span> {movimentacao.quantidade}
                            </div>
                            <div>
                              <span className="font-medium">Unidade:</span> {movimentacao.material?.unidade_medida}
                            </div>
                            <div>
                              <span className="font-medium">Usuário:</span> {movimentacao.usuario?.nome}
                            </div>
                            <div>
                              <span className="font-medium">Data:</span> {formatDate(movimentacao.data_movimentacao)}
                            </div>
                          </div>

                          {movimentacao.valor_total && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Valor Total:</span> {formatCurrency(movimentacao.valor_total)}
                            </div>
                          )}

                          {movimentacao.observacoes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Observações:</span> {movimentacao.observacoes}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal para Saídas de Materiais */}
      {isSaidaModalOpen && (
        <MaterialExitRequestForm
          request={selectedSaidaMaterial}
          onSubmit={async (data, items) => {
            try {
              if (selectedSaidaMaterial) {
                await updateRequest.mutateAsync({ 
                  id: selectedSaidaMaterial.id, 
                  data 
                });
              } else {
                await createRequest.mutateAsync(data);
                // TODO: Salvar itens da solicitação
                console.log('Itens selecionados:', items);
              }
              setIsSaidaModalOpen(false);
              setSelectedSaidaMaterial(null);
            } catch (error) {
              console.error('Erro ao salvar solicitação:', error);
            }
          }}
          onCancel={() => {
            setIsSaidaModalOpen(false);
            setSelectedSaidaMaterial(null);
          }}
          isLoading={createRequest.isPending || updateRequest.isPending}
        />
      )}
    </div>
    </RequirePage>
  );
};

export default SaidasTransferenciasPage;
