import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEstoqueAtual } from '@/hooks/almoxarifado/useEstoqueAtualQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const EstoqueAtualPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlmoxarifado, setFilterAlmoxarifado] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Hooks para dados
  const { 
    data: estoque = [], 
    isLoading: estoqueLoading, 
    error: estoqueError,
    refetch: refetchEstoque
  } = useEstoqueAtual();

  const { data: almoxarifados = [] } = useAlmoxarifados();
  const { data: materiais = [] } = useMateriaisEquipamentos();

  const openImageDialog = (url: string) => {
    setImagePreviewUrl(url);
    setImageDialogOpen(true);
  };

  // Enriquecer itens de estoque com dados de material e almoxarifado,
  // e calcular valor_unitario/estoque_minimo quando não vierem do back-end.
  const materialMap = new Map<string, any>((materiais as any[]).map((m) => [m.id, m]));
  const almoxMap = new Map<string, any>((almoxarifados as any[]).map((a) => [a.id, a]));

  const enrichedEstoque = (estoque as any[]).map((item) => {
    const material = item.material || materialMap.get(item.material_equipamento_id);
    const almoxarifado = item.almoxarifado || almoxMap.get(item.almoxarifado_id);

    const estoqueMinimo =
      item.estoque_minimo ??
      material?.estoque_minimo ??
      0;

    const quantidadeAtual = Number(item.quantidade_atual || 0);
    const valorTotal = item.valor_total != null ? Number(item.valor_total) : undefined;

    const valorUnitario =
      item.valor_unitario ??
      (quantidadeAtual > 0 && valorTotal !== undefined
        ? valorTotal / quantidadeAtual
        : undefined);

    return {
      ...item,
      material,
      almoxarifado,
      estoque_minimo: estoqueMinimo,
      valor_unitario: valorUnitario,
    };
  });

  // Filtrar dados
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredEstoque = enrichedEstoque.filter(item => {
    const matchesSearch =
      !normalizedSearch ||
      item.material?.nome?.toLowerCase().includes(normalizedSearch) ||
      item.material?.descricao?.toLowerCase().includes(normalizedSearch) ||
      item.material?.codigo_interno?.toLowerCase().includes(normalizedSearch) ||
      item.almoxarifado?.nome?.toLowerCase().includes(normalizedSearch);
    
    const matchesAlmoxarifado = filterAlmoxarifado === 'todos' || item.almoxarifado_id === filterAlmoxarifado;
    
    const matchesStatus = filterStatus === 'todos' || 
      (filterStatus === 'disponivel' && item.quantidade_atual > 0) ||
      (filterStatus === 'baixo_estoque' && item.quantidade_atual <= (item.estoque_minimo || 0) && item.quantidade_atual > 0) ||
      (filterStatus === 'sem_estoque' && item.quantidade_atual === 0);

    return matchesSearch && matchesAlmoxarifado && matchesStatus;
  });

  const getStatusBadge = (item: any) => {
    if (item.quantidade_atual === 0) {
      return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Sem Estoque' };
    } else if (item.quantidade_atual <= (item.estoque_minimo || 0)) {
      return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, text: 'Baixo Estoque' };
    } else {
      return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Disponível' };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <RequirePage pagePath="/almoxarifado/estoque*" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                <Package className="inline-block mr-3 h-8 w-8" />
                Estoque Atual
              </h1>
              <p className="text-gray-600">
                Visualize todos os materiais e equipamentos disponíveis em estoque
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => refetchEstoque()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
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
                    placeholder="Buscar por nome, código ou almoxarifado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="baixo_estoque">Baixo Estoque</SelectItem>
                    <SelectItem value="sem_estoque">Sem Estoque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterAlmoxarifado('todos');
                    setFilterStatus('todos');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Estoque */}
        {estoqueLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Carregando estoque...</p>
            </CardContent>
          </Card>
        )}

        {estoqueError && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Erro ao carregar estoque</p>
              <Button 
                variant="outline" 
                onClick={() => refetchEstoque()}
                className="mt-4"
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!estoqueLoading && !estoqueError && (
          <div className="space-y-4">
            {filteredEstoque.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
                  <p className="text-muted-foreground">
                    Tente ajustar os filtros para encontrar o que procura.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEstoque.map((item) => {
                  const statusConfig = getStatusBadge(item);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Card key={`${item.material_equipamento_id}-${item.almoxarifado_id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {item.material?.imagem_url ? (
                              <button
                                type="button"
                                onClick={() => openImageDialog(item.material.imagem_url)}
                                className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted flex-shrink-0"
                                title="Ver imagem do material"
                              >
                                <img
                                  src={item.material.imagem_url}
                                  alt={item.material.nome || item.material.descricao || 'Imagem do material'}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ) : (
                              <Package className="h-5 w-5" />
                            )}
                            <div>
                              <CardTitle className="text-lg">
                                {item.material?.nome || item.material?.descricao || 'Material'}
                              </CardTitle>
                              <CardDescription>
                                Código: {item.material?.codigo_interno || 'N/A'}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Almoxarifado:</span>
                              <p className="font-medium">{item.almoxarifado?.nome || 'Almoxarifado'}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-muted-foreground">Quantidade Atual:</span>
                              <p className="font-semibold text-lg">
                                {formatNumber(item.quantidade_atual)} {item.material?.unidade_medida || 'un'}
                              </p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-muted-foreground">Estoque Mínimo:</span>
                              <p className="font-medium">
                                {formatNumber(item.estoque_minimo || 0)} {item.material?.unidade_medida || 'un'}
                              </p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-muted-foreground">Valor Unitário:</span>
                              <p className="font-medium">
                                {item.valor_unitario ? formatCurrency(item.valor_unitario) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {item.quantidade_atual > 0 && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Valor Total em Estoque:</span>
                                <span className="font-semibold">
                                  {formatCurrency((item.quantidade_atual || 0) * (item.valor_unitario || 0))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Dialog
          open={imageDialogOpen && !!imagePreviewUrl}
          onOpenChange={(open) => {
            if (!open) {
              setImageDialogOpen(false);
              setImagePreviewUrl(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Imagem do material"
                className="w-full h-auto rounded-md"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RequirePage>
  );
};

export default EstoqueAtualPage;
