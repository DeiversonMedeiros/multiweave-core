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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/rh/EnhancedDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { TimeClock } from '@/components/rh/TimeClock';
import { useTimeRecords, useDeleteTimeRecord, useApproveTimeRecord, useRejectTimeRecord } from '@/hooks/rh/useTimeRecords';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { TimeRecord, Employee } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function TimeRecordsPage() {
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showTimeClock, setShowTimeClock] = useState(false);

  // Hooks
  const { data: employees = [] } = useEmployees();
  const { data: timeRecords = [], isLoading } = useTimeRecords({
    startDate: dateRange.start,
    endDate: dateRange.end,
    status: statusFilter || undefined,
    employeeId: employeeFilter || undefined,
  });
  const deleteRecordMutation = useDeleteTimeRecord();
  const approveRecordMutation = useApproveTimeRecord();
  const rejectRecordMutation = useRejectTimeRecord();

  // Filtrar dados
  const filteredRecords = timeRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.employee?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleEmployeeFilter = (value: string) => {
    setEmployeeFilter(value);
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
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
    if (confirm(`Tem certeza que deseja excluir o registro de ${record.employee?.nome}?`)) {
      try {
        await deleteRecordMutation.mutateAsync(record.id);
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
      }
    }
  };

  const handleApprove = async (record: TimeRecord) => {
    try {
      await approveRecordMutation.mutateAsync({ id: record.id });
    } catch (error) {
      console.error('Erro ao aprovar registro:', error);
    }
  };

  const handleReject = async (record: TimeRecord) => {
    const reason = prompt('Motivo da rejeição:');
    if (reason) {
      try {
        await rejectRecordMutation.mutateAsync({ id: record.id, observacoes: reason });
      } catch (error) {
        console.error('Erro ao rejeitar registro:', error);
      }
    }
  };

  const handleExport = () => {
    console.log('Exportar registros de ponto');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const handleModalSubmit = (data: any) => {
    console.log('Salvar registro:', data);
    handleModalClose();
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      accessorKey: 'employee',
      header: 'Funcionário',
      cell: ({ row }: { row: { original: TimeRecord } }) => (
        <div>
          <div className="font-medium">{row.original.employee?.nome}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.employee?.matricula || 'Sem matrícula'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'data_registro',
      header: 'Data',
      cell: ({ row }: { row: { original: TimeRecord } }) => (
        <div className="text-sm">
          {new Date(row.original.data_registro).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
    {
      accessorKey: 'horarios',
      header: 'Horários',
      cell: ({ row }: { row: { original: TimeRecord } }) => {
        const { entrada, saida, entrada_almoco, saida_almoco } = row.original;
        return (
          <div className="text-sm space-y-1">
            <div className="flex gap-2">
              <span className="font-mono">{entrada || '--:--'}</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-mono">{saida || '--:--'}</span>
            </div>
            {(entrada_almoco || saida_almoco) && (
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Almoço:</span>
                <span className="font-mono">{entrada_almoco || '--:--'}</span>
                <span>-</span>
                <span className="font-mono">{saida_almoco || '--:--'}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'horas_trabalhadas',
      header: 'Horas',
      cell: ({ row }: { row: { original: TimeRecord } }) => {
        const horas = row.original.horas_trabalhadas;
        const extras = row.original.horas_extras;
        return (
          <div className="text-sm">
            <div className="font-mono">
              {horas ? `${horas.toFixed(1)}h` : '--'}
            </div>
            {extras && extras > 0 && (
              <div className="text-xs text-orange-600">
                +{extras.toFixed(1)}h extras
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: TimeRecord } }) => {
        const status = row.original.status;
        const getStatusIcon = () => {
          switch (status) {
            case 'aprovado':
              return <CheckCircle className="h-4 w-4" />;
            case 'rejeitado':
              return <XCircle className="h-4 w-4" />;
            case 'pendente':
              return <AlertCircle className="h-4 w-4" />;
            default:
              return <Clock className="h-4 w-4" />;
          }
        };

        const getStatusColor = () => {
          switch (status) {
            case 'aprovado':
              return 'default';
            case 'rejeitado':
              return 'destructive';
            case 'pendente':
              return 'outline';
            default:
              return 'secondary';
          }
        };

        return (
          <Badge variant={getStatusColor() as any} className="flex items-center gap-1">
            {getStatusIcon()}
            {status}
          </Badge>
        );
      },
    },
  ];

  // Ações da tabela
  const actions = [
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleView,
      variant: 'default' as const,
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      variant: 'default' as const,
    },
    {
      label: 'Aprovar',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: handleApprove,
      variant: 'default' as const,
      condition: (record: TimeRecord) => record.status === 'pendente',
    },
    {
      label: 'Rejeitar',
      icon: <XCircle className="h-4 w-4" />,
      onClick: handleReject,
      variant: 'destructive' as const,
      condition: (record: TimeRecord) => record.status === 'pendente',
    },
    {
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Confirmar Exclusão',
      confirmationMessage: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de ponto dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowTimeClock(!showTimeClock)}
          >
            <Clock className="h-4 w-4 mr-2" />
            {showTimeClock ? 'Ocultar Relógio' : 'Mostrar Relógio'}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Relógio de Ponto */}
      {showTimeClock && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.slice(0, 6).map((employee) => (
            <TimeClock
              key={employee.id}
              employeeId={employee.id}
              employeeName={employee.nome}
            />
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por funcionário ou observações..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Select
            value={statusFilter}
            onValueChange={handleStatusFilter}
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

          <Select
            value={employeeFilter}
            onValueChange={handleEmployeeFilter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex space-x-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="w-[150px]"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="w-[150px]"
            />
          </div>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <EnhancedDataTable
        data={filteredRecords}
        columns={columns}
        loading={isLoading}
        searchable={false} // Já temos busca customizada
        filterable={false} // Já temos filtros customizados
        pagination={true}
        actions={actions}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Buscar registros..."
        emptyMessage="Nenhum registro de ponto encontrado"
        pageSize={15}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === 'create' ? 'Novo Registro de Ponto' :
          modalMode === 'edit' ? 'Editar Registro de Ponto' :
          'Detalhes do Registro'
        }
        description={
          modalMode === 'create' ? 'Preencha os dados do novo registro' :
          modalMode === 'edit' ? 'Atualize os dados do registro' :
          'Visualize os dados do registro'
        }
        onSubmit={handleModalSubmit}
        loading={false}
        size="lg"
        submitLabel={modalMode === 'view' ? undefined : 'Salvar'}
        cancelLabel="Fechar"
      >
        <div className="space-y-4">
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Funcionário</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.employee?.nome}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Data</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.data_registro && 
                      new Date(selectedRecord.data_registro).toLocaleDateString('pt-BR')
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Entrada</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedRecord?.entrada || '--:--'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Saída</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedRecord?.saida || '--:--'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Horas Trabalhadas</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.horas_trabalhadas ? 
                      `${selectedRecord.horas_trabalhadas.toFixed(1)}h` : '--'
                    }
                  </p>
                </div>
              </div>
              {selectedRecord?.observacoes && (
                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.observacoes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Funcionário *</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium">Entrada</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">Saída</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">Almoço - Entrada</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">Almoço - Saída</label>
                  <Input type="time" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Observações</label>
                <textarea 
                  className="w-full p-2 border rounded-md"
                  placeholder="Observações sobre o registro"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
}
