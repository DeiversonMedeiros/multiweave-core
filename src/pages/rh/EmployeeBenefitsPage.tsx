import React, { useState, useMemo } from 'react';
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
  User,
  Gift
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { EmployeeBenefitAssignmentForm } from '@/components/rh/EmployeeBenefitAssignmentForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { EmployeeBenefitAssignment, BenefitConfiguration } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { RequirePage } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { formatDateString } from '@/utils/dateUtils';

// =====================================================
// PÁGINA DE VÍNCULOS FUNCIONÁRIO-BENEFÍCIO
// =====================================================

export default function EmployeeBenefitsPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EmployeeBenefitAssignment | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks para dados
  // Usando pageSize grande para buscar todos os registros (10000 deve ser suficiente para a maioria dos casos)
  const { data: assignmentsData, isLoading, error } = useRHData<EmployeeBenefitAssignment>('employee_benefit_assignments', selectedCompany?.id || '', undefined, 10000);
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data || [];
  const { data: benefitsData } = useRHData<BenefitConfiguration>('benefit_configurations', selectedCompany?.id || '', undefined, 10000);

  // Função para buscar dados relacionados
  const getEmployeeName = (employeeId: string) => {
    if (!Array.isArray(employees)) return 'Funcionário não encontrado';
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.nome || 'Funcionário não encontrado';
  };

  // Extrair dados dos objetos de resposta
  const assignmentsRaw = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.data || [];
  const benefits = Array.isArray(benefitsData) ? benefitsData : benefitsData?.data || [];
  
  // Ordenar assignments por nome do funcionário em ordem alfabética usando useMemo
  const assignments = useMemo(() => {
    if (!Array.isArray(assignmentsRaw) || assignmentsRaw.length === 0) return [];
    if (!Array.isArray(employees) || employees.length === 0) return assignmentsRaw;
    
    return [...assignmentsRaw].sort((a, b) => {
      // Buscar nomes dos funcionários diretamente
      const employeeA = employees.find(emp => emp.id === a.employee_id);
      const employeeB = employees.find(emp => emp.id === b.employee_id);
      const nameA = (employeeA?.nome || '').toLowerCase().trim();
      const nameB = (employeeB?.nome || '').toLowerCase().trim();
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [assignmentsRaw, employees]);
  
  const createAssignment = useCreateEntity<EmployeeBenefitAssignment>('rh', 'employee_benefit_assignments', selectedCompany?.id || '');
  const updateAssignment = useUpdateEntity<EmployeeBenefitAssignment>('rh', 'employee_benefit_assignments', selectedCompany?.id || '');
  const deleteAssignment = useDeleteEntity('rh', 'employee_benefit_assignments', selectedCompany?.id || '');

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
    setSelectedAssignment(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (assignment: EmployeeBenefitAssignment) => {
    setSelectedAssignment(assignment);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (assignment: EmployeeBenefitAssignment) => {
    setSelectedAssignment(assignment);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (assignment: EmployeeBenefitAssignment) => {
    if (window.confirm(`Tem certeza que deseja remover este vínculo de benefício?`)) {
      try {
        await deleteAssignment.mutateAsync(assignment.id);
      } catch (error) {
        console.error('Erro ao remover vínculo:', error);
      }
    }
  };

  const handleModalSubmit = async (data: Partial<EmployeeBenefitAssignment>) => {
    try {
      if (modalMode === 'create') {
        await createAssignment.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedAssignment) {
        await updateAssignment.mutateAsync({
          id: selectedAssignment.id,
          updatedEntity: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar vínculo:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando vínculos para CSV...');
  };

  const getBenefitName = (benefitId: string) => {
    if (!Array.isArray(benefits)) return 'Benefício não encontrado';
    const benefit = benefits.find(ben => ben.id === benefitId);
    return benefit?.name || 'Benefício não encontrado';
  };

  // Colunas da tabela
  const columns = [
    {
      key: 'employee',
      header: 'Funcionário',
      render: (assignment: EmployeeBenefitAssignment) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="font-medium">{getEmployeeName(assignment.employee_id)}</div>
        </div>
      )
    },
    {
      key: 'benefit',
      header: 'Benefício',
      render: (assignment: EmployeeBenefitAssignment) => (
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-muted-foreground" />
          <div className="font-medium">{getBenefitName(assignment.benefit_config_id)}</div>
        </div>
      )
    },
    {
      key: 'start_date',
      header: 'Data Início',
      render: (assignment: EmployeeBenefitAssignment) => (
        <div className="text-sm">
          {formatDateString(assignment.start_date)}
        </div>
      )
    },
    {
      key: 'end_date',
      header: 'Data Fim',
      render: (assignment: EmployeeBenefitAssignment) => (
        <div className="text-sm">
          {formatDateString(assignment.end_date)}
        </div>
      )
    },
    {
      key: 'custom_value',
      header: 'Valor Personalizado',
      render: (assignment: EmployeeBenefitAssignment) => (
        <div className="font-medium text-green-600">
          {assignment.custom_value ? `R$ ${assignment.custom_value.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (assignment: EmployeeBenefitAssignment) => (
        <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
          {assignment.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (assignment: EmployeeBenefitAssignment) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(assignment)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(assignment)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(assignment),
              variant: 'destructive' as const
            }
          ]}
          item={assignment}
        />
      )
    }
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">Erro ao carregar vínculos: {error.message}</div>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/rh/employees*" action="read">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Vínculos de Benefícios</h1>
            <p className="text-muted-foreground">
              Gerencie os benefícios atribuídos aos funcionários
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Vínculo
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por funcionário ou benefício..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select
            value={filters.employee_id || 'all'}
            onValueChange={(value) => handleFilterChange('employee_id', value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {Array.isArray(employees) && employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.benefit_config_id || 'all'}
            onValueChange={(value) => handleFilterChange('benefit_config_id', value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Benefício" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os benefícios</SelectItem>
              {Array.isArray(benefits) && benefits.map((benefit) => (
                <SelectItem key={benefit.id} value={benefit.id}>
                  {benefit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
            onValueChange={(value) => handleFilterChange('is_active', value === 'active' ? true : value === 'inactive' ? false : undefined)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
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
          data={assignments || []}
          columns={columns}
          loading={isLoading}
          onAdd={handleCreate}
          onExport={handleExportCsv}
          searchPlaceholder="Pesquisar vínculos..."
          emptyMessage="Nenhum vínculo encontrado"
          className="mt-6"
        />

        {/* Modal */}
        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            modalMode === 'create' ? 'Novo Vínculo de Benefício' :
            modalMode === 'edit' ? 'Editar Vínculo de Benefício' :
            'Visualizar Vínculo de Benefício'
          }
          description="Configure o vínculo entre funcionário e benefício"
          loading={createAssignment.isPending || updateAssignment.isPending}
          size="lg"
          showFooter={false}
        >
          <EmployeeBenefitAssignmentForm
            assignment={selectedAssignment}
            employees={employees || []}
            benefits={benefits || []}
            onSubmit={handleModalSubmit}
            mode={modalMode}
          />
        </FormModal>
      </div>
    </RequirePage>
  );
}
