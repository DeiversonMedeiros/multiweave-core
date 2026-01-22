import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Search, 
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMovimentacoesEstoque } from '@/hooks/almoxarifado/useMovimentacoesEstoqueQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';
import { RequirePage } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';

const HistoricoMovimentacoesPage: React.FC = () => {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterAlmoxarifado, setFilterAlmoxarifado] = useState<string>('todos');
  const [filterMaterial, setFilterMaterial] = useState<string>('todos');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Hooks para dados
  const { 
    movimentacoes, 
    loading, 
    error, 
    refetch,
    getResumoMovimentacoes,
    getMovimentacoesRecentes
  } = useMovimentacoesEstoque({
    tipo_movimentacao: filterTipo !== 'todos' ? filterTipo : undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
    almoxarifado_id: filterAlmoxarifado !== 'todos' ? filterAlmoxarifado : undefined,
    material_equipamento_id: filterMaterial !== 'todos' ? filterMaterial : undefined,
    data_inicio: filterDataInicio || undefined,
    data_fim: filterDataFim || undefined
  });

  const { data: almoxarifadosData } = useAlmoxarifados();
  const { data: materiaisData } = useMateriaisEquipamentos();
  
  const almoxarifados = almoxarifadosData || [];
  const materiais = materiaisData || [];
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];

  // Os filtros são aplicados diretamente no hook useMovimentacoesEstoque

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente' },
      confirmado: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Confirmado' },
      cancelado: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Cancelado' }
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
      entrada: { icon: TrendingUp, color: 'text-green-600', text: 'Entrada' },
      saida: { icon: TrendingDown, color: 'text-red-600', text: 'Saída' },
      transferencia: { icon: ArrowRightLeft, color: 'text-blue-600', text: 'Transferência' },
      ajuste: { icon: Settings, color: 'text-orange-600', text: 'Ajuste' },
      inventario: { icon: Package, color: 'text-purple-600', text: 'Inventário' }
    };

    const config = iconConfig[tipo as keyof typeof iconConfig] || iconConfig.entrada;
    const IconComponent = config.icon;

    return (

      <div className="flex items-center space-x-2">
        <IconComponent className={`h-4 w-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
      </div>
    );
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleExport = () => {
    // TODO: Implementar exportação para Excel/CSV
    toast.info('Funcionalidade de exportação em desenvolvimento');
  };

  const resumoMovimentacoes = getResumoMovimentacoes();
  const movimentacoesRecentes = getMovimentacoesRecentes(10);

  return (
    <RequirePage pagePath="/almoxarifado/historico*" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <History className="inline-block mr-3 h-8 w-8" />
              Histórico de Movimentações
            </h1>
            <p className="text-gray-600">
              Histórico completo de todas as movimentações de estoque
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => refetch()}>
              <Package className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Resumo de Movimentações */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumoMovimentacoes.total_entradas}</div>
              <p className="text-xs text-gray-500">{formatCurrency(resumoMovimentacoes.valor_total_entradas)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Total Saídas</CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
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

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
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

              <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Materiais</SelectItem>
                  {materiais.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <Input
                  type="date"
                  placeholder="Data início"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Data fim"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando movimentações...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de Movimentações */}
      {!loading && !error && (
        <div className="space-y-4">
          {movimentacoes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <History className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma movimentação encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Ajuste os filtros ou realize algumas movimentações para ver o histórico
                </p>
                <Button onClick={() => refetch()}>
                  <Package className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
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
                          <span className="font-medium">Data:</span> {formatDateTime(movimentacao.data_movimentacao)}
                        </div>
                      </div>

                      {movimentacao.almoxarifado_origem && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Origem:</span> {movimentacao.almoxarifado_origem.nome}
                        </div>
                      )}

                      {movimentacao.almoxarifado_destino && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Destino:</span> {movimentacao.almoxarifado_destino.nome}
                        </div>
                      )}

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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedMovimentacao(movimentacao);
                          setShowDetails(true);
                        }}
                      >
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

      {/* Modal de Detalhes */}
      {showDetails && selectedMovimentacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalhes da Movimentação</h2>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Fechar
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Tipo:</span> {selectedMovimentacao.tipo_movimentacao}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedMovimentacao.status}
                </div>
                <div>
                  <span className="font-medium">Quantidade:</span> {selectedMovimentacao.quantidade}
                </div>
                <div>
                  <span className="font-medium">Unidade:</span> {selectedMovimentacao.material?.unidade_medida}
                </div>
                <div>
                  <span className="font-medium">Usuário:</span> {selectedMovimentacao.usuario?.nome}
                </div>
                <div>
                  <span className="font-medium">Data:</span> {formatDateTime(selectedMovimentacao.data_movimentacao)}
                </div>
              </div>

              {selectedMovimentacao.observacoes && (
                <div>
                  <span className="font-medium">Observações:</span>
                  <p className="mt-1 text-gray-600">{selectedMovimentacao.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </RequirePage>
  );
};

export default HistoricoMovimentacoesPage;
