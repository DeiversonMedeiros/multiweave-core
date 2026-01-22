import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { DynamicFormModal } from '@/components/rh/DynamicFormModal';
import { useAbsenceTypes, useCreateAbsenceType, useUpdateAbsenceType, useDeleteAbsenceType } from '@/hooks/rh/useAbsenceTypes';
import { AbsenceType } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompany } from '@/lib/company-context';

const AbsenceTypesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AbsenceType | null>(null);
  const [formData, setFormData] = useState<Partial<AbsenceType>>({});

  const { selectedCompany } = useCompany();
  const absenceTypesQuery = useAbsenceTypes();
  const data = absenceTypesQuery.data || [];
  const isLoading = absenceTypesQuery.isLoading;
  const createMutation = useCreateAbsenceType();
  const updateMutation = useUpdateAbsenceType();
  const deleteMutation = useDeleteAbsenceType();

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
          ferias: 'Férias',
          licenca_medica: 'Licença Médica',
          licenca_maternidade: 'Licença Maternidade',
          licenca_paternidade: 'Licença Paternidade',
          licenca_casamento: 'Licença Casamento',
          licenca_luto: 'Licença Luto',
          afastamento_medico: 'Afastamento Médico',
          suspensao: 'Suspensão',
          afastamento_sem_vencimento: 'Afastamento sem Vencimento',
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
      placeholder: 'Ex: AFA001',
      required: true,
    },
    {
      name: 'nome',
      label: 'Nome',
      type: 'text' as const,
      placeholder: 'Nome do tipo de afastamento',
      required: true,
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea' as const,
      placeholder: 'Descrição do tipo de afastamento',
    },
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'ferias', label: 'Férias' },
        { value: 'licenca_medica', label: 'Licença Médica' },
        { value: 'licenca_maternidade', label: 'Licença Maternidade' },
        { value: 'licenca_paternidade', label: 'Licença Paternidade' },
        { value: 'licenca_casamento', label: 'Licença Casamento' },
        { value: 'licenca_luto', label: 'Licença Luto' },
        { value: 'afastamento_medico', label: 'Afastamento Médico' },
        { value: 'suspensao', label: 'Suspensão' },
        { value: 'afastamento_sem_vencimento', label: 'Afastamento sem Vencimento' },
      ],
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
      name: 'desconta_salario',
      label: 'Desconta Salário',
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
      tipo: 'ferias',
      requer_justificativa: false,
      requer_anexo: false,
      desconta_salario: false,
      ativo: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: AbsenceType) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: AbsenceType) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de afastamento?')) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast({
          title: 'Sucesso',
          description: 'Tipo de afastamento excluído com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir tipo de afastamento.',
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
          description: 'Tipo de afastamento atualizado com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Tipo de afastamento criado com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar tipo de afastamento.',
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
    <RequirePage pagePath="/rh/absence-types*" action="read">
      <div className="container mx-auto p-6">
      <DataTable
        data={data}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        title="Tipos de Afastamento"
        description="Gerencie os tipos de afastamento dos funcionários"
      />

      <DynamicFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? 'Editar Tipo de Afastamento' : 'Novo Tipo de Afastamento'}
        description={editingItem ? 'Atualize as informações do tipo de afastamento' : 'Adicione um novo tipo de afastamento'}
        fields={formFields}
        data={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={isLoading}
      />
    </div>
    </RequirePage>
  );
};

export default AbsenceTypesPage;