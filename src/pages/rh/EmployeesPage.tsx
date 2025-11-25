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
  Filter, 
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/rh/EnhancedDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { EmployeeForm } from '@/components/rh/EmployeeForm';
import { useEmployees, useDeleteEmployee } from '@/hooks/rh/useEmployees';
import { Employee, EmployeeFilters } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateOnly } from '@/lib/utils';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function EmployeesPage() {
  const { selectedCompany } = useCompany();
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: employeesData, isLoading } = useEmployees(filters);
  const deleteEmployeeMutation = useDeleteEmployee();

  // Dados
  const employees = employeesData?.data || [];
  const totalCount = employeesData?.count || 0;

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value || undefined 
    }));
  };

  const handleCreate = () => {
    setSelectedEmployee(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (employee: Employee) => {
    if (confirm(`Tem certeza que deseja excluir o funcionário ${employee.nome}?`)) {
      try {
        await deleteEmployeeMutation.mutateAsync(employee.id);
      } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
      }
    }
  };

  const handleExport = () => {
    // Implementar exportação
    console.log('Exportar funcionários');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleModalSubmit = (data: any) => {
    console.log('Salvar funcionário:', data);
    handleModalClose();
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      accessorKey: 'matricula',
      header: 'Matrícula',
      cell: ({ row }: { row: { original: Employee } }) => (
        <span className="font-mono text-sm">
          {row.original.matricula || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ row }: { row: { original: Employee } }) => (
        <div>
          <div className="font-medium">{row.original.nome}</div>
          <div className="text-sm text-muted-foreground">{row.original.cpf}</div>
        </div>
      ),
    },
    {
      accessorKey: 'cargo',
      header: 'Cargo',
      cell: ({ row }: { row: { original: Employee } }) => (
        <span className="text-sm">
          {row.original.cargo?.nome || 'Sem cargo'}
        </span>
      ),
    },
    {
      accessorKey: 'departamento',
      header: 'Departamento',
      cell: ({ row }: { row: { original: Employee } }) => (
        <span className="text-sm">
          {row.original.departamento?.nome || 'Sem departamento'}
        </span>
      ),
    },
    {
      accessorKey: 'data_admissao',
      header: 'Data Admissão',
      cell: ({ row }: { row: { original: Employee } }) => (
        <span className="text-sm">
          {formatDateOnly(row.original.data_admissao)}
        </span>
      ),
    },
    {
      accessorKey: 'salario_base',
      header: 'Salário Base',
      cell: ({ row }: { row: { original: Employee } }) => (
        <span className="text-sm font-mono">
          {row.original.salario_base ? 
            `R$ ${row.original.salario_base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
            'N/A'
          }
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: Employee } }) => {
        const status = row.original.status;
        const statusConfig = {
          ativo: { label: 'Ativo', variant: 'default' as const },
          inativo: { label: 'Inativo', variant: 'secondary' as const },
          afastado: { label: 'Afastado', variant: 'destructive' as const },
          demitido: { label: 'Demitido', variant: 'outline' as const },
        };
        
        const config = statusConfig[status] || statusConfig.ativo;
        
        return (
          <Badge variant={config.variant}>
            {config.label}
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
      confirmationMessage: 'Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.',
    },
  ];

  return (
    <RequireEntity entityName="employees" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie os funcionários da empresa
          </p>
        </div>
        <PermissionButton entity="employees" action="create">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </PermissionButton>
      </div>

      {/* Filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou matrícula..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="demitido">Demitido</SelectItem>
          </SelectContent>
        </Select>

        <PermissionButton entity="employees" action="read">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </PermissionButton>
      </div>

      {/* Tabela */}
      <EnhancedDataTable
        data={employees}
        columns={columns}
        loading={isLoading}
        searchable={false} // Já temos busca customizada
        filterable={false} // Já temos filtros customizados
        pagination={true}
        actions={actions}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Buscar funcionários..."
        emptyMessage="Nenhum funcionário encontrado"
        pageSize={10}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === 'create' ? 'Novo Funcionário' :
          modalMode === 'edit' ? 'Editar Funcionário' :
          'Detalhes do Funcionário'
        }
        description={
          modalMode === 'create' ? 'Preencha os dados do novo funcionário' :
          modalMode === 'edit' ? 'Atualize os dados do funcionário' :
          'Visualize os dados do funcionário'
        }
        onSubmit={handleModalSubmit}
        loading={false}
        size="xl"
        submitLabel={modalMode === 'view' ? undefined : 'Salvar'}
        cancelLabel="Fechar"
      >
        <EmployeeForm
          employee={selectedEmployee}
          onSubmit={handleModalSubmit}
          onCancel={handleModalClose}
          loading={false}
          mode={modalMode}
        />
      </FormModal>
      </div>
    </RequireEntity>
  );
}
