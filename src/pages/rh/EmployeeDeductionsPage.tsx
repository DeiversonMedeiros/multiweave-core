// =====================================================
// PÁGINA DE DEDUÇÕES DE FUNCIONÁRIOS
// =====================================================

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { DeductionsService, EmployeeDeduction, DeductionType, DeductionStatus } from '@/services/rh/deductionsService';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmployees } from '@/hooks/rh/useEmployees';
// Funções auxiliares de formatação
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// Formulário de Dedução
const DeductionForm = React.forwardRef<HTMLFormElement, {
  deduction: EmployeeDeduction | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}>(({ deduction, onSubmit, onCancel }, ref) => {
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data || [];
  
  const [formData, setFormData] = useState({
    employee_id: deduction?.employee_id || '',
    tipo_deducao: deduction?.tipo_deducao || 'outros' as DeductionType,
    categoria: deduction?.categoria || '',
    descricao: deduction?.descricao || '',
    valor_total: deduction?.valor_total || 0,
    valor_parcela: deduction?.valor_parcela || 0,
    numero_parcelas: deduction?.numero_parcelas || 1,
    data_origem: deduction?.data_origem ? deduction.data_origem.split('T')[0] : new Date().toISOString().split('T')[0],
    mes_referencia_inicio: deduction?.mes_referencia_inicio || new Date().getMonth() + 1,
    ano_referencia_inicio: deduction?.ano_referencia_inicio || new Date().getFullYear(),
    aplicar_na_folha: deduction?.aplicar_na_folha ?? true,
    documento_referencia: deduction?.documento_referencia || '',
    observacoes: deduction?.observacoes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    if (!formData.employee_id) {
      toast.error('Selecione um funcionário');
      return;
    }
    
    if (!formData.descricao.trim()) {
      toast.error('Preencha a descrição');
      return;
    }
    
    if (!formData.valor_total || formData.valor_total <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    
    await onSubmit(formData);
  };

  const tiposDeducao: { value: DeductionType; label: string }[] = [
    { value: 'coparticipacao_medica', label: 'Coparticipação Médica' },
    { value: 'emprestimo', label: 'Empréstimo' },
    { value: 'multa', label: 'Multa' },
    { value: 'avaria_veiculo', label: 'Avaria em Veículo' },
    { value: 'danos_materiais', label: 'Danos Materiais' },
    { value: 'adiantamento', label: 'Adiantamento' },
    { value: 'desconto_combinado', label: 'Desconto Combinado' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-4">
      {/* Campo de Funcionário */}
      <div>
        <label className="text-sm font-medium">Funcionário *</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o funcionário" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(employees) && employees.length > 0 ? (
              employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.nome} {emp.matricula ? `(${emp.matricula})` : ''}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>Nenhum funcionário encontrado</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Tipo de Dedução</label>
          <Select
            value={formData.tipo_deducao}
            onValueChange={(value) => setFormData({ ...formData, tipo_deducao: value as DeductionType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposDeducao.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Categoria</label>
          <Input
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            placeholder="Ex: Empréstimo Consignado"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Descrição</label>
        <Input
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          placeholder="Descrição da dedução"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Valor Total</label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor_total}
            onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Valor da Parcela</label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor_parcela || formData.valor_total}
            onChange={(e) => setFormData({ ...formData, valor_parcela: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Número de Parcelas</label>
          <Input
            type="number"
            value={formData.numero_parcelas}
            onChange={(e) => setFormData({ ...formData, numero_parcelas: parseInt(e.target.value) || 1 })}
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Data de Origem</label>
          <Input
            type="date"
            value={formData.data_origem}
            onChange={(e) => setFormData({ ...formData, data_origem: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Mês Referência</label>
          <Input
            type="number"
            min={1}
            max={12}
            value={formData.mes_referencia_inicio}
            onChange={(e) => setFormData({ ...formData, mes_referencia_inicio: parseInt(e.target.value) || 1 })}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Ano Referência</label>
          <Input
            type="number"
            min={2020}
            max={2100}
            value={formData.ano_referencia_inicio}
            onChange={(e) => setFormData({ ...formData, ano_referencia_inicio: parseInt(e.target.value) || new Date().getFullYear() })}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Documento de Referência</label>
        <Input
          value={formData.documento_referencia}
          onChange={(e) => setFormData({ ...formData, documento_referencia: e.target.value })}
          placeholder="Nº nota fiscal, protocolo, etc."
        />
      </div>

      <div>
        <label className="text-sm font-medium">Observações</label>
        <textarea
          className="w-full p-2 border rounded-md"
          rows={3}
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.aplicar_na_folha}
          onChange={(e) => setFormData({ ...formData, aplicar_na_folha: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">Aplicar na Folha de Pagamento</label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {deduction ? 'Atualizar' : 'Criar'} Dedução
        </Button>
      </div>
    </form>
  );
});

DeductionForm.displayName = 'DeductionForm';

export default function EmployeeDeductionsPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    tipoDeducao?: DeductionType;
    status?: DeductionStatus;
    employeeId?: string;
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<EmployeeDeduction | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Query de deduções
  const { data: deductions = [], isLoading, error } = useQuery({
    queryKey: ['deductions', selectedCompany?.id, filters],
    queryFn: () => DeductionsService.list(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => DeductionsService.create(selectedCompany?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      toast.success('Dedução criada com sucesso');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar dedução: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      DeductionsService.update(id, selectedCompany?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      toast.success('Dedução atualizada com sucesso');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar dedução: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => DeductionsService.delete(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      toast.success('Dedução removida com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover dedução: ' + error.message);
    },
  });

  // Handlers
  const handleCreate = () => {
    setSelectedDeduction(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (deduction: EmployeeDeduction) => {
    setSelectedDeduction(deduction);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (deduction: EmployeeDeduction) => {
    setSelectedDeduction(deduction);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (deduction: EmployeeDeduction) => {
    if (window.confirm(`Tem certeza que deseja excluir esta dedução?`)) {
      await deleteMutation.mutateAsync(deduction.id);
    }
  };

  const handleModalSubmit = async (data: any) => {
    if (modalMode === 'create') {
      await createMutation.mutateAsync(data);
    } else if (modalMode === 'edit' && selectedDeduction) {
      await updateMutation.mutateAsync({ id: selectedDeduction.id, data });
    }
  };

  // Filtrar dados
  const filteredDeductions = deductions.filter((deduction) => {
    if (searchTerm && !deduction.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.tipoDeducao && deduction.tipo_deducao !== filters.tipoDeducao) {
      return false;
    }
    if (filters.status && deduction.status !== filters.status) {
      return false;
    }
    return true;
  });

  // Buscar funcionários para exibir nomes na tabela
  const { data: employeesListData } = useEmployees();
  const employeesList = employeesListData?.data || [];

  // Colunas da tabela
  const columns = [
    {
      key: 'funcionario',
      header: 'Funcionário',
      render: (deduction: EmployeeDeduction) => {
        const employee = employeesList.find((emp) => emp.id === deduction.employee_id);
        return (
          <div className="font-medium">
            {employee ? `${employee.nome}${employee.matricula ? ` (${employee.matricula})` : ''}` : deduction.employee_id.substring(0, 8)}
          </div>
        );
      },
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (deduction: EmployeeDeduction) => {
        const tipos: Record<DeductionType, string> = {
          coparticipacao_medica: 'Coparticipação',
          emprestimo: 'Empréstimo',
          multa: 'Multa',
          avaria_veiculo: 'Avaria Veículo',
          danos_materiais: 'Danos Materiais',
          adiantamento: 'Adiantamento',
          desconto_combinado: 'Desconto Combinado',
          outros: 'Outros',
        };
        return <Badge variant="outline">{tipos[deduction.tipo_deducao] || deduction.tipo_deducao}</Badge>;
      },
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (deduction: EmployeeDeduction) => (
        <div>
          <div className="font-medium">{deduction.descricao}</div>
          {deduction.categoria && (
            <div className="text-sm text-muted-foreground">{deduction.categoria}</div>
          )}
        </div>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (deduction: EmployeeDeduction) => (
        <div>
          <div className="font-medium text-red-600">
            {formatCurrency(deduction.valor_parcela || deduction.valor_total)}
          </div>
          {deduction.numero_parcelas > 1 && (
            <div className="text-xs text-muted-foreground">
              Parcela {deduction.parcela_atual}/{deduction.numero_parcelas}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'data',
      header: 'Data Origem',
      render: (deduction: EmployeeDeduction) => (
        <div className="text-sm">
          {formatDate(deduction.data_origem)}
        </div>
      ),
    },
    {
      key: 'referencia',
      header: 'Referência',
      render: (deduction: EmployeeDeduction) => (
        <div className="text-sm">
          {deduction.mes_referencia_folha && deduction.ano_referencia_folha
            ? `${deduction.mes_referencia_folha.toString().padStart(2, '0')}/${deduction.ano_referencia_folha}`
            : '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (deduction: EmployeeDeduction) => {
        const statusColors: Record<DeductionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          pendente: 'outline',
          em_aberto: 'default',
          pago: 'default',
          cancelado: 'secondary',
          parcelado: 'outline',
        };
        return (
          <Badge variant={statusColors[deduction.status] || 'outline'}>
            {deduction.status.replace('_', ' ').toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (deduction: EmployeeDeduction) => (
        <TableActions
          onView={() => handleView(deduction)}
          onEdit={() => handleEdit(deduction)}
          onDelete={() => handleDelete(deduction)}
        />
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">Erro ao carregar deduções: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Deduções de Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie deduções como coparticipação, empréstimos, multas e avarias
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Dedução
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={filters.tipoDeducao || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, tipoDeducao: value === 'all' ? undefined : (value as DeductionType) })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="coparticipacao_medica">Coparticipação Médica</SelectItem>
            <SelectItem value="emprestimo">Empréstimo</SelectItem>
            <SelectItem value="multa">Multa</SelectItem>
            <SelectItem value="avaria_veiculo">Avaria Veículo</SelectItem>
            <SelectItem value="danos_materiais">Danos Materiais</SelectItem>
            <SelectItem value="adiantamento">Adiantamento</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value === 'all' ? undefined : (value as DeductionStatus) })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_aberto">Em Aberto</SelectItem>
            <SelectItem value="parcelado">Parcelado</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : filteredDeductions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma dedução encontrada
        </div>
      ) : (
        <SimpleDataTable
          data={filteredDeductions}
          columns={columns}
        />
      )}

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? 'Nova Dedução'
            : modalMode === 'edit'
            ? 'Editar Dedução'
            : 'Visualizar Dedução'
        }
        showFooter={false}
      >
        <DeductionForm
          deduction={selectedDeduction}
          onSubmit={handleModalSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}

