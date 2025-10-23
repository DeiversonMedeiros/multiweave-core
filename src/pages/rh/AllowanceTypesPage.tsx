import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { DynamicFormModal } from '@/components/rh/DynamicFormModal';
import { useAllowanceTypes, useCreateAllowanceType, useUpdateAllowanceType, useDeleteAllowanceType } from '@/hooks/rh/useAllowanceTypes';
import { AllowanceType } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

/*interface AllowanceType {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'fixo' | 'percentual' | 'variavel';
  valor_base?: number;
  percentual?: number;
  incide_ir: boolean;
  incide_inss: boolean;
  incide_fgts: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}*/

const AllowanceTypesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AllowanceType | null>(null);
  const [formData, setFormData] = useState<Partial<AllowanceType>>({});

  const { data = [], isLoading } = useAllowanceTypes();
  const createMutation = useCreateAllowanceType();
  const updateMutation = useUpdateAllowanceType();
  const deleteMutation = useDeleteAllowanceType();

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
          fixo: 'Fixo',
          percentual: 'Percentual',
          variavel: 'Variável',
        };
        return tipoLabels[value as keyof typeof tipoLabels] || value;
      },
    },
    {
      key: 'valor_base',
      label: 'Valor Base',
      render: (value: number) => value ? `R$ ${value.toFixed(2)}` : '-',
    },
    {
      key: 'percentual',
      label: 'Percentual',
      render: (value: number) => value ? `${value}%` : '-',
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
      placeholder: 'Ex: ADI001',
      required: true,
    },
    {
      name: 'nome',
      label: 'Nome',
      type: 'text' as const,
      placeholder: 'Nome do tipo de adicional',
      required: true,
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea' as const,
      placeholder: 'Descrição do tipo de adicional',
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'fixo', label: 'Fixo' },
        { value: 'percentual', label: 'Percentual' },
        { value: 'variavel', label: 'Variável' },
      ],
    },
    {
      name: 'valor_base',
      label: 'Valor Base (R$)',
      type: 'number' as const,
      placeholder: '0.00',
      step: 0.01,
    },
    {
      name: 'percentual',
      label: 'Percentual (%)',
      type: 'number' as const,
      placeholder: '0',
      step: 0.01,
    },
    {
      name: 'incide_ir',
      label: 'Incide IR',
      type: 'switch' as const,
    },
    {
      name: 'incide_inss',
      label: 'Incide INSS',
      type: 'switch' as const,
    },
    {
      name: 'incide_fgts',
      label: 'Incide FGTS',
      type: 'switch' as const,
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
      tipo: 'fixo',
      valor_base: 0,
      percentual: 0,
      incide_ir: false,
      incide_inss: false,
      incide_fgts: false,
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: AllowanceType) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: AllowanceType) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de adicional?')) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast({
          title: 'Sucesso',
          description: 'Tipo de adicional excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir tipo de adicional.',
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
          description: 'Tipo de adicional atualizado com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Tipo de adicional criado com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar tipo de adicional.',
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
    <RequireEntity entityName="allowance_types" action="read">
      <div className="container mx-auto p-6">
      <DataTable
        data={data}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        title="Tipos de Adicionais"
        description="Gerencie os tipos de adicionais da folha de pagamento"
      />

      <DynamicFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? 'Editar Tipo de Adicional' : 'Novo Tipo de Adicional'}
        description={editingItem ? 'Atualize as informações do tipo de adicional' : 'Adicione um novo tipo de adicional'}
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

export default AllowanceTypesPage;