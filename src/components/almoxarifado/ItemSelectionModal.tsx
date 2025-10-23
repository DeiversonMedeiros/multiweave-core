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
  Loader2
} from 'lucide-react';
import { useEstoqueAtual } from '@/hooks/almoxarifado/useEstoqueAtualQuery';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';

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

  // Hooks para dados
  const { 
    data: estoque = [], 
    isLoading: estoqueLoading, 
    error: estoqueError
  } = useEstoqueAtual();

  const { data: almoxarifados = [] } = useAlmoxarifados();

  // Filtrar estoque
  const filteredEstoque = estoque.filter(item => {
    const matchesSearch = item.material?.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.material?.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.almoxarifado?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAlmoxarifado = filterAlmoxarifado === 'todos' || item.almoxarifado_id === filterAlmoxarifado;
    
    const hasStock = item.quantidade_atual > 0;

    return matchesSearch && matchesAlmoxarifado && hasStock;
  });

  const handleAddItem = (estoqueItem: any) => {
    const existingItem = items.find(item => 
      item.material_id === estoqueItem.material_equipamento_id && 
      item.almoxarifado_id === estoqueItem.almoxarifado_id
    );

    if (existingItem) {
      // Aumentar quantidade se já existe
      setItems(prev => prev.map(item => 
        item.material_id === estoqueItem.material_equipamento_id && item.almoxarifado_id === estoqueItem.almoxarifado_id
          ? { ...item, quantidade_solicitada: Math.min(item.quantidade_solicitada + 1, item.quantidade_disponivel) }
          : item
      ));
    } else {
      // Adicionar novo item
      const newItem: SelectedItem = {
        material_id: estoqueItem.material_equipamento_id,
        material_nome: estoqueItem.material?.descricao || 'Material',
        material_codigo: estoqueItem.material?.codigo_interno || 'N/A',
        material_unidade: estoqueItem.material?.unidade_medida || 'un',
        almoxarifado_id: estoqueItem.almoxarifado_id,
        almoxarifado_nome: estoqueItem.almoxarifado?.nome || 'Almoxarifado',
        quantidade_solicitada: 1,
        quantidade_disponivel: estoqueItem.quantidade_atual,
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

  useEffect(() => {
    if (almoxarifadoId) {
      setFilterAlmoxarifado(almoxarifadoId);
    }
  }, [almoxarifadoId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Itens do Estoque
          </DialogTitle>
          <DialogDescription>
            Escolha os materiais e equipamentos que serão solicitados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Lista de Itens Disponíveis */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Itens Disponíveis em Estoque</h3>
            
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
                    selected.almoxarifado_id === item.almoxarifado_id
                  );
                  
                  return (
                    <Card key={`${item.material_equipamento_id}-${item.almoxarifado_id}`} className={isSelected ? 'ring-2 ring-blue-500' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <CardTitle className="text-sm">{item.material?.descricao || 'Material'}</CardTitle>
                          </div>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.text}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Código: {item.material?.codigo_interno || 'N/A'} | {item.almoxarifado?.nome || 'Almoxarifado'}
                        </p>
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
  );
}
