import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  Factory,
  Loader2,
  XCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOrdensServico, useCreateOrdemServico, useUpdateOrdemServico } from '@/hooks/metalurgica/useOrdensServico';
import { useProdutos } from '@/hooks/metalurgica/useProdutos';
import { useOrdensProducao } from '@/hooks/metalurgica/useOrdensProducao';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import type { OrdemServicoInput } from '@/types/metalurgica';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OrdensServicoPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOS, setEditingOS] = useState<string | null>(null);
  const [viewingOS, setViewingOS] = useState<string | null>(null);

  // Dados
  const { data: osData, isLoading } = useOrdensServico({
    search: searchTerm || undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
  });
  const { data: produtosData } = useProdutos({ tipo: 'semiacabado' });
  const { data: opsData } = useOrdensProducao();
  const { data: costCenters } = useActiveCostCenters();
  const { data: projects } = useActiveProjects();

  const os = osData?.data || [];
  const produtos = produtosData?.data || [];
  const ops = opsData?.data || [];

  // Formulário
  const [formData, setFormData] = useState<OrdemServicoInput>({
    produto_id: '',
    quantidade_solicitada: 0,
    prioridade: 'normal',
    centro_custo_id: '',
  });

  const createOS = useCreateOrdemServico();
  const updateOS = useUpdateOrdemServico();

  const handleCreate = async () => {
    if (!formData.produto_id || formData.quantidade_solicitada <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createOS.mutateAsync(formData);
      toast.success('Ordem de Serviço criada com sucesso!');
      setIsModalOpen(false);
      setFormData({
        produto_id: '',
        quantidade_solicitada: 0,
        prioridade: 'normal',
        centro_custo_id: '',
      });
    } catch (error) {
      toast.error('Erro ao criar Ordem de Serviço');
      console.error(error);
    }
  };

  const handleAprovar = async (osId: string) => {
    try {
      await updateOS.mutateAsync({
        id: osId,
        data: { status: 'aprovada' as any },
      });
      toast.success('OS aprovada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aprovar OS');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'outline' },
      planejada: { label: 'Planejada', variant: 'secondary' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      materiais_reservados: { label: 'Materiais Reservados', variant: 'default' },
      em_producao: { label: 'Em Produção', variant: 'default' },
      pausada: { label: 'Pausada', variant: 'secondary' },
      concluida: { label: 'Concluída', variant: 'default' },
      cancelada: { label: 'Cancelada', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const cores: Record<string, string> = {
      baixa: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      alta: 'bg-orange-100 text-orange-800',
      urgente: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={cores[prioridade] || cores.normal}>
        {prioridade.toUpperCase()}
      </Badge>
    );
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Factory className="inline-block mr-3 h-8 w-8" />
              Ordens de Serviço (OS)
            </h1>
            <p className="text-gray-600">
              Gerenciar ordens de serviço de produtos semiacabados
            </p>
          </div>
          
          <PermissionButton
            entity="ordens_servico"
            action="create"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova OS
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Buscar por número OS, produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="planejada">Planejada</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : os.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma Ordem de Serviço encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número OS</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>OP Vinculada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {os.map((osItem) => {
                    const produto = produtos.find(p => p.id === osItem.produto_id);
                    const opVinculada = ops.find(op => op.id === osItem.op_vinculada_id);
                    return (
                      <TableRow key={osItem.id}>
                        <TableCell className="font-medium">{osItem.numero_os}</TableCell>
                        <TableCell>{produto?.descricao || 'N/A'}</TableCell>
                        <TableCell>
                          {osItem.quantidade_produzida} / {osItem.quantidade_solicitada}
                        </TableCell>
                        <TableCell>
                          {opVinculada ? opVinculada.numero_op : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(osItem.status)}</TableCell>
                        <TableCell>{getPrioridadeBadge(osItem.prioridade)}</TableCell>
                        <TableCell>
                          {osItem.data_prevista_inicio 
                            ? format(new Date(osItem.data_prevista_inicio), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <PermissionButton
                              entity="ordens_servico"
                              action="read"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingOS(osItem.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </PermissionButton>
                            {osItem.status === 'rascunho' && (
                              <PermissionButton
                                entity="ordens_servico"
                                action="edit"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingOS(osItem.id);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </PermissionButton>
                            )}
                            {osItem.status === 'planejada' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAprovar(osItem.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Criação/Edição */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOS ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da Ordem de Serviço
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Produto (Semiacabado) *</label>
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) => setFormData({ ...formData, produto_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.codigo} - {produto.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Quantidade Solicitada *</label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={formData.quantidade_solicitada}
                  onChange={(e) => setFormData({ ...formData, quantidade_solicitada: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value: any) => setFormData({ ...formData, prioridade: value })}
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

                <div>
                  <label className="text-sm font-medium">OP Vinculada (Opcional)</label>
                  <Select
                    value={formData.op_vinculada_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, op_vinculada_id: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {ops.filter(op => op.status !== 'cancelada').map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.numero_op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Centro de Custo</label>
                  <Select
                    value={formData.centro_custo_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, centro_custo_id: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters?.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.codigo} - {cc.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Projeto</label>
                  <Select
                    value={formData.projeto_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, projeto_id: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>
                          {proj.codigo} - {proj.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createOS.isPending}>
                  {createOS.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RequireModule>
  );
};

export default OrdensServicoPage;

