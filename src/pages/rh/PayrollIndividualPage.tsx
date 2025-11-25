import React, { useState, useMemo } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  User,
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { PayrollForm } from '@/components/rh/PayrollForm';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Payroll, Employee, PayrollEvent } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { RequireEntity } from '@/components/RequireAuth';
import { toast } from 'sonner';
import { generatePayslipPDF, generateBatchPayslips, downloadPayslip } from '@/services/rh/payslipService';
import { FinancialIntegrationService } from '@/services/rh/financialIntegrationService';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// COMPONENTE PRINCIPAL - FOLHAS INDIVIDUAIS
// =====================================================

export default function PayrollIndividualPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [activeTab, setActiveTab] = useState('list');

  // Hooks para dados
  const { data: employeesData } = useRHData<Employee>('employees', selectedCompany?.id || '');
  const { data: payrollsData, isLoading, refetch } = useRHData<Payroll>('payroll', selectedCompany?.id || '', {
    ...filters,
    employee_id: selectedEmployeeId || undefined,
    mes_referencia: monthFilter,
    ano_referencia: yearFilter
  });
  const { data: payrollEventsData, refetch: refetchEvents } = useRHData<PayrollEvent>('payroll_events', selectedCompany?.id || '', {
    payroll_id: selectedPayroll?.id || undefined
  });

  // Hooks para mutações
  const createPayroll = useCreateEntity<Payroll>('rh', 'payroll', selectedCompany?.id || '');
  const updatePayroll = useUpdateEntity<Payroll>('rh', 'payroll', selectedCompany?.id || '');
  const deletePayroll = useDeleteEntity('rh', 'payroll', selectedCompany?.id || '');

  // Dados processados
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
  const payrolls = Array.isArray(payrollsData) ? payrollsData : payrollsData?.data || [];
  const payrollEvents = Array.isArray(payrollEventsData) ? payrollEventsData : payrollEventsData?.data || [];

  // Filtrar folhas por busca
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((payroll: Payroll) => {
      const matchesSearch = !searchTerm || 
        payroll.employee?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payroll.employee?.matricula?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [payrolls, searchTerm]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleEmployeeFilter = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setFilters(prev => ({ ...prev, employee_id: employeeId || undefined }));
  };

  const handleMonthFilter = (month: string) => {
    setMonthFilter(parseInt(month));
    setFilters(prev => ({ ...prev, mes_referencia: parseInt(month) }));
  };

  const handleYearFilter = (year: string) => {
    setYearFilter(parseInt(year));
    setFilters(prev => ({ ...prev, ano_referencia: parseInt(year) }));
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
    // Atualizar eventos quando visualizar
    setTimeout(() => refetchEvents(), 100);
  };

  const handleDelete = async (payroll: Payroll) => {
    if (window.confirm(`Tem certeza que deseja excluir a folha de ${payroll.employee?.nome || 'este funcionário'}?`)) {
      try {
        await deletePayroll.mutateAsync(payroll.id);
        toast.success('Folha excluída com sucesso');
        refetch();
      } catch (error) {
        console.error('Erro ao excluir folha:', error);
        toast.error('Erro ao excluir folha');
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
      refetch();
    } catch (error) {
      console.error('Erro ao salvar folha:', error);
      toast.error('Erro ao salvar folha');
    }
  };

  const handleDownloadPayslip = async (payroll: Payroll) => {
    try {
      toast.loading('Gerando contracheque...');
      
      const employee = employees.find((emp: Employee) => emp.id === payroll.employee_id);
      if (!employee) {
        toast.error('Funcionário não encontrado');
        return;
      }

      const events = payrollEvents.filter((event: PayrollEvent) => event.payroll_id === payroll.id);
      
      const blob = await generatePayslipPDF({
        payroll,
        employee,
        events,
        company: selectedCompany ? {
          name: selectedCompany.nome || 'Empresa',
          cnpj: selectedCompany.cnpj,
          address: selectedCompany.endereco
        } : undefined
      });

      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[payroll.mes_referencia - 1];
      const filename = `Contracheque_${employee.nome}_${monthName}_${payroll.ano_referencia}.html`;
      
      downloadPayslip(blob, filename);
      toast.dismiss();
      toast.success('Contracheque gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar contracheque:', error);
      toast.dismiss();
      toast.error('Erro ao gerar contracheque');
    }
  };

  const handleDownloadAllPayslips = async () => {
    try {
      if (filteredPayrolls.length === 0) {
        toast.error('Nenhuma folha para gerar');
        return;
      }

      toast.loading(`Gerando ${filteredPayrolls.length} contracheques...`);

      // Criar mapas para facilitar busca
      const employeesMap = new Map<string, Employee>();
      employees.forEach((emp: Employee) => {
        employeesMap.set(emp.id, emp);
      });

      const eventsMap = new Map<string, PayrollEvent[]>();
      payrollEvents.forEach((event: PayrollEvent) => {
        const existing = eventsMap.get(event.payroll_id) || [];
        existing.push(event);
        eventsMap.set(event.payroll_id, existing);
      });

      // Gerar todos os PDFs
      const blobs = await generateBatchPayslips(
        filteredPayrolls,
        eventsMap,
        employeesMap,
        selectedCompany ? {
          name: selectedCompany.nome || 'Empresa',
          cnpj: selectedCompany.cnpj,
          address: selectedCompany.endereco
        } : undefined
      );

      // Fazer download de cada um
      blobs.forEach((blob, index) => {
        const payroll = filteredPayrolls[index];
        const employee = employeesMap.get(payroll.employee_id);
        if (employee) {
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          const monthName = monthNames[payroll.mes_referencia - 1];
          const filename = `Contracheque_${employee.nome}_${monthName}_${payroll.ano_referencia}.html`;
          
          // Adicionar delay para evitar bloqueio do navegador
          setTimeout(() => {
            downloadPayslip(blob, filename);
          }, index * 200);
        }
      });

      toast.dismiss();
      toast.success(`${blobs.length} contracheques gerados com sucesso`);
    } catch (error) {
      console.error('Erro ao gerar contracheques:', error);
      toast.dismiss();
      toast.error('Erro ao gerar contracheques');
    }
  };

  // Colunas da tabela
  const columns = [
    {
      key: 'employee',
      header: 'Funcionário',
      render: (payroll: Payroll) => (
        <div>
          <div className="font-medium">{payroll.employee?.nome || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">
            {payroll.employee?.matricula || 'Sem matrícula'}
          </div>
        </div>
      )
    },
    {
      key: 'period',
      header: 'Período',
      render: (payroll: Payroll) => (
        <div className="font-medium">
          {String(payroll.mes_referencia).padStart(2, '0')}/{payroll.ano_referencia}
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
      key: 'actions',
      header: 'Ações',
      render: (payroll: Payroll) => (
        <TableActions
          actions={[
            {
              label: 'Visualizar',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => {
                handleView(payroll);
                setActiveTab('details');
              }
            },
            {
              label: 'Editar',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(payroll)
            },
            {
              label: 'Download',
              icon: <Download className="h-4 w-4" />,
              onClick: () => handleDownloadPayslip(payroll)
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

  return (
    <RequireEntity entityName="payroll" action="read">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Folhas Individuais</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie folhas de pagamento por funcionário
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadAllPayslips}
              disabled={filteredPayrolls.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Todos
            </Button>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Nova Folha
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lista de Folhas
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2" disabled={!selectedPayroll}>
              <Eye className="h-4 w-4" />
              Detalhes
            </TabsTrigger>
          </TabsList>

          {/* Tab: Lista de Folhas */}
          <TabsContent value="list" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex-1">
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
                    value={selectedEmployeeId || 'all'}
                    onValueChange={handleEmployeeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os funcionários</SelectItem>
                      {employees
                        .filter((emp: Employee) => emp.status === 'ativo')
                        .map((employee: Employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.nome} - {employee.matricula || 'Sem matrícula'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={monthFilter.toString()}
                    onValueChange={handleMonthFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={yearFilter.toString()}
                    onValueChange={handleYearFilter}
                  >
                    <SelectTrigger>
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
              </CardContent>
            </Card>

            {/* Tabela */}
            <SimpleDataTable
              data={filteredPayrolls}
              columns={columns}
              loading={isLoading}
              onAdd={handleCreate}
              searchPlaceholder="Pesquisar folha de pagamento..."
              emptyMessage="Nenhum registro de folha encontrado"
              className="mt-6"
            />
          </TabsContent>

          {/* Tab: Detalhes */}
          <TabsContent value="details" className="space-y-4">
            {selectedPayroll ? (
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedPayroll(null);
                    setActiveTab('list');
                  }}
                  className="mb-4"
                >
                  Voltar para Lista
                </Button>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Detalhes da Folha - {selectedPayroll.employee?.nome}
                  </CardTitle>
                  <CardDescription>
                    Período: {String(selectedPayroll.mes_referencia).padStart(2, '0')}/{selectedPayroll.ano_referencia}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Informações Gerais */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Salário Base</label>
                      <p className="text-lg font-bold">R$ {selectedPayroll.salario_base?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Horas Trabalhadas</label>
                      <p className="text-lg font-bold">{selectedPayroll.horas_trabalhadas?.toFixed(1) || '0.0'}h</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Vencimentos</label>
                      <p className="text-lg font-bold text-green-600">R$ {selectedPayroll.total_vencimentos?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Descontos</label>
                      <p className="text-lg font-bold text-red-600">R$ {selectedPayroll.total_descontos?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  {/* Salário Líquido */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <label className="text-lg font-medium">Salário Líquido</label>
                      <p className="text-2xl font-bold text-green-700">
                        R$ {selectedPayroll.salario_liquido?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  {/* Eventos da Folha */}
                  {payrollEvents.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-4">Eventos da Folha</h3>
                      <div className="space-y-2">
                        {payrollEvents.map((event: PayrollEvent) => (
                          <div key={event.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{event.descricao_rubrica}</p>
                              <p className="text-sm text-muted-foreground">
                                {event.codigo_rubrica} - {event.tipo_rubrica}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${event.tipo_rubrica === 'provento' ? 'text-green-600' : 'text-red-600'}`}>
                                {event.tipo_rubrica === 'provento' ? '+' : '-'}R$ {event.valor_total?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2 border-t pt-4">
                    <Button onClick={() => {
                      handleEdit(selectedPayroll);
                      setActiveTab('list');
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Folha
                    </Button>
                    <Button variant="outline" onClick={() => handleDownloadPayslip(selectedPayroll)}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Contracheque
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Selecione uma folha para ver os detalhes</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

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
    </RequireEntity>
  );
}

