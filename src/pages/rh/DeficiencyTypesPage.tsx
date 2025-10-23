import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { DynamicFormModal } from '@/components/rh/DynamicFormModal';
import { useDeficiencyTypes, useCreateDeficiencyType, useUpdateDeficiencyType, useDeleteDeficiencyType } from '@/hooks/rh/useDeficiencyTypes';
import { DeficiencyType } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

/*interface DeficiencyType {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  categoria: 'fisica' | 'mental' | 'visual' | 'auditiva' | 'intelectual' | 'multipla';
  grau: 'leve' | 'moderado' | 'severo' | 'profundo';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}*/

const DeficiencyTypesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeficiencyType | null>(null);
  const [formData, setFormData] = useState<Partial<DeficiencyType>>({});

  const { data = [], isLoading } = useDeficiencyTypes();
  const createMutation = useCreateDeficiencyType();
  const updateMutation = useUpdateDeficiencyType();
  const deleteMutation = useDeleteDeficiencyType();

  const columns = [
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      render: (value: string) => {
        const categoriaLabels = {
          fisica: 'Física',
          mental: 'Mental',
          visual: 'Visual',
          auditiva: 'Auditiva',
          intelectual: 'Intelectual',
          multipla: 'Múltipla',
        };
        return categoriaLabels[value as keyof typeof categoriaLabels] || value;
      },
    },
    {
      key: 'grau',
      label: 'Grau',
      render: (value: string) => {
        const grauLabels = {
          leve: 'Leve',
          moderado: 'Moderado',
          severo: 'Severo',
          profundo: 'Profundo',
        };
        return grauLabels[value as keyof typeof grauLabels] || value;
      },
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
      label: 'Código',
      type: 'text' as const,
      placeholder: 'Ex: DEF001',
      required: true,
    },
    {
      name: 'nome',
      label: 'Nome',
      type: 'text' as const,
      placeholder: 'Nome do tipo de deficiência',
      required: true,
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea' as const,
      placeholder: 'Descrição do tipo de deficiência',
    },
    {
      name: 'categoria',
      label: 'Categoria',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'fisica', label: 'Física' },
        { value: 'mental', label: 'Mental' },
        { value: 'visual', label: 'Visual' },
        { value: 'auditiva', label: 'Auditiva' },
        { value: 'intelectual', label: 'Intelectual' },
        { value: 'multipla', label: 'Múltipla' },
      ],
    },
    {
      name: 'grau',
      label: 'Grau',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'leve', label: 'Leve' },
        { value: 'moderado', label: 'Moderado' },
        { value: 'severo', label: 'Severo' },
        { value: 'profundo', label: 'Profundo' },
      ],
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
      nome: '',
      descricao: '',
      categoria: 'fisica',
      grau: 'leve',
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: DeficiencyType) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: DeficiencyType) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de deficiência?')) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast({
          title: 'Sucesso',
          description: 'Tipo de deficiência excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir tipo de deficiência.',
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
          description: 'Tipo de deficiência atualizado com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Tipo de deficiência criado com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar tipo de deficiência.',
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
    <RequireEntity entityName="deficiency_types" action="read">
      <div className="container mx-auto p-6">
      <DataTable
        data={data}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        title="Tipos de Deficiência"
        description="Gerencie os tipos de deficiência para inclusão e acessibilidade"
      />

      <DynamicFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? 'Editar Tipo de Deficiência' : 'Novo Tipo de Deficiência'}
        description={editingItem ? 'Atualize as informações do tipo de deficiência' : 'Adicione um novo tipo de deficiência'}
        fields={formFields}
        data={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={isLoading}
      />
    </div>
    </RequireEntity>
  );
};

export default DeficiencyTypesPage;