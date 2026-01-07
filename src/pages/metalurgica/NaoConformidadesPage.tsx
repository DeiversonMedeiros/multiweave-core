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
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Package
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
import { Textarea } from '@/components/ui/textarea';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { toast } from 'sonner';
import { useLotes } from '@/hooks/metalurgica/useLotes';
import { useProdutos } from '@/hooks/metalurgica/useProdutos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NaoConformidade, TipoNaoConformidade, StatusNaoConformidade } from '@/types/metalurgica';

const NaoConformidadesPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNC, setEditingNC] = useState<string | null>(null);

  // Dados
  const { data: ncData, isLoading } = useQuery({
    queryKey: ['metalurgica', 'nao_conformidades', selectedCompany?.id, filterTipo, filterStatus],
    queryFn: () => metalurgicaService.listNaoConformidades(selectedCompany?.id || '', {
      search: searchTerm || undefined,
      tipo: filterTipo !== 'todos' ? filterTipo : undefined,
      status: filterStatus !== 'todos' ? filterStatus : undefined,
    }),
    enabled: !!selectedCompany?.id,
  });

  const { data: lotesData } = useLotes();
  const { data: produtosData } = useProdutos();

  const naoConformidades = ncData?.data || [];
  const lotes = lotesData?.data || [];
  const produtos = produtosData?.data || [];

  // Formulário
  const [formData, setFormData] = useState<Partial<NaoConformidade>>({
    tipo: 'produto_final',
    status: 'identificada',
    descricao_problema: '',
    quantidade_afetada: undefined,
  });

  const createNC = useMutation({
    mutationFn: async (data: Partial<NaoConformidade>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return await metalurgicaService.createNaoConformidade(selectedCompany.id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'nao_conformidades'] });
      toast.success('Não conformidade registrada com sucesso!');
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateNC = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NaoConformidade> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      // TODO: Implementar update no service
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'nao_conformidades'] });
      toast.success('Não conformidade atualizada com sucesso!');
      setIsModalOpen(false);
      setEditingNC(null);
      resetForm();
    },
  });

  const handleCreate = async () => {
    if (!formData.descricao_problema) {
      toast.error('Preencha a descrição do problema');
      return;
    }

    try {
      await createNC.mutateAsync(formData);
    } catch (error) {
      toast.error('Erro ao registrar não conformidade');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'produto_final',
      status: 'identificada',
      descricao_problema: '',
      quantidade_afetada: undefined,
      lote_id: undefined,
      material_id: undefined,
    });
  };

  const getTipoBadge = (tipo: TipoNaoConformidade) => {
    const tipos: Record<TipoNaoConformidade, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      materia_prima: { label: 'Matéria Prima', variant: 'outline' },
      semiacabado: { label: 'Semiacabado', variant: 'secondary' },
      produto_final: { label: 'Produto Final', variant: 'default' },
      galvanizado: { label: 'Galvanizado', variant: 'destructive' },
    };
    const config = tipos[tipo];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: StatusNaoConformidade) => {
    const statusConfig: Record<StatusNaoConformidade, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      identificada: { label: 'Identificada', variant: 'outline' },
      em_analise: { label: 'Em Análise', variant: 'secondary' },
      em_quarentena: { label: 'Em Quarentena', variant: 'secondary' },
      retrabalho: { label: 'Retrabalho', variant: 'default' },
      sucata: { label: 'Sucata', variant: 'destructive' },
      concessao_cliente: { label: 'Concessão Cliente', variant: 'default' },
      resolvida: { label: 'Resolvida', variant: 'default' },
    };
    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <AlertTriangle className="inline-block mr-3 h-8 w-8" />
              Não Conformidades
            </h1>
            <p className="text-gray-600">
              Gestão de não conformidades e ações corretivas
            </p>
          </div>
          
          <PermissionButton
            entity="nao_conformidades"
            action="create"
            onClick={() => {
              resetForm();
              setEditingNC(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Não Conformidade
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Buscar por número NC, descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                    <SelectItem value="semiacabado">Semiacabado</SelectItem>
                    <SelectItem value="produto_final">Produto Final</SelectItem>
                    <SelectItem value="galvanizado">Galvanizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="identificada">Identificada</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="em_quarentena">Em Quarentena</SelectItem>
                    <SelectItem value="retrabalho">Retrabalho</SelectItem>
                    <SelectItem value="resolvida">Resolvida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Não Conformidades</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : naoConformidades.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma não conformidade encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número NC</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Identificação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {naoConformidades.map((nc) => (
                    <TableRow key={nc.id}>
                      <TableCell className="font-medium">{nc.numero_nc}</TableCell>
                      <TableCell>{getTipoBadge(nc.tipo)}</TableCell>
                      <TableCell className="max-w-md truncate">{nc.descricao_problema}</TableCell>
                      <TableCell>{nc.quantidade_afetada || '-'}</TableCell>
                      <TableCell>{getStatusBadge(nc.status)}</TableCell>
                      <TableCell>
                        {format(new Date(nc.data_identificacao), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <PermissionButton
                            entity="nao_conformidades"
                            action="read"
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            entity="nao_conformidades"
                            action="edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNC(nc.id);
                              setFormData({
                                tipo: nc.tipo,
                                status: nc.status,
                                descricao_problema: nc.descricao_problema,
                                quantidade_afetada: nc.quantidade_afetada,
                                lote_id: nc.lote_id,
                                material_id: nc.material_id,
                                area_quarentena: nc.area_quarentena,
                                acao_corretiva: nc.acao_corretiva,
                              });
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Criação/Edição */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNC ? 'Editar Não Conformidade' : 'Nova Não Conformidade'}
              </DialogTitle>
              <DialogDescription>
                Registre uma nova não conformidade
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: TipoNaoConformidade) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                      <SelectItem value="semiacabado">Semiacabado</SelectItem>
                      <SelectItem value="produto_final">Produto Final</SelectItem>
                      <SelectItem value="galvanizado">Galvanizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: StatusNaoConformidade) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identificada">Identificada</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="em_quarentena">Em Quarentena</SelectItem>
                      <SelectItem value="retrabalho">Retrabalho</SelectItem>
                      <SelectItem value="sucata">Sucata</SelectItem>
                      <SelectItem value="concessao_cliente">Concessão Cliente</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Lote (Opcional)</Label>
                <Select
                  value={formData.lote_id || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, lote_id: value === '__none__' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {lotes.filter(lote => lote.id).map((lote) => (
                      <SelectItem key={lote.id} value={lote.id}>
                        {lote.numero_lote}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Descrição do Problema *</Label>
                <Textarea
                  value={formData.descricao_problema || ''}
                  onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value })}
                  placeholder="Descreva o problema identificado"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade Afetada</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantidade_afetada || ''}
                    onChange={(e) => setFormData({ ...formData, quantidade_afetada: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label>Área de Quarentena</Label>
                  <Input
                    value={formData.area_quarentena || ''}
                    onChange={(e) => setFormData({ ...formData, area_quarentena: e.target.value || undefined })}
                    placeholder="Localização da quarentena"
                  />
                </div>
              </div>

              <div>
                <Label>Ação Corretiva</Label>
                <Textarea
                  value={formData.acao_corretiva || ''}
                  onChange={(e) => setFormData({ ...formData, acao_corretiva: e.target.value || undefined })}
                  placeholder="Descreva a ação corretiva tomada"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={editingNC ? () => updateNC.mutate({ id: editingNC, data: formData }) : handleCreate}
                  disabled={createNC.isPending || updateNC.isPending}
                >
                  {(createNC.isPending || updateNC.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingNC ? 'Atualizar' : 'Salvar'
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

export default NaoConformidadesPage;

