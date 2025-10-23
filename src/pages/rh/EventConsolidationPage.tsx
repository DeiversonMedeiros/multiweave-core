import React, { useState } from 'react';
import { DataTable } from '@/components/rh/DataTable';
import { DynamicFormModal } from '@/components/rh/DynamicFormModal';
import { EventConsolidationDashboard } from '@/components/rh/payroll/EventConsolidationDashboard';
import { useEventConsolidations, useCreateEventConsolidation, useUpdateEventConsolidation, useDeleteEventConsolidation } from '@/hooks/rh/useEventConsolidation';
import { useConsolidateEvents, useBatchApproveEvents, useBatchRejectEvents } from '@/hooks/rh/useEventApproval';
import { EventConsolidation } from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/lib/company-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

/*interface EventConsolidation {
  id: string;
  periodo: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  total_eventos: number;
  eventos_processados: number;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}*/

const EventConsolidationPage: React.FC = () => {
  const { selectedCompany } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventConsolidation | null>(null);
  const [formData, setFormData] = useState<Partial<EventConsolidation>>({});
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data = [], isLoading } = useEventConsolidations();
  const createMutation = useCreateEventConsolidation();
  const updateMutation = useUpdateEventConsolidation();
  const deleteMutation = useDeleteEventConsolidation();
  
  // Hooks para aprovação
  const consolidateEvents = useConsolidateEvents();
  const approveEvents = useBatchApproveEvents();
  const rejectEvents = useBatchRejectEvents();

  const columns = [
    {
      key: 'periodo',
      label: 'Período',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusConfig = {
          pendente: { variant: 'outline' as const, label: 'Pendente' },
          processando: { variant: 'secondary' as const, label: 'Processando' },
          concluido: { variant: 'default' as const, label: 'Concluído' },
          erro: { variant: 'destructive' as const, label: 'Erro' },
        };
        const config = statusConfig[value as keyof typeof statusConfig] || {
          variant: 'outline' as const,
          label: value,
        };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'total_eventos',
      label: 'Total Eventos',
      sortable: true,
    },
    {
      key: 'eventos_processados',
      label: 'Processados',
      sortable: true,
    },
    {
      key: 'progress',
      label: 'Progresso',
      render: (value: any, row: EventConsolidation) => {
        const progress = row.total_eventos > 0 
          ? Math.round((row.eventos_processados / row.total_eventos) * 100)
          : 0;
        return `${progress}%`;
      },
    },
    {
      key: 'data_inicio',
      label: 'Início',
      render: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'data_fim',
      label: 'Fim',
      render: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    },
  ];

  const formFields = [
    {
      name: 'periodo',
      label: 'Período',
      type: 'text' as const,
      placeholder: 'Ex: 2024/01',
      required: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'pendente', label: 'Pendente' },
        { value: 'processando', label: 'Processando' },
        { value: 'concluido', label: 'Concluído' },
        { value: 'erro', label: 'Erro' },
      ],
    },
    {
      name: 'total_eventos',
      label: 'Total de Eventos',
      type: 'number' as const,
      placeholder: '0',
      min: 0,
    },
    {
      name: 'eventos_processados',
      label: 'Eventos Processados',
      type: 'number' as const,
      placeholder: '0',
      min: 0,
    },
    {
      name: 'data_inicio',
      label: 'Data de Início',
      type: 'datetime' as const,
    },
    {
      name: 'data_fim',
      label: 'Data de Fim',
      type: 'datetime' as const,
    },
    {
      name: 'observacoes',
      label: 'Observações',
      type: 'textarea' as const,
      placeholder: 'Observações sobre a consolidação',
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      periodo: '',
      status: 'pendente',
      total_eventos: 0,
      eventos_processados: 0,
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: EventConsolidation) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: EventConsolidation) => {
    if (window.confirm('Tem certeza que deseja excluir esta consolidação de eventos?')) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast({
          title: 'Sucesso',
          description: 'Consolidação de eventos excluída com sucesso.',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir consolidação de eventos.',
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
          description: 'Consolidação de eventos atualizada com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Consolidação de eventos criada com sucesso.',
        });
      }
      setIsModalOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar consolidação de eventos.',
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

  const handleStartConsolidation = async (item: EventConsolidation) => {
    try {
      await update(item.id, { 
        status: 'processando',
        data_inicio: new Date().toISOString(),
      });
      toast({
        title: 'Sucesso',
        description: 'Consolidação iniciada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar consolidação.',
        variant: 'destructive',
      });
    }
  };

  // Handlers para o dashboard
  const handleConsolidate = async (eventIds: string[]) => {
    await consolidateEvents.mutateAsync(eventIds);
  };

  const handleApprove = async (eventIds: string[]) => {
    await approveEvents.mutateAsync({ 
      eventIds, 
      approvedBy: 'current-user' // TODO: Pegar do contexto de usuário
    });
  };

  const handleReject = async (eventIds: string[], reason: string) => {
    await rejectEvents.mutateAsync({ 
      eventIds, 
      rejectedBy: 'current-user', // TODO: Pegar do contexto de usuário
      reason 
    });
  };

  return (
    <RequireEntity entityName="event_consolidation" action="read">
      <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard Avançado</TabsTrigger>
          <TabsTrigger value="management">Gerenciamento</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          {selectedCompany?.id && (
            <EventConsolidationDashboard
              companyId={selectedCompany.id}
              onConsolidate={handleConsolidate}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </TabsContent>
        
        <TabsContent value="management">
          <DataTable
            data={data}
            columns={columns}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={isLoading}
            title="Consolidação de Eventos"
            description="Gerencie a consolidação de eventos da folha de pagamento"
          />

          <DynamicFormModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            title={editingItem ? 'Editar Consolidação de Eventos' : 'Nova Consolidação de Eventos'}
            description={editingItem ? 'Atualize as informações da consolidação' : 'Crie uma nova consolidação de eventos'}
            fields={formFields}
            data={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
    </RequireEntity>
  );
};

export default EventConsolidationPage;