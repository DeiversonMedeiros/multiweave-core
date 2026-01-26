import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit,
  Eye,
  Truck,
  Loader2,
  CheckCircle,
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
import { Label } from '@/components/ui/label';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { toast } from 'sonner';
import { useLotes } from '@/hooks/metalurgica/useLotes';
import { usePartners } from '@/hooks/usePartners';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GalvanizacaoInput } from '@/types/metalurgica';

const GalvanizacaoPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dados
  const { data: galvanizacoesData, isLoading } = useQuery({
    queryKey: ['metalurgica', 'galvanizacoes', selectedCompany?.id, filterStatus],
    queryFn: () => metalurgicaService.listGalvanizacoes(selectedCompany?.id || '', {
      search: searchTerm || undefined,
      status: filterStatus !== 'todos' ? filterStatus : undefined,
    }),
    enabled: !!selectedCompany?.id,
  });

  const { data: lotesData } = useLotes({ status: 'aprovado' });
  const { data: partners } = usePartners();

  const galvanizacoes = galvanizacoesData?.data || [];
  const lotes = lotesData?.data || [];
  const partnersList = partners?.data || [];
  const fornecedores = partnersList.filter(p => p.tipo === 'fornecedor');

  // Formulário
  const [formData, setFormData] = useState<GalvanizacaoInput>({
    fornecedor_id: '',
    entrega_direta_cliente: false,
    peso_total_kg: undefined,
    itens: [],
  });

  const createGalvanizacao = useMutation({
    mutationFn: async (data: GalvanizacaoInput) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      if (!user?.id) throw new Error('Usuário não autenticado');
      return await metalurgicaService.createGalvanizacao(selectedCompany.id, user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'galvanizacoes'] });
      queryClient.invalidateQueries({ queryKey: ['metalurgica', 'lotes'] });
      toast.success('Galvanização criada com sucesso!');
      setIsModalOpen(false);
      resetForm();
    },
  });

  const handleCreate = async () => {
    if (!formData.fornecedor_id || formData.itens.length === 0) {
      toast.error('Selecione um fornecedor e pelo menos um lote');
      return;
    }

    try {
      await createGalvanizacao.mutateAsync(formData);
    } catch (error) {
      toast.error('Erro ao criar galvanização');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      fornecedor_id: '',
      entrega_direta_cliente: false,
      peso_total_kg: undefined,
      itens: [],
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      itens: [
        ...formData.itens,
        { lote_id: '', quantidade: 0, peso_kg: undefined },
      ],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      itens: formData.itens.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItens = [...formData.itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setFormData({ ...formData, itens: newItens });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pendente: { label: 'Pendente', variant: 'outline' },
      enviado: { label: 'Enviado', variant: 'secondary' },
      em_processo: { label: 'Em Processo', variant: 'default' },
      concluido: { label: 'Concluído', variant: 'default' },
      retornado: { label: 'Retornado', variant: 'default' },
      entregue_direto: { label: 'Entregue Direto', variant: 'default' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
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
              <Truck className="inline-block mr-3 h-8 w-8" />
              Galvanização
            </h1>
            <p className="text-gray-600">
              Gerenciar processos de galvanização externa
            </p>
          </div>
          
          <PermissionButton
            page="/metalurgica/galvanizacao*"
            action="create"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Galvanização
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Buscar por número, fornecedor..."
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
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="em_processo">Em Processo</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="retornado">Retornado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Galvanizações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : galvanizacoes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma galvanização encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entrega Direta</TableHead>
                    <TableHead>Data Envio</TableHead>
                    <TableHead>Data Retorno</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {galvanizacoes.map((galv) => {
                    const fornecedor = fornecedores.find(f => f.id === galv.fornecedor_id);
                    return (
                      <TableRow key={galv.id}>
                        <TableCell className="font-medium">{galv.numero_galvanizacao}</TableCell>
                        <TableCell>{fornecedor?.nome || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(galv.status)}</TableCell>
                        <TableCell>
                          {galv.entrega_direta_cliente ? (
                            <Badge variant="default">Sim</Badge>
                          ) : (
                            <Badge variant="outline">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {galv.data_envio
                            ? format(new Date(galv.data_envio), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {galv.data_retorno
                            ? format(new Date(galv.data_retorno), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>{galv.peso_total_kg?.toFixed(2) || '-'}</TableCell>
                        <TableCell>
                          <PermissionButton
                            page="/metalurgica/galvanizacao*"
                            action="read"
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </PermissionButton>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Galvanização</DialogTitle>
              <DialogDescription>
                Registre uma nova galvanização externa
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Fornecedor *</Label>
                <Select
                  value={formData.fornecedor_id}
                  onValueChange={(value) => setFormData({ ...formData, fornecedor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="entrega_direta"
                  checked={formData.entrega_direta_cliente}
                  onChange={(e) => setFormData({ ...formData, entrega_direta_cliente: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="entrega_direta">Entrega direta ao cliente (sem retorno físico)</Label>
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

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Lotes para Galvanização *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Lote
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.itens.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label>Lote</Label>
                        <Select
                          value={item.lote_id}
                          onValueChange={(value) => updateItem(index, 'lote_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o lote" />
                          </SelectTrigger>
                          <SelectContent>
                            {lotes.map((lote) => (
                              <SelectItem key={lote.id} value={lote.id}>
                                {lote.numero_lote}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-32">
                        <Label>Peso (kg)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.peso_kg || ''}
                          onChange={(e) => updateItem(index, 'peso_kg', parseFloat(e.target.value) || undefined)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {formData.itens.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      <p>Nenhum lote adicionado</p>
                      <p className="text-sm">Clique em "Adicionar Lote" para começar</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createGalvanizacao.isPending}>
                  {createGalvanizacao.isPending ? (
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

export default GalvanizacaoPage;

