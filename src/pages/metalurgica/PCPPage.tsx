import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProdutos } from '@/hooks/metalurgica/useProdutos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PCPPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanejamento, setSelectedPlanejamento] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: planejamentosData, isLoading } = useQuery({
    queryKey: ['metalurgica', 'planejamentos', selectedCompany?.id],
    queryFn: () => metalurgicaService.listPlanejamentos(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
  });

  const { data: produtosData } = useProdutos();
  const produtos = produtosData?.data || [];
  const planejamentos = planejamentosData?.data || [];

  // Query para buscar detalhes do planejamento selecionado
  const { data: planejamentoDetalhes, isLoading: isLoadingDetalhes } = useQuery({
    queryKey: ['metalurgica', 'planejamento', selectedPlanejamento, selectedCompany?.id],
    queryFn: () => {
      if (!selectedPlanejamento || !selectedCompany?.id) return null;
      return metalurgicaService.getPlanejamentoById(selectedCompany.id, selectedPlanejamento);
    },
    enabled: !!selectedPlanejamento && !!selectedCompany?.id,
  });

  const [formData, setFormData] = useState({
    periodo_inicio: '',
    periodo_fim: '',
    observacoes: '',
    itens: [] as Array<{ produto_id: string; quantidade_planejada: number; data_prevista?: string; prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente' }>,
  });

  // Estado para adicionar novo item
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade_planejada: '',
    data_prevista: '',
    prioridade: 'normal' as 'baixa' | 'normal' | 'alta' | 'urgente',
  });

  const createPlanejamento = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return await metalurgicaService.createPlanejamento(selectedCompany.id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'planejamentos'] });
      toast.success('Planejamento criado com sucesso!');
      setIsModalOpen(false);
    },
  });

  const handleAdicionarItem = () => {
    if (!novoItem.produto_id) {
      toast.error('Selecione um produto');
      return;
    }
    if (!novoItem.quantidade_planejada || parseFloat(novoItem.quantidade_planejada) <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    setFormData({
      ...formData,
      itens: [
        ...formData.itens,
        {
          produto_id: novoItem.produto_id,
          quantidade_planejada: parseFloat(novoItem.quantidade_planejada),
          data_prevista: novoItem.data_prevista || undefined,
          prioridade: novoItem.prioridade,
        },
      ],
    });

    // Reset form
    setNovoItem({
      produto_id: '',
      quantidade_planejada: '',
      data_prevista: '',
      prioridade: 'normal',
    });
  };

  const handleRemoverItem = (index: number) => {
    setFormData({
      ...formData,
      itens: formData.itens.filter((_, i) => i !== index),
    });
  };

  const handleCreate = async () => {
    if (!formData.periodo_inicio || !formData.periodo_fim) {
      toast.error('Preencha o período');
      return;
    }

    try {
      await createPlanejamento.mutateAsync({
        periodo_inicio: formData.periodo_inicio,
        periodo_fim: formData.periodo_fim,
        observacoes: formData.observacoes,
        itens: formData.itens,
      });
      // Reset form
      setFormData({
        periodo_inicio: '',
        periodo_fim: '',
        observacoes: '',
        itens: [],
      });
    } catch (error) {
      toast.error('Erro ao criar planejamento');
    }
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <BarChart3 className="inline-block mr-3 h-8 w-8" />
              PCP - Planejamento e Controle de Produção
            </h1>
            <p className="text-gray-600">
              Planejar e controlar a produção por período
            </p>
          </div>
          
          <PermissionButton
            page="/metalurgica/planejamento*"
            action="create"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Planejamento
          </PermissionButton>
        </div>

        {/* Lista de Planejamentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : planejamentos.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500">Nenhum planejamento encontrado</p>
              </CardContent>
            </Card>
          ) : (
            planejamentos.map((planejamento) => (
              <Card key={planejamento.id} className="cursor-pointer hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Planejamento</span>
                    <Badge>{planejamento.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">Período: </span>
                      <span className="font-medium">
                        {format(new Date(planejamento.periodo_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(planejamento.periodo_fim), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPlanejamento(planejamento.id);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Criação */}
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            // Reset form quando fechar
            setFormData({
              periodo_inicio: '',
              periodo_fim: '',
              observacoes: '',
              itens: [],
            });
            setNovoItem({
              produto_id: '',
              quantidade_planejada: '',
              data_prevista: '',
              prioridade: 'normal',
            });
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Planejamento de Produção</DialogTitle>
              <DialogDescription>
                Defina o período e os produtos a serem produzidos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formData.periodo_inicio}
                    onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={formData.periodo_fim}
                    onChange={(e) => setFormData({ ...formData, periodo_fim: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Input
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre o planejamento"
                />
              </div>

              {/* Seção de Itens */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Itens do Planejamento</Label>
                </div>

                {/* Formulário para adicionar item */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Produto *</Label>
                        <Select
                          value={novoItem.produto_id}
                          onValueChange={(value) => setNovoItem({ ...novoItem, produto_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.filter(p => p.ativo !== false).map((produto) => (
                              <SelectItem key={produto.id} value={produto.id}>
                                {produto.codigo} - {produto.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantidade Planejada *</Label>
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={novoItem.quantidade_planejada}
                          onChange={(e) => setNovoItem({ ...novoItem, quantidade_planejada: e.target.value })}
                          placeholder="0.000"
                        />
                      </div>
                      <div>
                        <Label>Data Prevista</Label>
                        <Input
                          type="date"
                          value={novoItem.data_prevista}
                          onChange={(e) => setNovoItem({ ...novoItem, data_prevista: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Prioridade</Label>
                        <Select
                          value={novoItem.prioridade}
                          onValueChange={(value: 'baixa' | 'normal' | 'alta' | 'urgente') => 
                            setNovoItem({ ...novoItem, prioridade: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={handleAdicionarItem}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de itens adicionados */}
                {formData.itens.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Itens Adicionados ({formData.itens.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Quantidade</TableHead>
                              <TableHead>Data Prevista</TableHead>
                              <TableHead>Prioridade</TableHead>
                              <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.itens.map((item, index) => {
                              const produto = produtos.find(p => p.id === item.produto_id);
                              return (
                                <TableRow key={index}>
                                  <TableCell>
                                    {produto ? (
                                      <div>
                                        <p className="font-medium">{produto.nome}</p>
                                        <p className="text-sm text-gray-500">{produto.codigo}</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">Produto não encontrado</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{item.quantidade_planejada}</TableCell>
                                  <TableCell>
                                    {item.data_prevista
                                      ? format(new Date(item.data_prevista), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.prioridade || 'normal'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoverItem(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createPlanejamento.isPending}>
                  {createPlanejamento.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Criar Planejamento'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalhes */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) {
            setSelectedPlanejamento(null);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Planejamento</DialogTitle>
              <DialogDescription>
                Informações completas do planejamento de produção
              </DialogDescription>
            </DialogHeader>
            {isLoadingDetalhes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : planejamentoDetalhes ? (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Período Início</Label>
                        <p className="font-medium">
                          {format(new Date(planejamentoDetalhes.planejamento.periodo_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Período Fim</Label>
                        <p className="font-medium">
                          {format(new Date(planejamentoDetalhes.planejamento.periodo_fim), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Status</Label>
                        <div>
                          <Badge>{planejamentoDetalhes.planejamento.status}</Badge>
                        </div>
                      </div>
                      {planejamentoDetalhes.planejamento.observacoes && (
                        <div className="col-span-full">
                          <Label className="text-sm text-gray-600">Observações</Label>
                          <p className="font-medium">{planejamentoDetalhes.planejamento.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Itens do Planejamento */}
                <Card>
                  <CardHeader>
                    <CardTitle>Itens do Planejamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {planejamentoDetalhes.itens.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Nenhum item cadastrado neste planejamento</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Quantidade Planejada</TableHead>
                              <TableHead>Quantidade Realizada</TableHead>
                              <TableHead>Data Prevista</TableHead>
                              <TableHead>Prioridade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {planejamentoDetalhes.itens.map((item) => {
                              const produto = produtos.find(p => p.id === item.produto_id);
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    {produto ? (
                                      <div>
                                        <p className="font-medium">{produto.nome}</p>
                                        <p className="text-sm text-gray-500">{produto.codigo}</p>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">Produto não encontrado</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{item.quantidade_planejada}</TableCell>
                                  <TableCell>{item.quantidade_realizada}</TableCell>
                                  <TableCell>
                                    {item.data_prevista
                                      ? format(new Date(item.data_prevista), 'dd/MM/yyyy', { locale: ptBR })
                                      : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.prioridade}</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Não foi possível carregar os detalhes do planejamento</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RequireModule>
  );
};

export default PCPPage;

