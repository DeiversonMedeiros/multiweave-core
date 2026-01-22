import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Building,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { EnhancedDataTable } from '@/components/rh/EnhancedDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions, StatusBadge, BatchActions } from '@/components/rh/TableActions';
import { EmployeeForm } from '@/components/rh/EmployeeForm';
import { EmployeeDependents } from '@/components/rh/EmployeeDependents';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { useCostCenters } from '@/hooks/useCostCenters';
import { Employee, EmployeeFilters, EmployeeInsert, EmployeeUpdate } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function EmployeeManagement() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  console.log('EmployeeManagement renderizado');
  
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedRows, setSelectedRows] = useState<Employee[]>([]);
  const [isDependentsModalOpen, setIsDependentsModalOpen] = useState(false);
  const [selectedEmployeeForDependents, setSelectedEmployeeForDependents] = useState<Employee | null>(null);

  // Hooks para dados
  const { data: employeesData, isLoading, error, refetch } = useRHData<Employee>('employees', selectedCompany?.id || '', filters);
  const { data: positionsData } = useRHData('positions', selectedCompany?.id || '');
  const { data: unitsData } = useRHData('units', selectedCompany?.id || '');
  const { data: workShiftsData } = useRHData('work_shifts', selectedCompany?.id || '');
  const { data: costCentersData } = useCostCenters();

  // Hooks para mutações
  const createEmployee = useCreateEntity<Employee>('rh', 'employees', selectedCompany?.id || '');
  const updateEmployee = useUpdateEntity<Employee>('rh', 'employees', selectedCompany?.id || '');
  const deleteEmployee = useDeleteEntity('rh', 'employees', selectedCompany?.id || '');

  // Dados
  const employees = useMemo(() => {
    const data = employeesData?.data || [];
    console.log('🔍 [EmployeeManagement] Dados recebidos:', data.length, 'funcionários');
    
    if (data.length === 0) {
      console.log('⚠️ [EmployeeManagement] Nenhum funcionário encontrado');
      return [];
    }
    
    // Log dos primeiros nomes antes da ordenação
    console.log('📋 [EmployeeManagement] Primeiros 5 nomes ANTES da ordenação:', 
      data.slice(0, 5).map(e => e.nome)
    );
    
    // Ordenar funcionários alfabeticamente por nome
    const sorted = [...data].sort((a, b) => {
      const nomeA = (a.nome || '').toLowerCase().trim();
      const nomeB = (b.nome || '').toLowerCase().trim();
      const result = nomeA.localeCompare(nomeB, 'pt-BR');
      return result;
    });
    
    // Log dos primeiros nomes depois da ordenação
    console.log('✅ [EmployeeManagement] Primeiros 5 nomes DEPOIS da ordenação:', 
      sorted.slice(0, 5).map(e => e.nome)
    );
    
    return sorted;
  }, [employeesData]);
  const positions = positionsData?.data || [];
  const units = unitsData?.data || [];
  const workShifts = workShiftsData?.data || [];
  const costCenters = costCentersData?.data || [];

  // Estatísticas
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(emp => emp.status === 'ativo').length;
    const inactive = employees.filter(emp => emp.status === 'inativo').length;
    const dismissed = employees.filter(emp => emp.status === 'demitido').length;
    const onLeave = employees.filter(emp => emp.status === 'licenca').length;
    const retired = employees.filter(emp => emp.status === 'aposentado').length;
    
    return {
      total,
      active,
      inactive,
      dismissed,
      onLeave,
      retired,
    };
  }, [employees]);

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
    console.log('handleCreate executado');
    setSelectedEmployee(null);
    setModalMode('create');
    setIsModalOpen(true);
    console.log('Modal deve estar aberto agora');
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
        await deleteEmployee(employee.id);
        await refetch();
      } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
      }
    }
  };

  const handleStatusChange = async (employee: Employee, status: string) => {
    try {
      await updateEmployee({ 
        id: employee.id, 
        data: { status: status as any } 
      });
      await refetch();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleModalSubmit = async (data: EmployeeInsert) => {
    try {
      if (modalMode === 'create') {
        await createEmployee(data);
      } else if (modalMode === 'edit' && selectedEmployee) {
        await updateEmployee({ 
          id: selectedEmployee.id, 
          data: data as EmployeeUpdate 
        });
      }
      await refetch();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  // Handlers para dependentes
  const handleViewDependents = (employee: Employee) => {
    setSelectedEmployeeForDependents(employee);
    setIsDependentsModalOpen(true);
  };

  const handleDependentsModalClose = () => {
    setIsDependentsModalOpen(false);
    setSelectedEmployeeForDependents(null);
  };

  const handleExport = () => {
    const dataToExport = selectedRows.length > 0 ? selectedRows : employees;
    const csvContent = convertToCSV(dataToExport);
    downloadCSV(csvContent, 'funcionarios.csv');
  };

  const handleBatchDelete = async (items: Employee[]) => {
    if (confirm(`Tem certeza que deseja excluir ${items.length} funcionário(s)?`)) {
      try {
        await Promise.all(items.map(item => deleteEmployee(item.id)));
        await refetch();
        setSelectedRows([]);
      } catch (error) {
        console.error('Erro ao excluir funcionários:', error);
      }
    }
  };

  const handleBatchStatusChange = async (items: Employee[], status: string) => {
    try {
      await Promise.all(items.map(item => 
        updateEmployee({ 
          id: item.id, 
          data: { status: status as any } 
        })
      ));
      await refetch();
      setSelectedRows([]);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  // Função para converter dados para CSV
  const convertToCSV = (data: Employee[]) => {
    const headers = [
      'Nome',
      'CPF',
      'Matrícula',
      'Cargo',
      'Departamento',
      'Status',
      'Salário Base',
      'Data Admissão',
      'Email',
      'Telefone'
    ];
    
    const rows = data.map(emp => [
      emp.nome,
      emp.cpf,
      emp.matricula || '',
      emp.cargo?.nome || '',
      emp.departamento?.nome || '',
      emp.status,
      emp.salario_base?.toFixed(2) || '',
      emp.data_admissao,
      emp.email || '',
      emp.telefone || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  };

  // Função para baixar CSV
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Colunas da tabela
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: 'nome',
      header: 'Funcionário',
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <RequirePage pagePath="/rh/employees*" action="read">
      <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{employee.nome}</div>
              <div className="text-sm text-muted-foreground">
                {employee.matricula && `Matrícula: ${employee.matricula}`}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'cpf',
      header: 'CPF',
      cell: ({ row }) => {
        const cpf = row.getValue('cpf') as string;
        return cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-';
      },
    },
    {
      accessorKey: 'cargo',
      header: 'Cargo',
      cell: ({ row }) => {
        const cargo = row.original.cargo;
        return cargo ? (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            {cargo.nome}
          </div>
        ) : '-';
      },
    },
    {
      accessorKey: 'departamento',
      header: 'Departamento',
      cell: ({ row }) => {
        const departamento = row.original.departamento;
        return departamento ? (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            {departamento.nome}
          </div>
        ) : '-';
      },
    },
    {
      accessorKey: 'work_shift',
      header: 'Turno',
      cell: ({ row }) => {
        const turno = row.original.work_shift;
        return turno ? (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {turno.nome}
          </div>
        ) : '-';
      },
    },
    {
      accessorKey: 'salario_base',
      header: 'Salário',
      cell: ({ row }) => {
        const salario = row.getValue('salario_base') as number;
        return salario ? (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {salario.toLocaleString('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            })}
          </div>
        ) : '-';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <StatusBadge status={status} />;
      },
    },
    {
      accessorKey: 'data_admissao',
      header: 'Data Admissão',
      cell: ({ row }) => {
        const date = row.getValue('data_admissao') as string;
        return formatDateOnly(date);
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TableActions
            item={row.original}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDependents(row.original)}
            className="flex items-center gap-1"
          >
            <UserPlus className="h-4 w-4" />
            Dependentes
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Erro ao carregar funcionários</span>
            </div>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              className="w-full mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie os funcionários da empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <button 
            onClick={() => {
              console.log('Botão clicado!');
              handleCreate();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Funcionário
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Demitidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.dismissed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Licença</p>
                <p className="text-2xl font-bold text-purple-600">{stats.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Aposentados</p>
                <p className="text-2xl font-bold text-blue-600">{stats.retired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar funcionários..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="demitido">Demitido</SelectItem>
                <SelectItem value="aposentado">Aposentado</SelectItem>
                <SelectItem value="licenca">Licença</SelectItem>
              </SelectContent>
            </Select>
            
            <Select onValueChange={(value) => handleFilterChange('cargo_id', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select onValueChange={(value) => handleFilterChange('departamento_id', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ações em lote */}
      {selectedRows.length > 0 && (
        <BatchActions
          selectedItems={selectedRows}
          onDelete={handleBatchDelete}
          onStatusChange={handleBatchStatusChange}
          onExport={handleExport}
        />
      )}

      {/* Tabela */}
      {(() => {
        console.log('🎯 [EmployeeManagement] Renderizando tabela com:', {
          employeesCount: employees.length,
          firstThreeNames: employees.slice(0, 3).map(e => e.nome),
          initialSorting: [{ id: 'nome', desc: false }]
        });
        return null;
      })()}
      <EnhancedDataTable
        data={employees}
        columns={columns}
        isLoading={isLoading}
        searchable={false}
        filterable={false}
        pagination={true}
        onAdd={handleCreate}
        onExport={handleExport}
        searchPlaceholder="Buscar funcionários..."
        emptyMessage="Nenhum funcionário encontrado"
        pageSize={10}
        title="Funcionários"
        initialSorting={[{ id: 'nome', desc: false }]}
      />

      {/* Modal */}
      {console.log('Renderizando modal - isModalOpen:', isModalOpen)}
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
        <div>
          <p>Modal está funcionando! Estado: {isModalOpen ? 'Aberto' : 'Fechado'}</p>
          <p>Modo: {modalMode}</p>
        </div>
      </FormModal>

      {/* Modal de Dependentes */}
      {selectedEmployeeForDependents && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <EmployeeDependents
              employee={selectedEmployeeForDependents}
              onClose={handleDependentsModalClose}
            />
          </div>
        </div>
      )}
    </div>
    </RequirePage>
  );
}
