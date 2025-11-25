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
  Calculator
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { PayrollForm } from '@/components/rh/PayrollForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Payroll, Employee } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { FinancialIntegrationService } from '@/services/rh/financialIntegrationService';
import { EntityService } from '@/services/generic/entityService';
import { toast } from 'sonner';
import { useProcessAllPayroll } from '@/hooks/rh/usePayroll';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function PayrollPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks usando nova abordagem genérica
  const { data: payrolls, isLoading, error, refetch } = useRHData<Payroll>('payroll', selectedCompany?.id || '');
  const createPayroll = useCreateEntity<Payroll>('rh', 'payroll', selectedCompany?.id || '');
  const updatePayroll = useUpdateEntity<Payroll>('rh', 'payroll', selectedCompany?.id || '');
  const deletePayroll = useDeleteEntity('rh', 'payroll', selectedCompany?.id || '');
  const processAllPayroll = useProcessAllPayroll();
  
  // Estado para filtros de mês/ano
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

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
    if (window.confirm(`Tem certeza que deseja excluir esta folha de pagamento?`)) {
      try {
        await deletePayroll.mutateAsync(payroll.id);
      } catch (error) {
        console.error('Erro ao excluir folha:', error);
      }
    }
  };

  const handleModalSubmit = async (data: Partial<Payroll> & { employee_id?: string }) => {
    try {
      if (modalMode === 'create') {
        if (!data.employee_id) {
          toast.error('Por favor, selecione um funcionário');
          return;
        }
        
        // Criar folha
        const newPayroll = await createPayroll.mutateAsync({
          ...data,
          employee_id: data.employee_id,
          company_id: selectedCompany?.id
        });

        // Criar conta a pagar automaticamente se a folha foi processada
        if (newPayroll && (newPayroll.status === 'processado' || newPayroll.status === 'pago')) {
          try {
            const integrationService = FinancialIntegrationService.getInstance();
            const config = await integrationService.getIntegrationConfig(selectedCompany?.id || '');
            
            if (config.autoCreateAP) {
              // Buscar dados do funcionário
              const employeeResult = await EntityService.getById<Employee>({
                schema: 'rh',
                table: 'employees',
                companyId: selectedCompany?.id || '',
                id: data.employee_id
              });
              
              if (employeeResult) {
                const employee = employeeResult;
                const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                const monthName = monthNames[(newPayroll.mes_referencia || 1) - 1];
                const period = `${monthName}/${newPayroll.ano_referencia}`;
                
                // Calcular data de vencimento
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (config.defaultDueDate || 5));
                
                await integrationService.createAccountPayable(
                  selectedCompany?.id || '',
                  {
                    payrollId: newPayroll.id,
                    employeeId: employee.id || data.employee_id,
                    employeeName: employee.nome || 'Funcionário',
                    netSalary: newPayroll.salario_liquido || 0,
                    period: period,
                    dueDate: dueDate.toISOString().split('T')[0],
                    costCenter: employee.cost_center_id || undefined
                  },
                  config
                );
                
                toast.success('Folha criada e conta a pagar gerada automaticamente');
              }
            }
          } catch (apError) {
            console.error('Erro ao criar conta a pagar:', apError);
            // Não falhar a criação da folha se a conta a pagar falhar
            toast.warning('Folha criada, mas houve erro ao criar conta a pagar');
          }
        } else {
          toast.success('Folha criada com sucesso');
        }
      } else if (modalMode === 'edit' && selectedPayroll) {
        await updatePayroll.mutateAsync({
          id: selectedPayroll.id,
          updatedEntity: data
        });
        toast.success('Folha atualizada com sucesso');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar folha:', error);
      toast.error('Erro ao salvar folha');
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando folha de pagamento para CSV...');
  };

  const handleProcessPayroll = async () => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    if (!confirm(`Processar folha de pagamento para ${monthFilter}/${yearFilter}?`)) {
      return;
    }

    try {
      toast.loading('Processando folha de pagamento...', { id: 'process-payroll' });
      
      await processAllPayroll.mutateAsync({
        month: monthFilter,
        year: yearFilter
      });

      toast.success('Folha de pagamento processada com sucesso!', { id: 'process-payroll' });
      
      // Atualizar lista de folhas
      refetch();
    } catch (error) {
      console.error('Erro ao processar folha:', error);
      toast.error('Erro ao processar folha de pagamento', { id: 'process-payroll' });
    }
  };

  // Colunas da tabela - formato simplificado para dados diretos
  const columns = [
    {
      key: 'mes_referencia',
      header: 'Mês/Ano',
      render: (payroll: Payroll) => (
        <div className="font-medium">
          {payroll.mes_referencia}/{payroll.ano_referencia}
        </div>
      )
    },
    {
      key: 'salario_base',
      header: 'Salário Base',
      render: (payroll: Payroll) => (
        <div className="font-medium text-blue-600">
          {payroll.salario_base ? `R$ ${payroll.salario_base.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'total_vencimentos',
      header: 'Total Vencimentos',
      render: (payroll: Payroll) => (
        <div className="font-medium text-green-600">
          {payroll.total_vencimentos ? `R$ ${payroll.total_vencimentos.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'total_descontos',
      header: 'Total Descontos',
      render: (payroll: Payroll) => (
        <div className="font-medium text-red-600">
          {payroll.total_descontos ? `R$ ${payroll.total_descontos.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'salario_liquido',
      header: 'Salário Líquido',
      render: (payroll: Payroll) => (
        <div className="font-bold text-green-700">
          {payroll.salario_liquido ? `R$ ${payroll.salario_liquido.toFixed(2)}` : '-'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (payroll: Payroll) => {
        const statusConfig = {
          pendente: { label: 'Pendente', variant: 'secondary' as const },
          processado: { label: 'Processado', variant: 'default' as const },
          pago: { label: 'Pago', variant: 'outline' as const },
          cancelado: { label: 'Cancelado', variant: 'destructive' as const }
        };
        const config = statusConfig[payroll.status as keyof typeof statusConfig] || statusConfig.pendente;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      }
    },
    {
      key: 'data_pagamento',
      header: 'Data Pagamento',
      render: (payroll: Payroll) => (
        <div className="text-sm text-muted-foreground">
          {payroll.data_pagamento ? new Date(payroll.data_pagamento).toLocaleDateString('pt-BR') : '-'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (payroll: Payroll) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handleView(payroll)
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(payroll)
            },
            {
              label: 'Excluir',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(payroll),
              variant: 'destructive' as const
            }
          ]}
          item={payroll}
        />
      )
    }
  ];

  if (error) {
    return (

    <div className="p-6">
        <div className="text-red-500">Erro ao carregar folha de pagamento: {error.message}</div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Gerencie a folha de pagamento dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessPayroll} 
            className="flex items-center gap-2"
            disabled={processAllPayroll.isPending}
          >
            <Calculator className="h-4 w-4" />
            {processAllPayroll.isPending ? 'Processando...' : 'Processar Folha'}
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Folha
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
            <SelectItem value="processado">Processado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={monthFilter.toString()}
          onValueChange={(value) => setMonthFilter(parseInt(value))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Janeiro</SelectItem>
            <SelectItem value="2">Fevereiro</SelectItem>
            <SelectItem value="3">Março</SelectItem>
            <SelectItem value="4">Abril</SelectItem>
            <SelectItem value="5">Maio</SelectItem>
            <SelectItem value="6">Junho</SelectItem>
            <SelectItem value="7">Julho</SelectItem>
            <SelectItem value="8">Agosto</SelectItem>
            <SelectItem value="9">Setembro</SelectItem>
            <SelectItem value="10">Outubro</SelectItem>
            <SelectItem value="11">Novembro</SelectItem>
            <SelectItem value="12">Dezembro</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Ano"
          value={yearFilter}
          onChange={(e) => setYearFilter(parseInt(e.target.value) || new Date().getFullYear())}
          className="w-[100px]"
        />

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
        data={payrolls || []}
        columns={columns}
        loading={isLoading}
        onAdd={handleCreate}
        onExport={handleExportCsv}
        searchPlaceholder="Pesquisar folha de pagamento..."
        emptyMessage="Nenhum registro de folha encontrado"
        className="mt-6"
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Nova Folha de Pagamento' :
          modalMode === 'edit' ? 'Editar Folha de Pagamento' :
          'Visualizar Folha de Pagamento'
        }
        loading={createPayroll.isPending || updatePayroll.isPending}
        size="lg"
        submitLabel={modalMode === 'create' ? 'Criar Folha' : 'Salvar Alterações'}
      >
        <PayrollForm
          payroll={selectedPayroll}
          onSubmit={handleModalSubmit}
          mode={modalMode}
        />
      </FormModal>
    </div>
    );
}
