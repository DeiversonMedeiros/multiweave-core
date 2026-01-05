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
  Settings,
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
import { useMaquinas, useCreateMaquina, useUpdateMaquina } from '@/hooks/metalurgica/useMaquinas';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import type { Maquina } from '@/types/metalurgica';

const MaquinasPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<string | null>(null);

  // Dados
  const { data: maquinasData, isLoading } = useMaquinas({
    search: searchTerm || undefined,
  });

  const maquinas = maquinasData?.data || [];

  // Formulário
  const [formData, setFormData] = useState<Partial<Maquina>>({
    codigo: '',
    nome: '',
    descricao: '',
    tipo: '',
    capacidade_producao_hora: undefined,
    ativo: true,
  });

  const createMaquina = useCreateMaquina();
  const updateMaquina = useUpdateMaquina();

  const handleCreate = async () => {
    if (!formData.codigo || !formData.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createMaquina.mutateAsync(formData);
      toast.success('Máquina criada com sucesso!');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao criar máquina');
      console.error(error);
    }
  };

  const handleUpdate = async () => {
    if (!editingMaquina) return;
    if (!formData.codigo || !formData.nome) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await updateMaquina.mutateAsync({ id: editingMaquina, data: formData });
      toast.success('Máquina atualizada com sucesso!');
      setIsModalOpen(false);
      setEditingMaquina(null);
      resetForm();
    } catch (error) {
      toast.error('Erro ao atualizar máquina');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      tipo: '',
      capacidade_producao_hora: undefined,
      ativo: true,
    });
  };

  const handleEdit = (maquina: Maquina) => {
    setEditingMaquina(maquina.id);
    setFormData({
      codigo: maquina.codigo,
      nome: maquina.nome,
      descricao: maquina.descricao || '',
      tipo: maquina.tipo || '',
      capacidade_producao_hora: maquina.capacidade_producao_hora || undefined,
      ativo: maquina.ativo,
    });
    setIsModalOpen(true);
  };

  return (
    <RequireModule moduleName="metalurgica" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Settings className="inline-block mr-3 h-8 w-8" />
              Máquinas e Equipamentos
            </h1>
            <p className="text-gray-600">
              Cadastro de máquinas e equipamentos de produção
            </p>
          </div>
          
          <PermissionButton
            entity="maquinas"
            action="create"
            onClick={() => {
              resetForm();
              setEditingMaquina(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Máquina
          </PermissionButton>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div>
              <Input
                placeholder="Buscar por código, nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Máquinas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando...</span>
              </div>
            ) : maquinas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma máquina encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Capacidade (un/h)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maquinas.map((maquina) => (
                    <TableRow key={maquina.id}>
                      <TableCell className="font-medium">{maquina.codigo}</TableCell>
                      <TableCell>{maquina.nome}</TableCell>
                      <TableCell>{maquina.tipo || '-'}</TableCell>
                      <TableCell>{maquina.capacidade_producao_hora || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={maquina.ativo ? 'default' : 'secondary'}>
                          {maquina.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <PermissionButton
                            entity="maquinas"
                            action="edit"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(maquina)}
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaquina ? 'Editar Máquina' : 'Nova Máquina'}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da máquina
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ex: MAQ-001"
                  />
                </div>
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome da máquina"
                  />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição da máquina"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Input
                    value={formData.tipo || ''}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    placeholder="Ex: Solda, Corte, Dobra"
                  />
                </div>
                <div>
                  <Label>Capacidade de Produção (un/h)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.capacidade_producao_hora || ''}
                    onChange={(e) => setFormData({ ...formData, capacidade_producao_hora: parseFloat(e.target.value) || undefined })}
                  />
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
                <Label htmlFor="ativo">Máquina Ativa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={editingMaquina ? handleUpdate : handleCreate}
                  disabled={createMaquina.isPending || updateMaquina.isPending}
                >
                  {(createMaquina.isPending || updateMaquina.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingMaquina ? 'Atualizar' : 'Salvar'
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

export default MaquinasPage;

