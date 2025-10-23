import React, { useState, useRef } from 'react';
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
  MoreHorizontal,
  Gift
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { EmployeeForm, EmployeeFormRef } from '@/components/rh/EmployeeForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Employee, EmployeeFilters } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function EmployeesPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const formRef = useRef<EmployeeFormRef>(null);

  // Hooks usando nova abordagem genérica
  const { data: employeesData, isLoading, error } = useRHData<Employee>('employees', selectedCompany?.id || '', filters);
  const createEmployee = useCreateEntity<Employee>('rh', 'employees', selectedCompany?.id || '');
  const updateEmployee = useUpdateEntity<Employee>('rh', 'employees', selectedCompany?.id || '');
  const deleteEmployee = useDeleteEntity('rh', 'employees', selectedCompany?.id || '');

  // Dados
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
  const totalCount = Array.isArray(employeesData) ? employeesData.length : employeesData?.totalCount || 0;

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: keyof EmployeeFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
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
    if (window.confirm(`Tem certeza que deseja excluir o funcionário ${employee.nome}?`)) {
      try {
        await deleteEmployee.mutateAsync(employee.id);
      } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
      }
    }
  };

  const handleModalSubmit = async () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  const handleFormSubmit = async (data: Partial<Employee>) => {
    try {
      if (modalMode === 'create') {
        await createEmployee.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedEmployee) {
        await updateEmployee.mutateAsync({
          id: selectedEmployee.id,
          data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
    }
  };

  const handleExportCsv = () => {
    // TODO: Implementar exportação CSV
    console.log('Exportando funcionários para CSV...');
  };

  const handleManageBenefits = (employee: Employee) => {
    navigate(`/rh/employee-benefits?employee_id=${employee.id}`);
  };

  // Colunas da tabela - formato simplificado para dados diretos
  const columns = [
    {
      key: 'matricula',
      header: 'Matrícula',
      render: (employee: Employee) => employee.matricula || '-'
    },
    {
      key: 'nome',
      header: 'Nome',
      render: (employee: Employee) => (
        <div className="font-medium">{employee.nome}</div>
      )
    },
    {
      key: 'cpf',
      header: 'CPF',
      render: (employee: Employee) => employee.cpf || '-'
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee: Employee) => {
        const statusConfig = {
          ativo: { label: 'Ativo', variant: 'default' as const },
          inativo: { label: 'Inativo', variant: 'secondary' as const },
          afastado: { label: 'Afastado', variant: 'destructive' as const },
          demitido: { label: 'Demitido', variant: 'outline' as const }
        };
        const config = statusConfig[employee.status as keyof typeof statusConfig] || statusConfig.ativo;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      }
    },
    {
      key: 'data_admissao',
      header: 'Data Admissão',
      render: (employee: Employee) => {
        return employee.data_admissao ? new Date(employee.data_admissao).toLocaleDateString('pt-BR') : '-';
      }
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (employee: Employee) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(employee)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(employee)
            },
            {
              label: 'Gerenciar Benefícios',
              icon: <Gift className="h-4 w-4" />,
              onClick: () => handleManageBenefits(employee)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(employee),
              variant: 'destructive' as const
            }
          ]}
          item={employee}
        />
      )
    }
  ];

  if (error) {
    return (

    <div className="p-6">
        <div className="text-red-500">Erro ao carregar funcionários: {error.message}</div>
      </div>
    );
  }

  return (
    <RequireEntity entityName="employees" action="read">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie os funcionários da empresa
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Funcionário
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou matrícula..."
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
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="demitido">Demitido</SelectItem>
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
        data={employees || []}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExportCsv}
        searchPlaceholder="Pesquisar funcionários..."
        emptyMessage="Nenhum funcionário encontrado"
        className="mt-6"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Funcionário' :
          modalMode === 'edit' ? 'Editar Funcionário' :
          'Visualizar Funcionário'
        }
        description="Preencha os dados do funcionário"
        onSubmit={handleModalSubmit}
        loading={createEmployee.isPending || updateEmployee.isPending}
        size="6xl"
        submitLabel={modalMode === 'create' ? 'Criar Funcionário' : 'Salvar Alterações'}
        cancelLabel="Fechar"
      >
        <EmployeeForm
          ref={formRef}
          employee={selectedEmployee}
          mode={modalMode}
          onSubmit={handleFormSubmit}
        />
      </FormModal>
      </div>
    </RequireEntity>
  );
}
