import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventario, Inventario } from '@/hooks/almoxarifado/useInventarioQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { toast } from 'sonner';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const InventarioPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterAlmoxarifado, setFilterAlmoxarifado] = useState<string>('todos');
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Hooks para dados
  const { 
    inventarios, 
    loading, 
    error, 
    refetch, 
    createInventario, 
    iniciarInventario, 
    finalizarInventario, 
    cancelarInventario,
    getResumoInventario
  } = useInventario();

  const { data: almoxarifadosData } = useAlmoxarifados();
  const almoxarifados = almoxarifadosData || [];

  // Aplicar filtros
  useEffect(() => {
    refetch({
      status: filterStatus !== 'todos' ? filterStatus : undefined,
      tipo: filterTipo !== 'todos' ? filterTipo : undefined,
      almoxarifado_id: filterAlmoxarifado !== 'todos' ? filterAlmoxarifado : undefined
    });
  }, [filterStatus, filterTipo, filterAlmoxarifado, refetch]);

  const handleCriarInventario = async () => {
    if (almoxarifados.length === 0) {
      toast.error('Nenhum almoxarifado disponível');
      return;
    }

    const almoxarifadoId = almoxarifados[0].id; // TODO: Implementar seleção de almoxarifado
    const responsavelId = 'current-user-id'; // TODO: Implementar obtenção do usuário atual

    try {
      await createInventario({
        almoxarifado_id: almoxarifadoId,
        tipo: 'geral',
        responsavel_id: responsavelId,
        observacoes: 'Inventário criado via sistema'
      });
      toast.success('Inventário criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar inventário');
      console.error(error);
    }
  };

  const handleIniciarInventario = async (inventarioId: string) => {
    try {
      await iniciarInventario(inventarioId);
      toast.success('Inventário iniciado!');
    } catch (error) {
      toast.error('Erro ao iniciar inventário');
      console.error(error);
    }
  };

  const handleFinalizarInventario = async (inventarioId: string) => {
    try {
      await finalizarInventario(inventarioId);
      toast.success('Inventário finalizado!');
    } catch (error) {
      toast.error('Erro ao finalizar inventário');
      console.error(error);
    }
  };

  const handleCancelarInventario = async (inventarioId: string) => {
    if (window.confirm('Tem certeza que deseja cancelar este inventário?')) {
      try {
        await cancelarInventario(inventarioId);
        toast.success('Inventário cancelado');
      } catch (error) {
        toast.error('Erro ao cancelar inventário');
        console.error(error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      aberto: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Aberto' },
      em_andamento: { color: 'bg-yellow-100 text-yellow-800', icon: Play, text: 'Em Andamento' },
      finalizado: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Finalizado' },
      cancelado: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Cancelado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aberto;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const tipoConfig = {
      geral: { color: 'bg-gray-100 text-gray-800', text: 'Geral' },
      ciclico: { color: 'bg-blue-100 text-blue-800', text: 'Cíclico' },
      rotativo: { color: 'bg-green-100 text-green-800', text: 'Rotativo' }
    };

    const config = tipoConfig[tipo as keyof typeof tipoConfig] || tipoConfig.geral;

    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
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

  return (
    <RequireEntity entityName="inventarios" action="read">
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <ClipboardList className="inline-block mr-3 h-8 w-8" />
              Inventário
            </h1>
            <p className="text-gray-600">
              Controle de inventários cíclicos e rotativos
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleCriarInventario}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Inventário
            </Button>
          </div>
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
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="ciclico">Cíclico</SelectItem>
                  <SelectItem value="rotativo">Rotativo</SelectItem>
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

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando inventários...</p>
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

      {/* Lista de Inventários */}
      {!loading && !error && (
        <div className="space-y-4">
          {inventarios.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum inventário encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece criando um novo inventário para controlar o estoque
                </p>
                <Button onClick={handleCriarInventario}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Inventário
                </Button>
              </CardContent>
            </Card>
          ) : (
            inventarios.map((inventario) => {
              const resumo = getResumoInventario(inventario.id);
              
              return (
                <Card key={inventario.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Inventário #{inventario.id.slice(-8)}
                          </h3>
                          {getStatusBadge(inventario.status)}
                          {getTipoBadge(inventario.tipo)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Almoxarifado:</span> {inventario.almoxarifado?.nome}
                          </div>
                          <div>
                            <span className="font-medium">Responsável:</span> {inventario.responsavel?.nome}
                          </div>
                          <div>
                            <span className="font-medium">Data Início:</span> {formatDate(inventario.data_inicio)}
                          </div>
                          <div>
                            <span className="font-medium">Data Fim:</span> {inventario.data_fim ? formatDate(inventario.data_fim) : 'Em andamento'}
                          </div>
                        </div>

                        {resumo && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progresso da Contagem:</span>
                              <span>{resumo.percentual_concluido.toFixed(1)}%</span>
                            </div>
                            <Progress value={resumo.percentual_concluido} className="h-2" />
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Total Itens:</span> {resumo.total_itens}
                              </div>
                              <div>
                                <span className="font-medium">Contados:</span> {resumo.itens_contados}
                              </div>
                              <div>
                                <span className="font-medium">Divergentes:</span> {resumo.itens_divergentes}
                              </div>
                              <div>
                                <span className="font-medium">Diferença:</span> {formatCurrency(resumo.diferenca_valor)}
                              </div>
                            </div>
                          </div>
                        )}

                        {inventario.observacoes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Observações:</span> {inventario.observacoes}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedInventario(inventario);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {inventario.status === 'aberto' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleIniciarInventario(inventario.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        {inventario.status === 'em_andamento' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => handleFinalizarInventario(inventario.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {(inventario.status === 'aberto' || inventario.status === 'em_andamento') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleCancelarInventario(inventario.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetails && selectedInventario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalhes do Inventário</h2>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Fechar
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Tipo:</span> {selectedInventario.tipo}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedInventario.status}
                </div>
                <div>
                  <span className="font-medium">Almoxarifado:</span> {selectedInventario.almoxarifado?.nome}
                </div>
                <div>
                  <span className="font-medium">Responsável:</span> {selectedInventario.responsavel?.nome}
                </div>
                <div>
                  <span className="font-medium">Data Início:</span> {formatDateTime(selectedInventario.data_inicio)}
                </div>
                <div>
                  <span className="font-medium">Data Fim:</span> {selectedInventario.data_fim ? formatDateTime(selectedInventario.data_fim) : 'Em andamento'}
                </div>
              </div>

              {selectedInventario.observacoes && (
                <div>
                  <span className="font-medium">Observações:</span>
                  <p className="mt-1 text-gray-600">{selectedInventario.observacoes}</p>
                </div>
              )}

              {/* Lista de Itens do Inventário */}
              {selectedInventario.itens && selectedInventario.itens.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Itens do Inventário</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedInventario.itens.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <span className="font-medium">{item.material?.descricao}</span>
                          <br />
                          <span className="text-sm text-gray-600">
                            Sistema: {item.quantidade_sistema} | Contado: {item.quantidade_contada}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm ${item.diferenca_quantidade !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.diferenca_quantidade > 0 ? '+' : ''}{item.diferenca_quantidade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireEntity>
  );
};

export default InventarioPage;
