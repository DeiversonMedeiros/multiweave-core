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
  Calculator,
  DollarSign,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/rh/EnhancedDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  usePayroll, 
  useDeletePayroll, 
  useProcessAllPayroll,
  usePayrollStats 
} from '@/hooks/rh/usePayroll';
import { Payroll } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function PayrollPage() {
  const { selectedCompany } = useCompany();
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: payrolls = [], isLoading } = usePayroll({
    month: monthFilter,
    year: yearFilter,
    status: statusFilter || undefined,
  });
  const { data: stats } = usePayrollStats(monthFilter, yearFilter);
  const deletePayrollMutation = useDeletePayroll();
  const processAllPayrollMutation = useProcessAllPayroll();

  // Filtrar dados
  const filteredPayrolls = payrolls.filter(payroll => {
    const matchesSearch = !searchTerm || 
      payroll.employee?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleMonthFilter = (value: string) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearFilter = (value: string) => {
    setYearFilter(parseInt(value));
  };

  const handleCreate = () => {
    setSelectedPayroll(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (payroll: Payroll) => {
    if (confirm(`Tem certeza que deseja excluir a folha de ${payroll.employee?.nome}?`)) {
      try {
        await deletePayrollMutation.mutateAsync(payroll.id);
      } catch (error) {
        console.error('Erro ao excluir folha:', error);
      }
    }
  };

  const handleProcessAll = async () => {
    if (confirm(`Processar folha de pagamento para ${monthFilter}/${yearFilter}?`)) {
      try {
        await processAllPayrollMutation.mutateAsync({
          month: monthFilter,
          year: yearFilter
        });
      } catch (error) {
        console.error('Erro ao processar folha:', error);
      }
    }
  };

  const handleExport = () => {
    console.log('Exportar folha de pagamento');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPayroll(null);
  };

  const handleModalSubmit = (data: any) => {
    console.log('Salvar folha:', data);
    handleModalClose();
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      accessorKey: 'employee',
      header: 'Funcionário',
      cell: ({ row }: { row: { original: Payroll } }) => (
        <div>
          <div className="font-medium">{row.original.employee?.nome}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.employee?.matricula || 'Sem matrícula'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'base_salary',
      header: 'Salário Base',
      cell: ({ row }: { row: { original: Payroll } }) => (
        <div className="text-sm font-mono">
          R$ {(row.original.base_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'hours_worked',
      header: 'Horas Trabalhadas',
      cell: ({ row }: { row: { original: Payroll } }) => (
        <div className="text-sm">
          <div className="font-mono">
            {(row.original.hours_worked || 0).toFixed(1)}h
          </div>
          {row.original.overtime_hours && row.original.overtime_hours > 0 && (
            <div className="text-xs text-orange-600">
              +{(row.original.overtime_hours || 0).toFixed(1)}h extras
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'benefits_value',
      header: 'Benefícios',
      cell: ({ row }: { row: { original: Payroll } }) => (
        <div className="text-sm font-mono text-green-600">
          +R$ {(row.original.benefits_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'deductions_value',
      header: 'Descontos',
      cell: ({ row }: { row: { original: Payroll } }) => (
        <div className="text-sm font-mono text-red-600">
          -R$ {(row.original.deductions_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'net_salary',
      header: 'Salário Líquido',
      cell: ({ row }: { row: { original: Payroll } }) => (
        <div className="text-sm font-mono font-bold">
          R$ {(row.original.net_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: Payroll } }) => {
        const status = row.original.status;
        const getStatusColor = () => {
          switch (status) {
            case 'calculated':
              return 'outline';
            case 'processed':
              return 'default';
            case 'paid':
              return 'secondary';
            default:
              return 'secondary';
          }
        };

        const getStatusLabel = () => {
          switch (status) {
            case 'calculated':
              return 'Calculado';
            case 'processed':
              return 'Processado';
            case 'paid':
              return 'Pago';
            default:
              return status;
          }
        };

        return (
          <Badge variant={getStatusColor() as any}>
            {getStatusLabel()}
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
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Confirmar Exclusão',
      confirmationMessage: 'Tem certeza que deseja excluir esta folha de pagamento? Esta ação não pode ser desfeita.',
    },
  ];

  return (
    <RequireEntity entityName="payroll" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Gerencie a folha de pagamento dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleProcessAll}
            disabled={processAllPayrollMutation.isPending}
          >
            <Calculator className="h-4 w-4 mr-2" />
            {processAllPayrollMutation.isPending ? 'Processando...' : 'Processar Folha'}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Folha
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total_employees}</div>
                <div className="text-sm text-muted-foreground">Funcionários</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  R$ {stats.total_net_salary.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">Total Líquido</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  R$ {stats.total_taxes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">Impostos</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.processed}</div>
                <div className="text-sm text-muted-foreground">Processados</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por funcionário..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select
          value={monthFilter.toString()}
          onValueChange={handleMonthFilter}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <SelectItem key={month} value={month.toString()}>
                {month.toString().padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={yearFilter.toString()}
          onValueChange={handleYearFilter}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="calculated">Calculado</SelectItem>
            <SelectItem value="processed">Processado</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Tabela */}
      <EnhancedDataTable
        data={filteredPayrolls}
        columns={columns}
        loading={isLoading}
        searchable={false} // Já temos busca customizada
        filterable={false} // Já temos filtros customizados
        pagination={true}
        actions={actions}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Buscar folhas..."
        emptyMessage="Nenhuma folha de pagamento encontrada"
        pageSize={15}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === 'create' ? 'Nova Folha de Pagamento' :
          modalMode === 'edit' ? 'Editar Folha de Pagamento' :
          'Detalhes da Folha'
        }
        description={
          modalMode === 'create' ? 'Preencha os dados da nova folha' :
          modalMode === 'edit' ? 'Atualize os dados da folha' :
          'Visualize os dados da folha'
        }
        onSubmit={handleModalSubmit}
        loading={false}
        size="xl"
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
                    {selectedPayroll?.employee?.nome}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Período</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayroll?.month_reference}/{selectedPayroll?.year_reference}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Salário Base</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    R$ {(selectedPayroll?.base_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Horas Trabalhadas</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {(selectedPayroll?.hours_worked || 0).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Benefícios</label>
                  <p className="text-sm text-muted-foreground font-mono text-green-600">
                    +R$ {(selectedPayroll?.benefits_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Descontos</label>
                  <p className="text-sm text-muted-foreground font-mono text-red-600">
                    -R$ {(selectedPayroll?.deductions_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Salário Líquido</label>
                  <p className="text-sm text-muted-foreground font-mono font-bold">
                    R$ {(selectedPayroll?.net_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayroll?.status}
                  </p>
                </div>
              </div>
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
                      {/* Aqui seria carregado a lista de funcionários */}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Período *</label>
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {month.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormModal>
      </div>
    </RequireModule>
  );
}
