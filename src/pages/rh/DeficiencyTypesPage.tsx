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
import { useCompany } from '@/lib/company-context';

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

  const { selectedCompany } = useCompany();
  const deficiencyTypesQuery = useDeficiencyTypes();
  const data = deficiencyTypesQuery.data || [];
  const isLoading = deficiencyTypesQuery.isLoading;
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
      key: 'tipo',
      label: 'Tipo',
      render: (value: string) => {
        const tipoLabels = {
          fisica: 'Física',
          visual: 'Visual',
          auditiva: 'Auditiva',
          intelectual: 'Intelectual',
          mental: 'Mental',
          multipla: 'Múltipla',
          outra: 'Outra',
        };
        return tipoLabels[value as keyof typeof tipoLabels] || value;
      },
    },
    {
      key: 'grau',
      label: 'Grau',
      render: (value: string) => {
        const grauLabels: Record<string, string> = {
          leve: 'Leve',
          moderada: 'Moderada',
          severa: 'Severa',
          profunda: 'Profunda',
        };
        return (value && grauLabels[value]) || value || 'Não especificado';
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
      name: 'tipo',
      label: 'Tipo',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'fisica', label: 'Física' },
        { value: 'visual', label: 'Visual' },
        { value: 'auditiva', label: 'Auditiva' },
        { value: 'intelectual', label: 'Intelectual' },
        { value: 'mental', label: 'Mental' },
        { value: 'multipla', label: 'Múltipla' },
        { value: 'outra', label: 'Outra' },
      ],
    },
    {
      name: 'grau',
      label: 'Grau',
      type: 'select' as const,
      required: false,
      options: [
        { value: '', label: 'Não especificado' },
        { value: 'leve', label: 'Leve' },
        { value: 'moderada', label: 'Moderada' },
        { value: 'severa', label: 'Severa' },
        { value: 'profunda', label: 'Profunda' },
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
      tipo: 'fisica',
      grau: undefined,
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