import React, { useMemo, useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { usePurchaseOrders } from '@/hooks/compras/useComprasData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCompany } from '@/lib/company-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseService } from '@/services/compras/purchaseService';

// Componente principal protegido por permissões
export default function PedidosCompraPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();

  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'page', 
        name: '/compras/pedidos*', 
        action: 'read' 
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pedidos de Compra</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <PedidosList />
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}

// Componente da lista de pedidos
function PedidosList() {
  const { canEditPage, canDeletePage } = usePermissions();
  const { data: pedidos = [], isLoading } = usePurchaseOrders();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [editingPedido, setEditingPedido] = useState<any | null>(null);
  const [editDataEntrega, setEditDataEntrega] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editNumeroNotaFiscal, setEditNumeroNotaFiscal] = useState('');
  const [editSerieNotaFiscal, setEditSerieNotaFiscal] = useState('');
  const [editTipoDocumentoFiscal, setEditTipoDocumentoFiscal] = useState('');
  const [editChaveAcesso, setEditChaveAcesso] = useState('');

  const { data: pedidoItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['compras', 'pedido-itens', selectedPedido?.id, selectedCompany?.id],
    queryFn: () =>
      purchaseService.getPedidoItems(selectedPedido!.id, selectedCompany!.id),
    enabled: !!selectedCompany?.id && !!selectedPedido?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      pedidoId: string;
      data_entrega_prevista?: string | null;
      observacoes?: string | null;
      numero_nota_fiscal?: string | null;
      serie_nota_fiscal?: string | null;
      tipo_documento_fiscal?: string | null;
      chave_acesso?: string | null;
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }
      await purchaseService.updatePurchaseOrder({
        companyId: selectedCompany.id,
        pedidoId: input.pedidoId,
        data: {
          data_entrega_prevista: input.data_entrega_prevista || null,
          observacoes: input.observacoes ?? null,
          numero_nota_fiscal: input.numero_nota_fiscal || null,
          serie_nota_fiscal: input.serie_nota_fiscal || null,
          tipo_documento_fiscal: input.tipo_documento_fiscal || null,
          chave_acesso: input.chave_acesso || null,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Pedido atualizado',
        description: 'O pedido de compra foi atualizado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] });
      setEditingPedido(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pedido',
        description: error?.message || 'Não foi possível atualizar o pedido.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pedidoId: string) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }
      await purchaseService.deletePurchaseOrder({
        companyId: selectedCompany.id,
        pedidoId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Pedido excluído',
        description: 'O pedido de compra foi excluído com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['compras', 'pedidos'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir pedido',
        description: error?.message || 'Não foi possível excluir o pedido.',
      });
    },
  });

  const handleView = (pedido: any) => {
    setSelectedPedido(pedido);
  };

  const handleCloseDetails = () => {
    setSelectedPedido(null);
  };

  const handleEdit = (pedido: any) => {
    setEditingPedido(pedido);
    setEditDataEntrega(
      pedido.data_entrega_prevista
        ? new Date(pedido.data_entrega_prevista).toISOString().split('T')[0]
        : ''
    );
    setEditObservacoes(pedido.observacoes || '');
    setEditNumeroNotaFiscal(pedido.numero_nota_fiscal || '');
    setEditSerieNotaFiscal(pedido.serie_nota_fiscal || '');
    setEditTipoDocumentoFiscal(pedido.tipo_documento_fiscal || '');
    setEditChaveAcesso(pedido.chave_acesso || '');
  };

  const handleDelete = (pedido: any) => {
    if (!window.confirm(`Tem certeza que deseja excluir o pedido "${pedido.numero_pedido}"?`)) {
      return;
    }
    deleteMutation.mutate(pedido.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'Aprovado':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'Rejeitado':
        return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      case 'Entregue':
        return <Badge variant="outline" className="text-blue-600"><CheckCircle className="h-3 w-3 mr-1" />Entregue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    if (!search) return pedidos;
    const term = search.toLowerCase();
    return pedidos.filter((pedido: any) =>
      pedido.numero_pedido?.toLowerCase().includes(term) ||
      pedido.status?.toLowerCase().includes(term) ||
      pedido.fornecedor_nome?.toLowerCase().includes(term),
    );
  }, [pedidos, search]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar pedidos..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Data Pedido</TableHead>
            <TableHead>Data Entrega Prevista</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Cotação</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Carregando pedidos...
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((pedido: any) => (
              <TableRow key={pedido.id}>
                <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
                <TableCell>
                  {pedido.data_pedido
                    ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>
                  {pedido.data_entrega_prevista
                    ? new Date(pedido.data_entrega_prevista).toLocaleDateString('pt-BR')
                    : '--'}
                </TableCell>
                <TableCell>{getStatusBadge(pedido.workflow_state || pedido.status)}</TableCell>
                <TableCell>{pedido.fornecedor_nome || pedido.fornecedor_id}</TableCell>
                <TableCell>
                  {pedido.valor_total
                    ? `R$ ${Number(pedido.valor_total).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : '--'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    <ShoppingCart className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate max-w-[140px]">
                      {pedido.numero_cotacao ?? (pedido.cotacao_id ? 'Cotação vinculada' : 'Sem cotação')}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(pedido)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <PermissionGuard page="/compras/pedidos*" action="edit" fallback={null}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canEditPage('/compras/pedidos*')}
                        onClick={() => handleEdit(pedido)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>

                    <PermissionGuard page="/compras/pedidos*" action="delete" fallback={null}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={!canDeletePage('/compras/pedidos*')}
                        onClick={() => handleDelete(pedido)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedPedido && (
        <Dialog open={!!selectedPedido} onOpenChange={handleCloseDetails}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido de Compra</DialogTitle>
              <DialogDescription>
                Número {selectedPedido.numero_pedido} • Fornecedor{' '}
                {selectedPedido.fornecedor_nome || selectedPedido.fornecedor_id || '—'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data do Pedido:</span>{' '}
                  <span className="font-medium">
                    {selectedPedido.data_pedido
                      ? new Date(selectedPedido.data_pedido).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Entrega Prevista:</span>{' '}
                  <span className="font-medium">
                    {selectedPedido.data_entrega_prevista
                      ? new Date(selectedPedido.data_entrega_prevista).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fornecedor:</span>{' '}
                  <span className="font-medium">
                    {selectedPedido.fornecedor_nome || selectedPedido.fornecedor_id || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="font-medium">
                    {selectedPedido.workflow_state || selectedPedido.status || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total:</span>{' '}
                  <span className="font-medium">
                    {selectedPedido.valor_total
                      ? `R$ ${Number(selectedPedido.valor_total).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}`
                      : '—'}
                  </span>
                </div>
              </div>

              {selectedPedido.observacoes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Observações:</span>
                  <p className="mt-1 whitespace-pre-wrap">{selectedPedido.observacoes}</p>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Itens do Pedido</h3>
                {isLoadingItems ? (
                  <div className="text-sm text-muted-foreground">Carregando itens...</div>
                ) : pedidoItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum item encontrado.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Valor Unitário</TableHead>
                        <TableHead>Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidoItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {item.material?.nome || item.material?.codigo || '—'}
                              </span>
                              {item.material?.codigo && (
                                <span className="text-xs text-muted-foreground">
                                  {item.material.codigo}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantidade || '—'}</TableCell>
                          <TableCell>
                            {item.valor_unitario
                              ? `R$ ${Number(item.valor_unitario).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {item.valor_total
                              ? `R$ ${Number(item.valor_total).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editingPedido && (
        <Dialog open={!!editingPedido} onOpenChange={() => setEditingPedido(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Pedido de Compra</DialogTitle>
              <DialogDescription>
                Número {editingPedido.numero_pedido} • Fornecedor{' '}
                {editingPedido.fornecedor_nome || editingPedido.fornecedor_id || '—'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-data-entrega">Data de Entrega Prevista</Label>
                <Input
                  id="edit-data-entrega"
                  type="date"
                  value={editDataEntrega}
                  onChange={(e) => setEditDataEntrega(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-numero-nota-fiscal">Número da Nota Fiscal</Label>
                <Input
                  id="edit-numero-nota-fiscal"
                  value={editNumeroNotaFiscal}
                  onChange={(e) => setEditNumeroNotaFiscal(e.target.value)}
                  placeholder="Número da nota fiscal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-serie-nota-fiscal">Série da Nota Fiscal</Label>
                <Input
                  id="edit-serie-nota-fiscal"
                  value={editSerieNotaFiscal}
                  onChange={(e) => setEditSerieNotaFiscal(e.target.value)}
                  placeholder="Ex.: 1, 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tipo-documento-fiscal">Tipo de Documento Fiscal</Label>
                <Select
                  value={editTipoDocumentoFiscal || 'none'}
                  onValueChange={(v) => setEditTipoDocumentoFiscal(v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="NF-e">NF-e</SelectItem>
                    <SelectItem value="NFC-e">NFC-e</SelectItem>
                    <SelectItem value="CT-e">CT-e</SelectItem>
                    <SelectItem value="NF">NF (modelo 1/1A)</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-chave-acesso">Chave de acesso</Label>
                <Input
                  id="edit-chave-acesso"
                  value={editChaveAcesso}
                  onChange={(e) => setEditChaveAcesso(e.target.value.replace(/\D/g, '').slice(0, 44))}
                  placeholder="44 dígitos da chave NF-e"
                  maxLength={44}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-observacoes">Observações</Label>
                <Textarea
                  id="edit-observacoes"
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPedido(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    updateMutation.mutate({
                      pedidoId: editingPedido.id,
                      data_entrega_prevista: editDataEntrega || undefined,
                      observacoes: editObservacoes,
                      numero_nota_fiscal: editNumeroNotaFiscal || undefined,
                      serie_nota_fiscal: editSerieNotaFiscal || undefined,
                      tipo_documento_fiscal: editTipoDocumentoFiscal || undefined,
                      chave_acesso: editChaveAcesso || undefined,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Componente do formulário de novo pedido
function NovoPedidoForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    data_entrega_prevista: '',
    fornecedor_nome: '',
    cotacao_id: '',
    observacoes: '',
    itens: [] as any[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui você implementaria a lógica de criação do pedido
    toast({
      title: "Pedido criado",
      description: "O pedido de compra foi criado com sucesso.",
    });
    onClose();
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        id: Date.now().toString(),
        material_nome: '',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: 0,
        valor_total: 0,
        observacoes: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_entrega_prevista">Data de Entrega Prevista</Label>
          <Input
            id="data_entrega_prevista"
            type="date"
            value={formData.data_entrega_prevista}
            onChange={(e) => setFormData(prev => ({ ...prev, data_entrega_prevista: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fornecedor_nome">Fornecedor</Label>
          <Input
            id="fornecedor_nome"
            value={formData.fornecedor_nome}
            onChange={(e) => setFormData(prev => ({ ...prev, fornecedor_nome: e.target.value }))}
            placeholder="Nome do fornecedor"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cotacao_id">Cotação de Preços</Label>
        <Input
          id="cotacao_id"
          value={formData.cotacao_id}
          onChange={(e) => setFormData(prev => ({ ...prev, cotacao_id: e.target.value }))}
          placeholder="ID da cotação de preços"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
          placeholder="Observações adicionais"
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Itens do Pedido</Label>
          <Button type="button" onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {formData.itens.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Item {index + 1}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeItem(index)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={item.material_nome}
                  onChange={(e) => updateItem(index, 'material_nome', e.target.value)}
                  placeholder="Nome do material"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={item.quantidade}
                  onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                  min="1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={item.unidade}
                  onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                  placeholder="UN, KG, etc."
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.valor_unitario}
                  onChange={(e) => updateItem(index, 'valor_unitario', Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Observações do Item</Label>
                <Input
                  value={item.observacoes}
                  onChange={(e) => updateItem(index, 'observacoes', e.target.value)}
                  placeholder="Observações específicas do item"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Criar Pedido
        </Button>
      </div>
    </form>
  );
}