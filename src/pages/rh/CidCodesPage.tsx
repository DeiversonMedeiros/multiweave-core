import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { DynamicFormModal } from '@/components/rh/DynamicFormModal';
import { useCidCodes, useCreateCidCode, useUpdateCidCode, useDeleteCidCode } from '@/hooks/rh/useCidCodes';
import { CidCode } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const CidCodesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CidCode | null>(null);
  const [formData, setFormData] = useState<Partial<CidCode>>({});

  const { data = [], isLoading } = useCidCodes();
  const createMutation = useCreateCidCode();
  const updateMutation = useUpdateCidCode();
  const deleteMutation = useDeleteCidCode();

  const columns = [
    {
      key: 'codigo',
      label: 'Código CID',
      sortable: true,
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      sortable: true,
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (value: boolean) => (value ? 'Ativo' : 'Inativo'),
    },
  ];

  const formFields = [
    {
      name: 'codigo',
      label: 'Código CID',
      type: 'text' as const,
      placeholder: 'Ex: A00',
      required: true,
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea' as const,
      placeholder: 'Descrição da doença',
      required: true,
    },
    {
      name: 'categoria',
      label: 'Categoria',
      type: 'text' as const,
      placeholder: 'Ex: Doenças Infecciosas',
      required: true,
    },
    {
      name: 'ativo',
      label: 'Ativo',
      type: 'switch' as const,
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      codigo: '',
      descricao: '',
      categoria: '',
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: CidCode) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: CidCode) => {
    if (window.confirm('Tem certeza que deseja excluir este código CID?')) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast({
          title: 'Sucesso',
          description: 'Código CID excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir código CID.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: formData });
        toast({
          title: 'Sucesso',
          description: 'Código CID atualizado com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Código CID criado com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar código CID.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setFormData({});
    setEditingItem(null);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <RequireEntity entityName="cid_codes" action="read">
      <div className="container mx-auto p-6">
      <DataTable
        data={data}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        title="Códigos CID"
        description="Gerencie os códigos CID para classificação de doenças"
      />

      <DynamicFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? 'Editar Código CID' : 'Novo Código CID'}
        description={editingItem ? 'Atualize as informações do código CID' : 'Adicione um novo código CID'}
        fields={formFields}
        data={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
    </RequireEntity>
  );
};

export default CidCodesPage;