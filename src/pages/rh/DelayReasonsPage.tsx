import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { DynamicFormModal } from '@/components/rh/DynamicFormModal';
import { useDelayReasons, useCreateDelayReason, useUpdateDelayReason, useDeleteDelayReason } from '@/hooks/rh/useDelayReasons';
import { DelayReason } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/lib/company-context';

const DelayReasonsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DelayReason | null>(null);
  const [formData, setFormData] = useState<Partial<DelayReason>>({});

  const { selectedCompany } = useCompany();
  const delayReasonsQuery = useDelayReasons(selectedCompany?.id);
  const data = delayReasonsQuery.data || [];
  const isLoading = delayReasonsQuery.isLoading;
  const createMutation = useCreateDelayReason();
  const updateMutation = useUpdateDelayReason();
  const deleteMutation = useDeleteDelayReason();

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
          atraso: 'Atraso',
          falta: 'Falta',
          saida_antecipada: 'Saída Antecipada',
          justificado: 'Justificado',
          injustificado: 'Injustificado',
        };
        return tipoLabels[value as keyof typeof tipoLabels] || value;
      },
    },
    {
      key: 'desconta_salario',
      label: 'Desconta Salário',
      render: (value: boolean) => (value ? 'Sim' : 'Não'),
    },
    {
      key: 'desconta_horas',
      label: 'Desconta Horas',
      render: (value: boolean) => (value ? 'Sim' : 'Não'),
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
      placeholder: 'Ex: ATR001',
      required: true,
    },
    {
      name: 'nome',
      label: 'Nome',
      type: 'text' as const,
      placeholder: 'Nome do motivo',
      required: true,
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea' as const,
      placeholder: 'Descrição do motivo',
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'atraso', label: 'Atraso' },
        { value: 'falta', label: 'Falta' },
        { value: 'saida_antecipada', label: 'Saída Antecipada' },
        { value: 'justificado', label: 'Justificado' },
        { value: 'injustificado', label: 'Injustificado' },
      ],
    },
    {
      name: 'desconta_salario',
      label: 'Desconta Salário',
      type: 'switch' as const,
    },
    {
      name: 'desconta_horas',
      label: 'Desconta Horas',
      type: 'switch' as const,
    },
    {
      name: 'requer_justificativa',
      label: 'Requer Justificativa',
      type: 'switch' as const,
    },
    {
      name: 'requer_anexo',
      label: 'Requer Anexo',
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
      tipo: 'atraso',
      desconta_salario: false,
      desconta_horas: false,
      requer_justificativa: false,
      requer_anexo: false,
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: DelayReason) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: DelayReason) => {
    if (window.confirm('Tem certeza que deseja excluir este motivo de atraso?')) {
      try {
        await deleteMutation.mutateAsync({ id: item.id, companyId: selectedCompany?.id || '' });
        toast({
          title: 'Sucesso',
          description: 'Motivo de atraso excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir motivo de atraso.',
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
          description: 'Motivo de atraso atualizado com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Motivo de atraso criado com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar motivo de atraso.',
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
    <RequireEntity entityName="delay_reasons" action="read">
      <div className="container mx-auto p-6">
      <DataTable
        data={data}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        title="Motivos de Atraso"
        description="Gerencie os motivos de atraso e faltas dos funcionários"
      />

      <DynamicFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? 'Editar Motivo de Atraso' : 'Novo Motivo de Atraso'}
        description={editingItem ? 'Atualize as informações do motivo de atraso' : 'Adicione um novo motivo de atraso'}
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

export default DelayReasonsPage;