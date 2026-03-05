import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Search, 
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye
} from 'lucide-react';
import { useEstoqueAtual } from '@/hooks/almoxarifado/useEstoqueAtualQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useActiveClassesFinanceiras } from '@/hooks/financial/useClassesFinanceiras';

export interface SelectedItem {
  material_id: string;
  material_nome: string;
  material_codigo: string;
  material_unidade: string;
  almoxarifado_id: string;
  almoxarifado_nome: string;
  quantidade_solicitada: number;
  quantidade_disponivel: number;
  valor_unitario: number;
}

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: SelectedItem[]) => void;
  selectedItems: SelectedItem[];
  almoxarifadoId?: string;
}

// Extrai o ID do almoxarifado do item (suporta formato direto ou vindo da relação)
function getAlmoxarifadoIdFromItem(item: any): string | undefined {
  return item?.almoxarifado_id ?? item?.almoxarifado?.id;
}

export function ItemSelectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedItems, 
  almoxarifadoId 
}: ItemSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlmoxarifado, setFilterAlmoxarifado] = useState<string>(almoxarifadoId || 'todos');
  const [items, setItems] = useState<SelectedItem[]>(selectedItems);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [isAddItemsDialogOpen, setIsAddItemsDialogOpen] = useState(false);

  // Buscar todo o estoque (sem filtro na API, como EstoqueAtualPage/InventarioContagemPage);
  // depois enriquecer e filtrar no cliente para evitar dependência do filtro get_entity_data.
  const { 
    data: estoqueRaw = [], 
    isLoading: estoqueLoading, 
    error: estoqueError
  } = useEstoqueAtual();

  const { data: almoxarifados = [] } = useAlmoxarifados();
  const { data: materiais = [] } = useMateriaisEquipamentos();
  const { data: classesFinanceirasResult } = useActiveClassesFinanceiras();
  const classesFinanceiras = (classesFinanceirasResult?.data ?? []) as { id: string; codigo?: string; nome?: string }[];

  // Mesma lógica da EstoqueAtualPage: mapas por id e enriquecimento idêntico
  const materialMap = new Map<string, any>((materiais as any[]).map((m) => [m.id, m]));
  const almoxMap = new Map<string, any>((almoxarifados as any[]).map((a) => [a.id, a]));

  const estoque = (estoqueRaw as any[]).map((item) => {
    const material = item.material || materialMap.get(item.material_equipamento_id);
    const almoxarifado = item.almoxarifado || almoxMap.get(item.almoxarifado_id);
    const quantidadeAtual = Number(item.quantidade_atual ?? 0);
    const valorTotal = item.valor_total != null ? Number(item.valor_total) : undefined;
    const valorUnitario =
      item.valor_unitario ??
      (quantidadeAtual > 0 && valorTotal !== undefined ? valorTotal / quantidadeAtual : 0);
    const estoqueMinimo = item.estoque_minimo ?? (material as any)?.estoque_minimo ?? 0;
    return {
      ...item,
      material,
      almoxarifado,
      valor_unitario: valorUnitario,
      estoque_minimo: estoqueMinimo,
    };
  });

  // Filtrar por almoxarifado (quando selecionado no formulário), busca e estoque > 0
  const filteredEstoque = estoque.filter(item => {
    const itemAlmoxId = getAlmoxarifadoIdFromItem(item);
    const matchesAlmoxarifado = filterAlmoxarifado === 'todos' || itemAlmoxId === filterAlmoxarifado;
    const hasStock = (item.quantidade_atual ?? 0) > 0;
    const matNome = item.material?.nome || item.material?.descricao || '';
    const matchesSearch = !searchTerm.trim() ||
      matNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.material?.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.almoxarifado?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAlmoxarifado && hasStock && matchesSearch;
  });

  const handleAddItem = (estoqueItem: any) => {
    const almoxId = getAlmoxarifadoIdFromItem(estoqueItem);
    const existingItem = items.find(item => 
      item.material_id === estoqueItem.material_equipamento_id && 
      item.almoxarifado_id === almoxId
    );

    if (existingItem) {
      setItems(prev => prev.map(item => 
        item.material_id === estoqueItem.material_equipamento_id && item.almoxarifado_id === almoxId
          ? { ...item, quantidade_solicitada: Math.min(item.quantidade_solicitada + 1, item.quantidade_disponivel) }
          : item
      ));
    } else {
      const newItem: SelectedItem = {
        material_id: estoqueItem.material_equipamento_id,
        material_nome: estoqueItem.material?.nome || estoqueItem.material?.descricao || 'Material',
        material_codigo: estoqueItem.material?.codigo_interno || 'N/A',
        material_unidade: estoqueItem.material?.unidade_medida || 'un',
        almoxarifado_id: almoxId || estoqueItem.almoxarifado_id,
        almoxarifado_nome: estoqueItem.almoxarifado?.nome || 'Almoxarifado',
        quantidade_solicitada: 1,
        quantidade_disponivel: estoqueItem.quantidade_atual ?? 0,
        valor_unitario: estoqueItem.valor_unitario || 0
      };
      setItems(prev => [...prev, newItem]);
    }
  };

  const handleRemoveItem = (materialId: string, almoxarifadoId: string) => {
    setItems(prev => prev.filter(item => 
      !(item.material_id === materialId && item.almoxarifado_id === almoxarifadoId)
    ));
  };

  const handleUpdateQuantity = (materialId: string, almoxarifadoId: string, quantity: number) => {
    setItems(prev => prev.map(item => 
      item.material_id === materialId && item.almoxarifado_id === almoxarifadoId
        ? { ...item, quantidade_solicitada: Math.max(0, Math.min(quantity, item.quantidade_disponivel)) }
        : item
    ));
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => total + (item.quantidade_solicitada * item.valor_unitario), 0);
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

  const getStatusBadge = (item: any) => {
    if (item.quantidade_atual === 0) {
      return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Sem Estoque' };
    } else if (item.quantidade_atual <= item.estoque_minimo) {
      return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, text: 'Baixo Estoque' };
    } else {
      return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Disponível' };
    }
  };

  // Manter o filtro de almoxarifado alinhado ao almoxarifado selecionado no formulário
  useEffect(() => {
    if (almoxarifadoId) {
      setFilterAlmoxarifado(almoxarifadoId);
    } else {
      setFilterAlmoxarifado('todos');
    }
  }, [almoxarifadoId, isOpen]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Itens do Estoque
          </DialogTitle>
          <DialogDescription>
            {almoxarifadoId
              ? 'Itens disponíveis no almoxarifado de origem selecionado na solicitação'
              : 'Escolha os materiais e equipamentos que serão solicitados'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Orientação e ação para adicionar itens */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              {almoxarifadoId ? 'Itens disponíveis em estoque no almoxarifado selecionado' : 'Itens Disponíveis em Estoque'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para adicionar itens do estoque à solicitação. Após adicionar, eles aparecerão na lista de &quot;Itens Selecionados&quot;.
            </p>
            <Button type="button" onClick={() => setIsAddItemsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Itens
            </Button>
          </div>

          {/* Itens Selecionados */}
          {items.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Itens Selecionados ({items.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item, index) => (
                  <Card key={`${item.material_id}-${item.almoxarifado_id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span className="font-medium">{item.material_nome}</span>
                            <Badge variant="outline">{item.material_codigo}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.almoxarifado_nome} | {formatCurrency(item.valor_unitario)} por {item.material_unidade}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.material_id, item.almoxarifado_id, item.quantidade_solicitada - 1)}
                            disabled={item.quantidade_solicitada <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <div className="w-16 text-center">
                            <Input
                              type="number"
                              min="1"
                              max={item.quantidade_disponivel}
                              value={item.quantidade_solicitada}
                              onChange={(e) => handleUpdateQuantity(item.material_id, item.almoxarifado_id, parseInt(e.target.value) || 1)}
                              className="text-center"
                            />
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.material_id, item.almoxarifado_id, item.quantidade_solicitada + 1)}
                            disabled={item.quantidade_solicitada >= item.quantidade_disponivel}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveItem(item.material_id, item.almoxarifado_id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-muted-foreground">
                        Total: {formatCurrency(item.quantidade_solicitada * item.valor_unitario)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Valor Total:</span>
                  <span>{formatCurrency(getTotalValue())}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(items)} disabled={items.length === 0}>
            Confirmar Seleção ({items.length} itens)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal interno para buscar e adicionar itens do estoque */}
    <Dialog open={isAddItemsDialogOpen} onOpenChange={setIsAddItemsDialogOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adicionar Itens do Estoque
          </DialogTitle>
          <DialogDescription>
            {almoxarifadoId
              ? 'Busque e adicione itens disponíveis no almoxarifado de origem selecionado.'
              : 'Busque e adicione itens disponíveis em estoque nos almoxarifados.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros e busca */}
          <div className={`grid grid-cols-1 gap-4 ${almoxarifadoId ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {!almoxarifadoId && (
              <div className="space-y-2">
                <Label htmlFor="almoxarifado">Almoxarifado</Label>
                <select
                  value={filterAlmoxarifado}
                  onChange={(e) => setFilterAlmoxarifado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os almoxarifados</option>
                  {almoxarifados.map((almoxarifado) => (
                    <option key={almoxarifado.id} value={almoxarifado.id}>
                      {almoxarifado.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {almoxarifadoId && (
              <div className="space-y-2">
                <Label>Almoxarifado</Label>
                <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm">
                  {almoxarifados.find((a) => a.id === almoxarifadoId)?.nome ?? 'Almoxarifado de origem'}
                </div>
                <p className="text-xs text-muted-foreground">Exibindo apenas itens disponíveis neste almoxarifado</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterAlmoxarifado(almoxarifadoId || 'todos');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {/* Lista de Itens Disponíveis para adicionar */}
          <div className="space-y-4">
            {estoqueLoading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Carregando estoque...</p>
              </div>
            )}

            {estoqueError && (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Erro ao carregar estoque</p>
              </div>
            )}

            {!estoqueLoading && !estoqueError && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredEstoque.map((item) => {
                  const statusConfig = getStatusBadge(item);
                  const StatusIcon = statusConfig.icon;
                  const isSelected = items.some(selected =>
                    selected.material_id === item.material_equipamento_id &&
                    selected.almoxarifado_id === getAlmoxarifadoIdFromItem(item)
                  );

                  return (
                    <Card
                      key={`${item.material_equipamento_id}-${getAlmoxarifadoIdFromItem(item)}`}
                      className={isSelected ? 'ring-2 ring-blue-500' : ''}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {item.material?.imagem_url ? (
                              <button
                                type="button"
                                onClick={() => setImagePreviewUrl(item.material.imagem_url)}
                                className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted flex-shrink-0"
                                title="Ver imagem do material"
                              >
                                <img
                                  src={item.material.imagem_url}
                                  alt={item.material?.nome || item.material?.descricao || 'Imagem do material'}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ) : (
                              <Package className="h-5 w-5 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-sm">
                                {item.material?.nome || item.material?.descricao || 'Material'}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                Código: {item.material?.codigo_interno || 'N/A'} | {item.almoxarifado?.nome || 'Almoxarifado'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setViewingItem(item);
                              }}
                              title="Visualizar mais informações"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.text}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Disponível:</span>
                            <span className="font-medium">
                              {formatNumber(item.quantidade_atual)} {item.material?.unidade_medida || 'un'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Valor Unitário:</span>
                            <span className="font-medium">
                              {formatCurrency(item.valor_unitario || 0)}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleAddItem(item)}
                          disabled={item.quantidade_atual === 0}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {isSelected ? 'Adicionar Mais' : 'Adicionar'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog: imagem em tamanho maior (como na Estoque Atual) */}
    <Dialog
      open={!!imagePreviewUrl}
      onOpenChange={(open) => !open && setImagePreviewUrl(null)}
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

    {/* Dialog: mais informações do item (como em almoxarifado/materiais) — usa Dialog para portal no body */}
    <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {viewingItem && (
          <>
            <DialogHeader>
              <DialogTitle>
                {viewingItem.material?.nome || viewingItem.material?.descricao || 'Material'}
              </DialogTitle>
              {viewingItem.material?.nome && viewingItem.material?.descricao && (
                <DialogDescription className="mt-1">
                  {viewingItem.material.descricao}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  {viewingItem.material?.tipo === 'equipamento' ? 'Equipamento' :
                   viewingItem.material?.tipo === 'produto' ? 'Produto' :
                   viewingItem.material?.tipo === 'servico' ? 'Serviço' : 'Material'}
                </Badge>
                <Badge variant={viewingItem.material?.status === 'ativo' ? 'default' : 'secondary'}>
                  {viewingItem.material?.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Descrição:</span>
                    <p className="font-medium mt-0.5">{(viewingItem.material as any)?.descricao ?? viewingItem.material?.nome ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Código:</span>
                    <p className="font-medium">{viewingItem.material?.codigo_interno ?? 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grupo de Materiais:</span>
                    <p className="font-medium">{(viewingItem.material as any)?.classe ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unidade de Medida:</span>
                    <p className="font-medium">{viewingItem.material?.unidade_medida ?? 'un'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Classe Financeira:</span>
                    <p className="font-medium">
                      {(() => {
                        const cfId = (viewingItem.material as any)?.classe_financeira_id;
                        if (!cfId) return '—';
                        const cf = classesFinanceiras.find((c) => c.id === cfId);
                        return cf ? [cf.codigo, cf.nome].filter(Boolean).join(' – ') || cf.nome || '—' : '—';
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor unitário:</span>
                    <p className="font-medium">{formatCurrency(viewingItem.valor_unitario ?? 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estoque mínimo:</span>
                    <p className="font-medium">{formatNumber((viewingItem.material as any)?.estoque_minimo ?? 0)}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Neste almoxarifado</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Almoxarifado:</span>
                    <p className="font-medium">{viewingItem.almoxarifado?.nome ?? 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantidade disponível:</span>
                    <p className="font-medium">{formatNumber(viewingItem.quantidade_atual ?? 0)} {viewingItem.material?.unidade_medida ?? 'un'}</p>
                  </div>
                </div>
              </div>
              {(viewingItem.material as any)?.observacoes && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Observações</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(viewingItem.material as any).observacoes}</p>
                </div>
              )}
              {viewingItem.material?.imagem_url && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Imagem</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setViewingItem(null);
                      setImagePreviewUrl(viewingItem.material.imagem_url);
                    }}
                    className="rounded-md overflow-hidden border block"
                  >
                    <img
                      src={viewingItem.material.imagem_url}
                      alt={viewingItem.material?.nome || viewingItem.material?.descricao || 'Material'}
                      className="max-w-xs max-h-48 object-contain w-full"
                    />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  </>
  );
}
