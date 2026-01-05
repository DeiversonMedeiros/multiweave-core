import React, { useState, useMemo } from 'react';
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
  Package,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOrdensProducao, useCreateOrdemProducao, useUpdateOrdemProducao } from '@/hooks/metalurgica/useOrdensProducao';
import { useProdutos } from '@/hooks/metalurgica/useProdutos';
import { useSolicitacoesMateriais } from '@/hooks/metalurgica/useSolicitacoesMateriais';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import type { OrdemProducaoInput } from '@/types/metalurgica';
import { useActiveCostCenters } from '@/hooks/useCostCenters';
import { useActiveProjects } from '@/hooks/useProjects';
import { usePartners } from '@/hooks/usePartners';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OrdensProducaoPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { canCreateEntity, canEditEntity, canReadEntity } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOP, setEditingOP] = useState<string | null>(null);
  const [viewingOP, setViewingOP] = useState<string | null>(null);

  // Dados
  const { data: opsData, isLoading } = useOrdensProducao({
    search: searchTerm || undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
  });
  const { data: produtosData } = useProdutos({ tipo: 'produto_final' });
  const { data: costCenters } = useActiveCostCenters();
  const { data: projects } = useActiveProjects();
  const { data: partners } = usePartners();

  const ops = opsData?.data || [];
  const produtos = produtosData?.data || [];

  // Formulário
  const [formData, setFormData] = useState<OrdemProducaoInput>({
    produto_id: '',
    quantidade_solicitada: 0,
    prioridade: 'normal',
    centro_custo_id: '',
  });

  const createOP = useCreateOrdemProducao();
  const updateOP = useUpdateOrdemProducao();

  const handleCreate = async () => {
    if (!formData.produto_id || formData.quantidade_solicitada <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createOP.mutateAsync(formData);
      toast.success('Ordem de Produção criada com sucesso!');
      setIsModalOpen(false);
      setFormData({
        produto_id: '',
        quantidade_solicitada: 0,
        prioridade: 'normal',
        centro_custo_id: '',
      });
    } catch (error) {
      toast.error('Erro ao criar Ordem de Produção');
      console.error(error);
    }
  };

  const handleAprovar = async (opId: string) => {
    try {
      await updateOP.mutateAsync({
        id: opId,
        data: { status: 'aprovada' as any },
      });
      toast.success('OP aprovada com sucesso!');
    } catch (error) {
      toast.error('Erro ao aprovar OP');
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
              <Package className="inline-block mr-3 h-8 w-8" />
              Ordens de Produção (OP)
            </h1>
            <p className="text-gray-600">
              Gerenciar ordens de produção de produtos finais
            </p>
          </div>
          
          <PermissionButton
            entity="ordens_producao"
            action="create"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova OP
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Buscar por número OP, produto..."
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
            <CardTitle>Ordens de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : ops.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma Ordem de Produção encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número OP</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ops.map((op) => {
                    const produto = produtos.find(p => p.id === op.produto_id);
                    return (
                      <TableRow key={op.id}>
                        <TableCell className="font-medium">{op.numero_op}</TableCell>
                        <TableCell>{produto?.descricao || 'N/A'}</TableCell>
                        <TableCell>
                          {op.quantidade_produzida} / {op.quantidade_solicitada}
                        </TableCell>
                        <TableCell>{getStatusBadge(op.status)}</TableCell>
                        <TableCell>{getPrioridadeBadge(op.prioridade)}</TableCell>
                        <TableCell>
                          {op.data_prevista_inicio 
                            ? format(new Date(op.data_prevista_inicio), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <PermissionButton
                              entity="ordens_producao"
                              action="read"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingOP(op.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </PermissionButton>
                            {op.status === 'rascunho' && (
                              <PermissionButton
                                entity="ordens_producao"
                                action="edit"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingOP(op.id);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </PermissionButton>
                            )}
                            {op.status === 'planejada' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAprovar(op.id)}
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
                {editingOP ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da Ordem de Produção
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Produto *</label>
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
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createOP.isPending}>
                  {createOP.isPending ? (
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

export default OrdensProducaoPage;

