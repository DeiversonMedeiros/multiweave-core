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
import { Payroll } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function PayrollPageNew() {
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Hooks usando nova abordagem genérica
  const { data: payrolls, isLoading, error } = useRHData<Payroll>('payroll', selectedCompany?.id || '');
  const createPayroll = useCreateEntity<Payroll>('rh', 'payroll');
  const updatePayroll = useUpdateEntity<Payroll>('rh', 'payroll');
  const deletePayroll = useDeleteEntity('rh', 'payroll');

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

  const handleModalSubmit = async (data: Partial<Payroll>) => {
    try {
      if (modalMode === 'create') {
        await createPayroll.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedPayroll) {
        await updatePayroll.mutateAsync({
          id: selectedPayroll.id,
          updatedEntity: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar folha:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando folha de pagamento para CSV...');
  };

  const handleProcessPayroll = () => {
    // TODO: Implementar processamento de folha
    console.log('Processando folha de pagamento...');
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
          <Button onClick={handleProcessPayroll} className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Processar Folha
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
