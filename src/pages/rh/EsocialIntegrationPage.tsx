import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { EsocialIntegrationForm } from '@/components/rh/EsocialIntegrationForm';
import { useEsocialIntegrations, useCreateEsocialIntegration, useUpdateEsocialIntegration, useDeleteEsocialIntegration } from '@/hooks/rh/useEsocialIntegration';
import { EsocialIntegration } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';


const EsocialIntegrationPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EsocialIntegration | null>(null);
  const [formData, setFormData] = useState<Partial<EsocialIntegration>>({});

  const { data = [], isLoading } = useEsocialIntegrations();
  const createMutation = useCreateEsocialIntegration();
  const updateMutation = useUpdateEsocialIntegration();
  const deleteMutation = useDeleteEsocialIntegration();

  const columns = [
    {
      key: 'tipo_evento',
      label: 'Tipo de Evento',
      sortable: true,
    },
    {
      key: 'codigo_evento',
      label: 'Código',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusConfig = {
          pendente: { variant: 'outline' as const, label: 'Pendente' },
          enviado: { variant: 'secondary' as const, label: 'Enviado' },
          processado: { variant: 'default' as const, label: 'Processado' },
          erro: { variant: 'destructive' as const, label: 'Erro' },
          rejeitado: { variant: 'destructive' as const, label: 'Rejeitado' },
        };
        const config = statusConfig[value as keyof typeof statusConfig] || {
          variant: 'outline' as const,
          label: value,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'protocolo',
      label: 'Protocolo',
      render: (value: string) => value || '-',
    },
    {
      key: 'data_envio',
      label: 'Data Envio',
      render: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'data_processamento',
      label: 'Data Processamento',
      render: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
  ];


  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      tipo_evento: '',
      codigo_evento: '',
      descricao: '',
      status: 'pendente',
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: EsocialIntegration) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: EsocialIntegration) => {
    if (window.confirm('Tem certeza que deseja excluir esta integração eSocial?')) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast({
          title: 'Sucesso',
          description: 'Integração eSocial excluída com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir integração eSocial.',
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
          description: 'Integração eSocial atualizada com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Integração eSocial criada com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar integração eSocial.',
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
    <RequireEntity entityName="esocial" action="read">
      <div className="container mx-auto p-6">

      <DataTable
        data={data}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        title="Integração eSocial"
        description="Gerencie as integrações com o eSocial"
      />

      <EsocialIntegrationForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        data={formData}
        onChange={handleChange}
        loading={isLoading}
        editingItem={editingItem}
      />
    </div>
    </RequireEntity>
  );
};

export default EsocialIntegrationPage;