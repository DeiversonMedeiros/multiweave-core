// =====================================================
// PÁGINA DE SERVIÇOS MÉDICOS E COPARTICIPAÇÃO
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
  Stethoscope,
  FileText,
  Calculator
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { DeductionsService, MedicalServiceUsage } from '@/services/rh/deductionsService';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useEmployeeMedicalPlans } from '@/hooks/rh/useMedicalAgreements';

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

// Formulário de Serviço Médico
const MedicalServiceForm = React.forwardRef<HTMLFormElement, {
  service: MedicalServiceUsage | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}>(({ service, onSubmit, onCancel }, ref) => {
  const { selectedCompany } = useCompany();
  const { data: employees = [] } = useEmployees();
  const { data: employeePlans = [] } = useEmployeeMedicalPlans({});
  
  const [formData, setFormData] = useState({
    employee_id: service?.employee_id || '',
    employee_plan_id: service?.employee_plan_id || '',
    dependent_id: service?.dependent_id || '',
    tipo_servico: service?.tipo_servico || 'consulta' as 'consulta' | 'exame' | 'cirurgia' | 'procedimento' | 'internacao' | 'outros',
    descricao: service?.descricao || '',
    data_utilizacao: service?.data_utilizacao ? service.data_utilizacao.split('T')[0] : new Date().toISOString().split('T')[0],
    prestador_nome: service?.prestador_nome || '',
    prestador_cnpj: service?.prestador_cnpj || '',
    valor_total: service?.valor_total || 0,
    nota_fiscal_numero: service?.nota_fiscal_numero || '',
    nota_fiscal_valor: service?.nota_fiscal_valor || 0,
    observacoes: service?.observacoes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Filtrar planos do funcionário selecionado
  const availablePlans = employeePlans.filter(
    (plan) => plan.employee_id === formData.employee_id && plan.status === 'ativo'
  );

  // Filtrar dependentes do plano selecionado (se necessário)
  const selectedPlan = employeePlans.find((p) => p.id === formData.employee_plan_id);
  const availableDependents = selectedPlan?.dependents?.filter((d) => d.status === 'ativo') || [];

  const tiposServico = [
    { value: 'consulta', label: 'Consulta' },
    { value: 'exame', label: 'Exame' },
    { value: 'cirurgia', label: 'Cirurgia' },
    { value: 'procedimento', label: 'Procedimento' },
    { value: 'internacao', label: 'Internação' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Funcionário *</label>
          <Select
            value={formData.employee_id}
            onValueChange={(value) => {
              setFormData({ ...formData, employee_id: value, employee_plan_id: '', dependent_id: '' });
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o funcionário" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Plano Médico *</label>
          <Select
            value={formData.employee_plan_id}
            onValueChange={(value) => {
              setFormData({ ...formData, employee_plan_id: value, dependent_id: '' });
            }}
            required
            disabled={!formData.employee_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o plano" />
            </SelectTrigger>
            <SelectContent>
              {availablePlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.plan?.nome || `Plano ${plan.id.substring(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {availableDependents.length > 0 && (
        <div>
          <label className="text-sm font-medium">Dependente (opcional)</label>
          <Select
            value={formData.dependent_id || ''}
            onValueChange={(value) => setFormData({ ...formData, dependent_id: value || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Titular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Titular</SelectItem>
              {availableDependents.map((dep) => (
                <SelectItem key={dep.id} value={dep.id}>
                  {dep.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Tipo de Serviço *</label>
          <Select
            value={formData.tipo_servico}
            onValueChange={(value) => setFormData({ ...formData, tipo_servico: value as any })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposServico.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Data de Utilização *</label>
          <Input
            type="date"
            value={formData.data_utilizacao}
            onChange={(e) => setFormData({ ...formData, data_utilizacao: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Descrição *</label>
        <Input
          value={formData.descricao}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          placeholder="Ex: Consulta com cardiologista"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Prestador</label>
          <Input
            value={formData.prestador_nome}
            onChange={(e) => setFormData({ ...formData, prestador_nome: e.target.value })}
            placeholder="Nome do prestador"
          />
        </div>

        <div>
          <label className="text-sm font-medium">CNPJ do Prestador</label>
          <Input
            value={formData.prestador_cnpj}
            onChange={(e) => setFormData({ ...formData, prestador_cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Valor Total *</label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor_total}
            onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Nº Nota Fiscal</label>
          <Input
            value={formData.nota_fiscal_numero}
            onChange={(e) => setFormData({ ...formData, nota_fiscal_numero: e.target.value })}
            placeholder="Número da nota fiscal"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Valor Nota Fiscal</label>
          <Input
            type="number"
            step="0.01"
            value={formData.nota_fiscal_valor}
            onChange={(e) => setFormData({ ...formData, nota_fiscal_valor: parseFloat(e.target.value) || 0 })}
          />
        </div>
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {service ? 'Atualizar' : 'Registrar'} Serviço
        </Button>
      </div>
    </form>
  );
});

MedicalServiceForm.displayName = 'MedicalServiceForm';

export default function MedicalServicesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    status?: 'pendente' | 'pago' | 'cancelado';
    tipoServico?: string;
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<MedicalServiceUsage | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  // Query de serviços médicos
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['medical-services', selectedCompany?.id, filters],
    queryFn: () => DeductionsService.listMedicalServices(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => DeductionsService.createMedicalService(selectedCompany?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-services'] });
      toast.success('Serviço médico registrado com sucesso');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar serviço: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      DeductionsService.updateMedicalService(id, selectedCompany?.id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-services'] });
      toast.success('Serviço médico atualizado com sucesso');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar serviço: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => DeductionsService.deleteMedicalService(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-services'] });
      toast.success('Serviço médico removido com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover serviço: ' + error.message);
    },
  });

  // Handlers
  const handleCreate = () => {
    setSelectedService(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (service: MedicalServiceUsage) => {
    setSelectedService(service);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (service: MedicalServiceUsage) => {
    setSelectedService(service);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (service: MedicalServiceUsage) => {
    if (window.confirm(`Tem certeza que deseja excluir este serviço médico?`)) {
      await deleteMutation.mutateAsync(service.id);
    }
  };

  const handleModalSubmit = async (data: any) => {
    if (modalMode === 'create') {
      await createMutation.mutateAsync(data);
    } else if (modalMode === 'edit' && selectedService) {
      await updateMutation.mutateAsync({ id: selectedService.id, data });
    }
  };

  const handleCreateDeduction = async (service: MedicalServiceUsage) => {
    if (!selectedCompany?.id) return;
    
    const currentDate = new Date();
    try {
      const deductionId = await DeductionsService.createFromMedicalService(
        service.id,
        selectedCompany.id,
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );

      if (deductionId) {
        toast.success('Dedução criada com sucesso');
        queryClient.invalidateQueries({ queryKey: ['medical-services'] });
        queryClient.invalidateQueries({ queryKey: ['deductions'] });
      }
    } catch (error: any) {
      toast.error('Erro ao criar dedução: ' + error.message);
    }
  };

  // Filtrar dados
  const filteredServices = services.filter((service) => {
    if (searchTerm && !service.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.status && service.status !== filters.status) {
      return false;
    }
    if (filters.tipoServico && service.tipo_servico !== filters.tipoServico) {
      return false;
    }
    return true;
  });

  // Colunas da tabela
  const columns = [
    {
      key: 'data',
      header: 'Data',
      render: (service: MedicalServiceUsage) => (
        <div className="text-sm">
          {formatDate(service.data_utilizacao)}
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (service: MedicalServiceUsage) => {
        const tipos: Record<string, string> = {
          consulta: 'Consulta',
          exame: 'Exame',
          cirurgia: 'Cirurgia',
          procedimento: 'Procedimento',
          internacao: 'Internação',
          outros: 'Outros',
        };
        return <Badge variant="outline">{tipos[service.tipo_servico] || service.tipo_servico}</Badge>;
      },
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (service: MedicalServiceUsage) => (
        <div>
          <div className="font-medium">{service.descricao}</div>
          {service.prestador_nome && (
            <div className="text-sm text-muted-foreground">{service.prestador_nome}</div>
          )}
        </div>
      ),
    },
    {
      key: 'valor',
      header: 'Valor Total',
      render: (service: MedicalServiceUsage) => (
        <div className="font-medium">{formatCurrency(service.valor_total)}</div>
      ),
    },
    {
      key: 'coparticipacao',
      header: 'Coparticipação',
      render: (service: MedicalServiceUsage) => (
        <div>
          {service.valor_coparticipacao > 0 ? (
            <>
              <div className="font-medium text-red-600">
                {formatCurrency(service.valor_coparticipacao)}
              </div>
              {service.percentual_aplicado && (
                <div className="text-xs text-muted-foreground">
                  {service.percentual_aplicado}%
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">-</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (service: MedicalServiceUsage) => {
        const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          pendente: 'outline',
          pago: 'default',
          cancelado: 'secondary',
        };
        return (
          <Badge variant={statusColors[service.status] || 'outline'}>
            {service.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (service: MedicalServiceUsage) => (
        <div className="flex items-center gap-2">
          <TableActions
            onView={() => handleView(service)}
            onEdit={() => handleEdit(service)}
            onDelete={() => handleDelete(service)}
          />
          {service.status === 'pendente' && service.valor_coparticipacao > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCreateDeduction(service)}
              title="Criar dedução na folha"
            >
              <Calculator className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">Erro ao carregar serviços médicos: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Serviços Médicos</h1>
          <p className="text-muted-foreground">
            Registre consultas, exames e cirurgias para cálculo de coparticipação
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Registrar Serviço
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
          value={filters.tipoServico || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, tipoServico: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="consulta">Consulta</SelectItem>
            <SelectItem value="exame">Exame</SelectItem>
            <SelectItem value="cirurgia">Cirurgia</SelectItem>
            <SelectItem value="procedimento">Procedimento</SelectItem>
            <SelectItem value="internacao">Internação</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value === 'all' ? undefined : (value as any) })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum serviço médico encontrado
        </div>
      ) : (
        <SimpleDataTable
          data={filteredServices}
          columns={columns}
        />
      )}

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create'
            ? 'Registrar Serviço Médico'
            : modalMode === 'edit'
            ? 'Editar Serviço Médico'
            : 'Visualizar Serviço Médico'
        }
        showFooter={false}
      >
        <MedicalServiceForm
          service={selectedService}
          onSubmit={handleModalSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}

