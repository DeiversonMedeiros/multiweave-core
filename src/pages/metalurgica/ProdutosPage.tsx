import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Package,
  Loader2
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
import { useProdutos, useCreateProduto, useUpdateProduto, useDeleteProduto } from '@/hooks/metalurgica/useProdutos';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import type { ProdutoInput, TipoProduto } from '@/types/metalurgica';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';

const ProdutosPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<string | null>(null);

  // Dados
  const { data: produtosData, isLoading } = useProdutos({
    search: searchTerm || undefined,
    tipo: filterTipo !== 'todos' ? filterTipo : undefined,
  });
  const { data: materiaisData } = useMateriaisEquipamentos();

  const produtos = produtosData?.data || [];
  const materiais = materiaisData?.data || [];

  // Formulário
  const [formData, setFormData] = useState<ProdutoInput>({
    codigo: '',
    descricao: '',
    tipo: 'produto_final',
    unidade_medida: 'UN',
    ativo: true,
  });

  const createProduto = useCreateProduto();
  const updateProduto = useUpdateProduto();
  const deleteProduto = useDeleteProduto();

  const handleCreate = async () => {
    if (!formData.codigo || !formData.descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createProduto.mutateAsync(formData);
      toast.success('Produto criado com sucesso!');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar produto');
      console.error(error);
    }
  };

  const handleUpdate = async () => {
    if (!editingProduto) return;
    if (!formData.codigo || !formData.descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await updateProduto.mutateAsync({ id: editingProduto, data: formData });
      toast.success('Produto atualizado com sucesso!');
      setIsModalOpen(false);
      setEditingProduto(null);
      resetForm();
    } catch (error) {
      toast.error('Erro ao atualizar produto');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await deleteProduto.mutateAsync(id);
      toast.success('Produto excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir produto');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      descricao: '',
      tipo: 'produto_final',
      unidade_medida: 'UN',
      ativo: true,
    });
  };

  const handleEdit = (produto: any) => {
    setEditingProduto(produto.id);
    setFormData({
      codigo: produto.codigo,
      descricao: produto.descricao,
      tipo: produto.tipo,
      unidade_medida: produto.unidade_medida,
      peso_unitario_kg: produto.peso_unitario_kg,
      tempo_producao_minutos: produto.tempo_producao_minutos,
      material_equipamento_id: produto.material_equipamento_id,
      ativo: produto.ativo,
      observacoes: produto.observacoes,
    });
    setIsModalOpen(true);
  };

  const getTipoBadge = (tipo: TipoProduto) => {
    const tipos: Record<TipoProduto, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      produto_final: { label: 'Produto Final', variant: 'default' },
      semiacabado: { label: 'Semiacabado', variant: 'secondary' },
      materia_prima: { label: 'Matéria Prima', variant: 'outline' },
      insumo: { label: 'Insumo', variant: 'outline' },
    };
    const config = tipos[tipo];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Package className="inline-block mr-3 h-8 w-8" />
              Produtos
            </h1>
            <p className="text-gray-600">
              Cadastro de produtos, semiacabados, matérias-primas e insumos
            </p>
          </div>
          
          <PermissionButton
            entity="produtos"
            action="create"
            onClick={() => {
              resetForm();
              setEditingProduto(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Buscar por código, descrição..."
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
                    <SelectItem value="produto_final">Produto Final</SelectItem>
                    <SelectItem value="semiacabado">Semiacabado</SelectItem>
                    <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : produtos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Peso Unit. (kg)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.codigo}</TableCell>
                      <TableCell>{produto.descricao}</TableCell>
                      <TableCell>{getTipoBadge(produto.tipo)}</TableCell>
                      <TableCell>{produto.unidade_medida}</TableCell>
                      <TableCell>{produto.peso_unitario_kg?.toFixed(2) || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <PermissionButton
                            entity="produtos"
                            action="edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(produto)}
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            entity="produtos"
                            action="delete"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(produto.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do produto
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ex: PROD-001"
                  />
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: TipoProduto) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produto_final">Produto Final</SelectItem>
                      <SelectItem value="semiacabado">Semiacabado</SelectItem>
                      <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                      <SelectItem value="insumo">Insumo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição *</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do produto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unidade de Medida *</Label>
                  <Select
                    value={formData.unidade_medida}
                    onValueChange={(value) => setFormData({ ...formData, unidade_medida: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN - Unidade</SelectItem>
                      <SelectItem value="KG">KG - Quilograma</SelectItem>
                      <SelectItem value="M">M - Metro</SelectItem>
                      <SelectItem value="M2">M² - Metro Quadrado</SelectItem>
                      <SelectItem value="M3">M³ - Metro Cúbico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Peso Unitário (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.peso_unitario_kg || ''}
                    onChange={(e) => setFormData({ ...formData, peso_unitario_kg: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tempo de Produção (minutos)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.tempo_producao_minutos || ''}
                    onChange={(e) => setFormData({ ...formData, tempo_producao_minutos: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label>Material/Equipamento (Almoxarifado)</Label>
                  <Select
                    value={formData.material_equipamento_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, material_equipamento_id: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {materiais.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id}>
                          {mat.codigo} - {mat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="ativo">Produto Ativo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={editingProduto ? handleUpdate : handleCreate}
                  disabled={createProduto.isPending || updateProduto.isPending}
                >
                  {(createProduto.isPending || updateProduto.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingProduto ? 'Atualizar' : 'Salvar'
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

export default ProdutosPage;

