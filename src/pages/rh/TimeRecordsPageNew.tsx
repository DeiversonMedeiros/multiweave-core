import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { TimeRecordForm } from '@/components/rh/TimeRecordForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { TimeRecord } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function TimeRecordsPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks usando nova abordagem genérica
  const { data: records, isLoading, error } = useRHData<TimeRecord>('time_records', selectedCompany?.id || '');
  const createRecord = useCreateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const updateRecord = useUpdateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const deleteRecord = useDeleteEntity('rh', 'time_records', selectedCompany?.id || '');

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleCreate = () => {
    setSelectedRecord(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (record: TimeRecord) => {
    setSelectedRecord(record);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (record: TimeRecord) => {
    setSelectedRecord(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (record: TimeRecord) => {
    if (window.confirm(`Tem certeza que deseja excluir este registro de ponto?`)) {
      try {
        await deleteRecord.mutateAsync(record.id);
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
      }
    }
  };

  const handleModalSubmit = async (data: Partial<TimeRecord>) => {
    try {
      if (modalMode === 'create') {
        await createRecord.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedRecord) {
        await updateRecord.mutateAsync({
          id: selectedRecord.id,
          updatedEntity: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando registros de ponto para CSV...');
  };

  const handleClockIn = () => {
    // TODO: Implementar registro de entrada
    console.log('Registrando entrada...');
  };

  const handleClockOut = () => {
    // TODO: Implementar registro de saída
    console.log('Registrando saída...');
  };

  // Colunas da tabela - formato simplificado para dados diretos
  const columns = [
    {
      key: 'data_registro',
      header: 'Data',
      render: (record: TimeRecord) => (
        <div className="font-medium">
          {record.data_registro ? new Date(record.data_registro).toLocaleDateString('pt-BR') : '-'}
        </div>
      )
    },
    {
      key: 'entrada',
      header: 'Entrada',
      render: (record: TimeRecord) => (
        <div className="font-mono text-sm">
          {record.entrada || '-'}
        </div>
      )
    },
    {
      key: 'saida',
      header: 'Saída',
      render: (record: TimeRecord) => (
        <div className="font-mono text-sm">
          {record.saida || '-'}
        </div>
      )
    },
    {
      key: 'entrada_almoco',
      header: 'Entrada Almoço',
      render: (record: TimeRecord) => (
        <div className="font-mono text-sm text-muted-foreground">
          {record.entrada_almoco || '-'}
        </div>
      )
    },
    {
      key: 'saida_almoco',
      header: 'Saída Almoço',
      render: (record: TimeRecord) => (
        <div className="font-mono text-sm text-muted-foreground">
          {record.saida_almoco || '-'}
        </div>
      )
    },
    {
      key: 'entrada_extra1',
      header: 'Entrada Extra',
      render: (record: TimeRecord) => (
        <div className="font-mono text-sm text-purple-600">
          {record.entrada_extra1 || '-'}
        </div>
      )
    },
    {
      key: 'saida_extra1',
      header: 'Saída Extra',
      render: (record: TimeRecord) => (
        <div className="font-mono text-sm text-purple-600">
          {record.saida_extra1 || '-'}
        </div>
      )
    },
    {
      key: 'horas_trabalhadas',
      header: 'Horas Trabalhadas',
      render: (record: TimeRecord) => (
        <div className="font-medium text-green-600">
          {record.horas_trabalhadas ? `${record.horas_trabalhadas}h` : '-'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (record: TimeRecord) => {
        const statusConfig = {
          pendente: { label: 'Pendente', variant: 'secondary' as const },
          aprovado: { label: 'Aprovado', variant: 'default' as const },
          rejeitado: { label: 'Rejeitado', variant: 'destructive' as const }
        };
        const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pendente;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      }
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (record: TimeRecord) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(record)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(record)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(record),
              variant: 'destructive' as const
            }
          ]}
          item={record}
        />
      )
    }
  ];

  if (error) {
    return (

    <div className="p-6">
        <div className="text-red-500">Erro ao carregar registros de ponto: {error.message}</div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de ponto dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClockIn} className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Entrada
          </Button>
          <Button onClick={handleClockOut} variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Saída
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por funcionário..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={handleExportCsv}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabela */}
      <SimpleDataTable
        data={records || []}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExportCsv}
        searchPlaceholder="Pesquisar registros de ponto..."
        emptyMessage="Nenhum registro de ponto encontrado"
        className="mt-6"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Registro de Ponto' :
          modalMode === 'edit' ? 'Editar Registro de Ponto' :
          'Visualizar Registro de Ponto'
        }
        loading={createRecord.isPending || updateRecord.isPending}
        size="lg"
        submitLabel={modalMode === 'create' ? 'Criar Registro' : 'Salvar Alterações'}
      >
        <TimeRecordForm
          timeRecord={selectedRecord}
          onSubmit={handleModalSubmit}
          mode={modalMode}
        />
      </FormModal>
    </div>
    );
}
