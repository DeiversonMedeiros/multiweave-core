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
  Package,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
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
import { Label } from '@/components/ui/label';
import { useLotes, useCreateLote, useUpdateLote } from '@/hooks/metalurgica/useLotes';
import { useProdutos } from '@/hooks/metalurgica/useProdutos';
import { useOrdensProducao } from '@/hooks/metalurgica/useOrdensProducao';
import { useOrdensServico } from '@/hooks/metalurgica/useOrdensServico';
import { useMaquinas } from '@/hooks/metalurgica/useMaquinas';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import type { LoteInput } from '@/types/metalurgica';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LotesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingLote, setViewingLote] = useState<string | null>(null);

  // Dados
  const { data: lotesData, isLoading } = useLotes({
    search: searchTerm || undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
  });
  const { data: produtosData } = useProdutos();
  const { data: opsData } = useOrdensProducao();
  const { data: osData } = useOrdensServico();
  const { data: maquinasData } = useMaquinas();

  const lotes = lotesData?.data || [];
  const produtos = produtosData?.data || [];
  const ops = opsData?.data || [];
  const os = osData?.data || [];
  const maquinas = maquinasData?.data || [];

  // Formulário
  const [formData, setFormData] = useState<LoteInput>({
    produto_id: '',
    quantidade_produzida: 0,
    data_producao: format(new Date(), 'yyyy-MM-dd'),
  });

  const createLote = useCreateLote();
  const updateLote = useUpdateLote();

  const handleCreate = async () => {
    if (!formData.produto_id || formData.quantidade_produzida <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createLote.mutateAsync(formData);
      toast.success('Lote criado com sucesso!');
      setIsModalOpen(false);
      setFormData({
        produto_id: '',
        quantidade_produzida: 0,
        data_producao: format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (error) {
      toast.error('Erro ao criar lote');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      em_producao: { label: 'Em Produção', variant: 'default' },
      aguardando_inspecao: { label: 'Aguardando Inspeção', variant: 'secondary' },
      aprovado: { label: 'Aprovado', variant: 'default' },
      reprovado: { label: 'Reprovado', variant: 'destructive' },
      retrabalho: { label: 'Retrabalho', variant: 'secondary' },
      sucata: { label: 'Sucata', variant: 'destructive' },
      concluido: { label: 'Concluído', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Package className="inline-block mr-3 h-8 w-8" />
              Lotes de Produção
            </h1>
            <p className="text-gray-600">
              Gerenciar lotes de produção e controle de qualidade
            </p>
          </div>
          
          <PermissionButton
            entity="lotes"
            action="create"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Lote
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Buscar por número lote, produto..."
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
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="aguardando_inspecao">Aguardando Inspeção</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Lotes de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : lotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum lote encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número Lote</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>OP/OS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Produção</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => {
                    const produto = produtos.find(p => p.id === lote.produto_id);
                    const op = lote.op_id ? ops.find(op => op.id === lote.op_id) : null;
                    const osItem = lote.os_id ? os.find(os => os.id === lote.os_id) : null;
                    return (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                        <TableCell>{produto?.descricao || 'N/A'}</TableCell>
                        <TableCell>{lote.quantidade_produzida}</TableCell>
                        <TableCell>{lote.peso_total_kg?.toFixed(2) || '-'}</TableCell>
                        <TableCell>
                          {op ? op.numero_op : osItem ? osItem.numero_os : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                        <TableCell>
                          {format(new Date(lote.data_producao), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <PermissionButton
                              entity="lotes"
                              action="read"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingLote(lote.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </PermissionButton>
                            {lote.status === 'aguardando_inspecao' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Abrir modal de inspeção
                                  toast.info('Funcionalidade de inspeção em desenvolvimento');
                                }}
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

        {/* Modal de Criação */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Lote de Produção</DialogTitle>
              <DialogDescription>
                Registre um novo lote de produção
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Produto *</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade Produzida *</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.quantidade_produzida}
                    onChange={(e) => setFormData({ ...formData, quantidade_produzida: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Peso Total (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.peso_total_kg || ''}
                    onChange={(e) => setFormData({ ...formData, peso_total_kg: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Produção *</Label>
                  <Input
                    type="date"
                    value={formData.data_producao}
                    onChange={(e) => setFormData({ ...formData, data_producao: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Máquina</Label>
                  <Select
                    value={formData.maquina_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, maquina_id: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinas.map((maq) => (
                        <SelectItem key={maq.id} value={maq.id}>
                          {maq.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>OP Vinculada</Label>
                  <Select
                    value={formData.op_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, op_id: value || undefined })}
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
                <div>
                  <Label>OS Vinculada</Label>
                  <Select
                    value={formData.os_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, os_id: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {os.filter(osItem => osItem.status !== 'cancelada').map((osItem) => (
                        <SelectItem key={osItem.id} value={osItem.id}>
                          {osItem.numero_os}
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
                <Button onClick={handleCreate} disabled={createLote.isPending}>
                  {createLote.isPending ? (
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

export default LotesPage;

