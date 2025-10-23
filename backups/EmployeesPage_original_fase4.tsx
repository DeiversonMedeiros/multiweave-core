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
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function EmployeesPage() {
  const { selectedCompany } = useCompany();
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks
  const { data: employeesData, isLoading } = useEmployees(filters);
  const deleteEmployeeMutation = useDeleteEmployee();

  // Dados
  const employees = employeesData || [];

  // Handlers
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

  const handleFilterChange = (key: keyof EmployeeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters(prev => ({ ...prev, search: term }));
  };

  // Colunas da tabela
  const columns = [
    {
      header: 'Nome',
      accessor: 'nome',
      cell: (employee: Employee) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {employee.nome?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{employee.nome}</div>
            <div className="text-sm text-gray-500">{employee.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Cargo',
      accessor: 'cargo',
      cell: (employee: Employee) => (
        <div>
          <div className="font-medium text-gray-900">{employee.cargo}</div>
          <div className="text-sm text-gray-500">{employee.departamento}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (employee: Employee) => (
        <Badge variant={employee.ativo ? 'default' : 'secondary'}>
          {employee.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Data Admissão',
      accessor: 'data_admissao',
      cell: (employee: Employee) => (
        <div className="text-sm text-gray-900">
          {employee.data_admissao ? new Date(employee.data_admissao).toLocaleDateString('pt-BR') : '-'}
        </div>
      ),
    },
    {
      header: 'Ações',
      accessor: 'actions',
      cell: (employee: Employee) => (
        <TableActions
          onView={() => handleView(employee)}
          onEdit={() => handleEdit(employee)}
          onDelete={() => handleDelete(employee)}
          canView={true}
          canEdit={canEditModule('employees')}
          canDelete={canDeleteModule('employees')}
        />
      ),
    },
  ];

  return (
    <RequireModule moduleName="rh" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-600 mt-1">
              Gerencie os funcionários da empresa
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </Button>
            <PermissionButton
              module="employees"
              action="create"
              onClick={handleCreate}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Funcionário</span>
            </PermissionButton>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar funcionários..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.departamento || ''}
              onValueChange={(value) => handleFilterChange('departamento', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="ti">TI</SelectItem>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.cargo || ''}
              onValueChange={(value) => handleFilterChange('cargo', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="desenvolvedor">Desenvolvedor</SelectItem>
                <SelectItem value="analista">Analista</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="diretor">Diretor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela */}
        <EnhancedDataTable
          data={employees}
          columns={columns}
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearch={handleSearch}
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
          mode={modalMode}
        >
          <EmployeeForm
            employee={selectedEmployee}
            mode={modalMode}
            onSuccess={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
          />
        </FormModal>
      </div>
    </RequireModule>
  );
}
