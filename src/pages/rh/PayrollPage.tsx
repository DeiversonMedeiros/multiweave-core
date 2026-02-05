import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Download,
  Eye,
  FileText,
  RotateCcw,
  Trash2,
  Calculator,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Edit,
  CheckSquare
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { TableActions } from '@/components/rh/TableActions';
import { RequirePage } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  usePayroll, 
  useDeletePayroll,
  usePayrollStats,
  usePayrollById
} from '@/hooks/rh/usePayroll';
import { usePayrollCalculation, useCalculationProgress, usePayrollEvents } from '@/hooks/rh/usePayrollCalculation';
import { useActiveRubricas } from '@/hooks/rh/useRubricas';
import { Payroll, PayrollEvent, Rubrica } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { formatCurrency } from '@/services/rh/payrollCalculationService';
import { generatePayslipPDF, downloadPayslip } from '@/services/rh/payslipService';
import { EntityService } from '@/services/generic/entityService';
import { Employee } from '@/integrations/supabase/rh-types';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// =====================================================
// COMPONENTE PRINCIPAL - FOLHA DE PAGAMENTO UNIFICADA
// =====================================================

export default function PayrollPage() {
  const { selectedCompany } = useCompany();
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [processoAtivo, setProcessoAtivo] = useState<string | undefined>();
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [payrollToDelete, setPayrollToDelete] = useState<Payroll | null>(null);

  // Hooks
  const { data: payrolls = [], isLoading, refetch } = usePayroll({
    month: monthFilter,
    year: yearFilter,
    status: statusFilter || undefined,
  });
  const { data: stats } = usePayrollStats(monthFilter, yearFilter);
  const deletePayrollMutation = useDeletePayroll();
  const calculatePayrollMutation = usePayrollCalculation();
  const { progresso, status, isProcessing, isCompleted, hasError, tempoExecucao, logs: progressLogs } = useCalculationProgress(processoAtivo);

  // Filtrar dados
  const filteredPayrolls = payrolls.filter(payroll => {
    const matchesSearch = !searchTerm || 
      payroll.employee?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleMonthFilter = (value: string) => {
    setMonthFilter(parseInt(value));
  };

  const handleYearFilter = (value: string) => {
    setYearFilter(parseInt(value));
  };

  // Gerar folha de pagamento
  const handleGeneratePayroll = async () => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    try {
      toast.loading('Gerando folha de pagamento...', { id: 'generate-payroll' });

      const result = await calculatePayrollMutation.mutateAsync({
        companyId: selectedCompany.id,
        mesReferencia: monthFilter,
        anoReferencia: yearFilter,
        tipoProcesso: 'folha_mensal',
        usuarioNome: 'Sistema' // TODO: Pegar do contexto de usuário
      });

      // Usar o processoId retornado pelo backend (UUID válido)
      if (result?.processoId) {
        setProcessoAtivo(result.processoId);
      }

      toast.success('Folha de pagamento gerada com sucesso!', { id: 'generate-payroll' });
      
      // Aguardar um pouco para garantir que os dados foram salvos
      setTimeout(() => {
        refetch();
        setProcessoAtivo(undefined);
      }, 1000);
    } catch (error) {
      console.error('Erro ao gerar folha:', error);
      toast.error('Erro ao gerar folha de pagamento', { id: 'generate-payroll' });
      setProcessoAtivo(undefined);
    }
  };

  // Recalcular folha individual
  const handleRecalculatePayroll = async (payroll: Payroll) => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    if (!confirm(`Recalcular folha de ${payroll.employee?.nome} para ${payroll.mes_referencia}/${payroll.ano_referencia}?`)) {
      return;
    }

    try {
      toast.loading('Recalculando folha...', { id: 'recalculate-payroll' });

      await calculatePayrollMutation.mutateAsync({
        companyId: selectedCompany.id,
        mesReferencia: payroll.mes_referencia || monthFilter,
        anoReferencia: payroll.ano_referencia || yearFilter,
        tipoProcesso: 'recalculo',
        funcionariosIds: [payroll.employee_id],
        usuarioNome: 'Sistema'
      });

      toast.success('Folha recalculada com sucesso!', { id: 'recalculate-payroll' });
      
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      console.error('Erro ao recalcular folha:', error);
      toast.error('Erro ao recalcular folha', { id: 'recalculate-payroll' });
    }
  };

  // Visualizar folha
  const handleView = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setIsViewDialogOpen(true);
  };

  // Ver em PDF
  const handleViewPDF = async (payroll: Payroll) => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    try {
      toast.loading('Gerando contracheque em PDF...', { id: 'generate-pdf' });

      // Buscar dados completos da empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', selectedCompany.id)
        .single();
      
      if (companyError) {
        console.warn('Erro ao buscar dados da empresa:', companyError);
      }

      // Buscar dados do funcionário
      const employee = await EntityService.getById<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: selectedCompany.id,
        id: payroll.employee_id
      });

      if (!employee) {
        toast.error('Funcionário não encontrado', { id: 'generate-pdf' });
        return;
      }

      // Buscar cargo do funcionário se houver cargo_id
      let cargoData = null;
      if (employee.cargo_id) {
        cargoData = await EntityService.getById<any>({
          schema: 'rh',
          table: 'positions',
          id: employee.cargo_id,
          companyId: selectedCompany.id
        });
      }

      // Buscar departamento do funcionário se houver departamento_id
      let departamentoData = null;
      if (employee.departamento_id) {
        departamentoData = await EntityService.getById<any>({
          schema: 'rh',
          table: 'units',
          id: employee.departamento_id,
          companyId: selectedCompany.id
        });
      }

      // Buscar eventos da folha
      const { getPayrollEvents } = await import('@/services/rh/payrollCalculationService');
      const eventsResult = await getPayrollEvents(selectedCompany.id, payroll.id);
      const events = eventsResult.data || [];

      // Gerar PDF
      const blob = await generatePayslipPDF({
        payroll,
        employee,
        events,
        company: companyData ? {
          id: companyData.id,
          razao_social: companyData.razao_social,
          nome_fantasia: companyData.nome_fantasia,
          cnpj: companyData.cnpj,
          inscricao_estadual: companyData.inscricao_estadual,
          logo_url: companyData.logo_url,
          endereco: companyData.endereco,
          contato: companyData.contato,
          numero_empresa: companyData.numero_empresa
        } : undefined,
        employeeData: {
          id: employee.id,
          nome: employee.nome,
          matricula: employee.matricula,
          cpf: employee.cpf,
          estado: employee.estado,
          data_admissao: employee.data_admissao,
          pis_pasep: employee.pis_pasep,
          cargo: cargoData ? { nome: cargoData.nome } : null,
          departamento: departamentoData ? { nome: departamentoData.nome } : null
        }
      });

      // Fazer download
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[(payroll.mes_referencia || 1) - 1];
      const filename = `Contracheque_${employee.nome}_${monthName}_${payroll.ano_referencia}.html`;
      
      downloadPayslip(blob, filename);
      
      toast.success('Contracheque gerado com sucesso!', { id: 'generate-pdf' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar contracheque em PDF', { id: 'generate-pdf' });
    }
  };

  // Excluir folha
  const handleDelete = (payroll: Payroll) => {
    setPayrollToDelete(payroll);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!payrollToDelete) return;

    try {
      await deletePayrollMutation.mutateAsync(payrollToDelete.id);
      toast.success('Folha excluída com sucesso');
      refetch();
      setIsDeleteDialogOpen(false);
      setPayrollToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir folha:', error);
      toast.error('Erro ao excluir folha');
    }
  };

  // Editar folha
  const handleEdit = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setIsEditDialogOpen(true);
  };

  // Validar folha (torna visível para colaborador e cria conta a pagar)
  const handleValidatePayroll = async (payroll: Payroll) => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    if (!confirm(`Validar folha de pagamento de ${payroll.employee?.nome} para ${payroll.mes_referencia}/${payroll.ano_referencia}?\n\nAo validar, a folha ficará visível para o colaborador e será criada uma conta a pagar.`)) {
      return;
    }

    try {
      toast.loading('Validando folha de pagamento...', { id: 'validate-payroll' });

      // Atualizar status para 'validado'
      await EntityService.update({
        schema: 'rh',
        table: 'payroll',
        companyId: selectedCompany.id,
        id: payroll.id,
        data: {
          status: 'validado',
          updated_at: new Date().toISOString()
        }
      });

      // Criar conta a pagar
      try {
        const { FinancialIntegrationService } = await import('@/services/rh/financialIntegrationService');
        const integrationService = FinancialIntegrationService.getInstance();
        const config = await integrationService.getIntegrationConfig(selectedCompany.id);
        
        if (config.autoCreateAP && payroll.employee) {
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          const monthName = monthNames[(payroll.mes_referencia || 1) - 1];
          const period = `${monthName}/${payroll.ano_referencia}`;
          
          // Calcular data de vencimento
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (config.defaultDueDate || 5));
          
          await integrationService.createAccountPayable(
            selectedCompany.id,
            {
              payrollId: payroll.id,
              employeeId: payroll.employee_id,
              employeeName: payroll.employee.nome || 'Funcionário',
              netSalary: payroll.salario_liquido || 0,
              period: period,
              dueDate: dueDate.toISOString().split('T')[0],
              costCenter: payroll.employee.cost_center_id || undefined
            },
            config
          );
        }
      } catch (apError) {
        console.error('Erro ao criar conta a pagar:', apError);
        // Não falhar a validação se a conta a pagar falhar
        toast.warning('Folha validada, mas houve erro ao criar conta a pagar', { id: 'validate-payroll' });
      }

      toast.success('Folha validada com sucesso!', { id: 'validate-payroll' });
      refetch();
    } catch (error) {
      console.error('Erro ao validar folha:', error);
      toast.error('Erro ao validar folha de pagamento', { id: 'validate-payroll' });
    }
  };

  const handleExport = () => {
    // TODO: Implementar exportação
    toast.info('Funcionalidade de exportação em desenvolvimento');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'iniciado':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'processando':
        return <RotateCcw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'concluido':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Configuração das colunas da tabela (formato SimpleDataTable)
  const columns = [
    {
      key: 'employee',
      header: 'Funcionário',
      render: (payroll: Payroll) => (
        <div>
          <div className="font-medium">{payroll.employee?.nome}</div>
          <div className="text-sm text-muted-foreground">
            {payroll.employee?.matricula || 'Sem matrícula'}
          </div>
        </div>
      ),
    },
    {
      key: 'salario_base',
      header: 'Salário Base',
      render: (payroll: Payroll) => (
        <div className="text-sm font-mono">
          {formatCurrency(payroll.salario_base || 0)}
        </div>
      ),
    },
    {
      key: 'total_vencimentos',
      header: 'Total Vencimentos',
      render: (payroll: Payroll) => (
        <div className="text-sm font-mono text-green-600">
          {formatCurrency(payroll.total_vencimentos || 0)}
        </div>
      ),
    },
    {
      key: 'total_descontos',
      header: 'Total Descontos',
      render: (payroll: Payroll) => (
        <div className="text-sm font-mono text-red-600">
          {formatCurrency(payroll.total_descontos || 0)}
        </div>
      ),
    },
    {
      key: 'salario_liquido',
      header: 'Salário Líquido',
      render: (payroll: Payroll) => (
        <div className="text-sm font-mono font-bold">
          {formatCurrency(payroll.salario_liquido || 0)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (payroll: Payroll) => {
        const status = payroll.status;
        const getStatusColor = () => {
          switch (status) {
            case 'pendente':
              return 'secondary';
            case 'em_revisao':
              return 'default';
            case 'processado':
              return 'default';
            case 'validado':
              return 'outline';
            case 'pago':
              return 'outline';
            case 'cancelado':
              return 'destructive';
            default:
              return 'secondary';
          }
        };

        const getStatusLabel = () => {
          switch (status) {
            case 'pendente':
              return 'Pendente';
            case 'em_revisao':
              return 'Em Revisão';
            case 'processado':
              return 'Processado';
            case 'validado':
              return 'Validado';
            case 'pago':
              return 'Pago';
            case 'cancelado':
              return 'Cancelado';
            default:
              return status;
          }
        };

        return (
          <Badge variant={getStatusColor() as any}>
            {getStatusLabel()}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (payroll: Payroll) => {
        const canEdit = payroll.status === 'em_revisao' || payroll.status === 'processado';
        const canValidate = payroll.status === 'em_revisao' || payroll.status === 'processado';
        
        const actions = [
          {
            label: 'Ver',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleView(payroll),
            variant: 'ghost' as const,
          },
          {
            label: 'Ver em PDF',
            icon: <FileText className="h-4 w-4" />,
            onClick: () => handleViewPDF(payroll),
            variant: 'ghost' as const,
          },
          ...(canEdit ? [{
            label: 'Editar',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(payroll),
            variant: 'ghost' as const,
          }] : []),
          ...(canValidate ? [{
            label: 'Validar',
            icon: <CheckSquare className="h-4 w-4" />,
            onClick: () => handleValidatePayroll(payroll),
            variant: 'default' as const,
          }] : []),
          {
            label: 'Recalcular Folha',
            icon: <RotateCcw className="h-4 w-4" />,
            onClick: () => handleRecalculatePayroll(payroll),
            variant: 'ghost' as const,
          },
          {
            label: 'Excluir Folha',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDelete(payroll),
            variant: 'destructive' as const,
          },
        ];
        
        return (
          <TableActions
            item={payroll}
            actions={actions}
          />
        );
      },
    },
  ];

  return (
    <RequirePage pagePath="/rh/payroll*" action="read">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
            <p className="text-muted-foreground">
              Gere e gerencie a folha de pagamento dos funcionários
            </p>
          </div>
        </div>

        {/* Card de Geração de Folha */}
        <Card>
          <CardHeader>
            <CardTitle>Gerar Folha de Pagamento</CardTitle>
            <CardDescription>
              Selecione o mês e ano e clique em "Gerar Folha" para calcular a folha de pagamento de todos os funcionários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês de Referência</label>
                <Select 
                  value={monthFilter.toString()} 
                  onValueChange={handleMonthFilter}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ano de Referência</label>
                <Select 
                  value={yearFilter.toString()} 
                  onValueChange={handleYearFilter}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <Button
                  onClick={handleGeneratePayroll}
                  disabled={isProcessing || !selectedCompany?.id}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Gerando...' : 'Gerar Folha'}
                </Button>
              </div>
            </div>

            {/* Progresso do Cálculo */}
            {isProcessing && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progresso</span>
                  <span className="text-sm text-muted-foreground">{progresso}%</span>
                </div>
                <Progress value={progresso} className="w-full" />
                
                {tempoExecucao && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Tempo de execução: {Math.floor(tempoExecucao / 60)}m {tempoExecucao % 60}s
                  </div>
                )}

                {progressLogs.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                    <div className="text-xs font-mono space-y-1">
                      {progressLogs.slice(-5).map((log, index) => (
                        <div key={index} className="text-gray-700">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.total_employees || 0}</div>
                  <div className="text-sm text-muted-foreground">Funcionários</div>
                </div>
              </div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    R$ {(stats.total_net_salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Líquido</div>
                </div>
              </div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">
                    R$ {(stats.total_taxes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-muted-foreground">Impostos</div>
                </div>
              </div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.processed || 0}</div>
                  <div className="text-sm text-muted-foreground">Processados</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por funcionário..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <Select
            value={statusFilter}
            onValueChange={handleStatusFilter}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_revisao">Em Revisão</SelectItem>
              <SelectItem value="processado">Processado</SelectItem>
              <SelectItem value="validado">Validado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Tabela de Folhas */}
        <SimpleDataTable
          data={filteredPayrolls}
          columns={columns}
          loading={isLoading}
          searchable={true}
          pagination={true}
          onExport={handleExport}
          searchPlaceholder="Buscar folhas..."
          emptyMessage="Nenhuma folha de pagamento encontrada. Clique em 'Gerar Folha' para criar."
          pageSize={15}
        />

        {/* Dialog de Visualização de Detalhes */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes da Folha de Pagamento
              </DialogTitle>
              <DialogDescription>
                Visualize os detalhes completos da folha de pagamento
              </DialogDescription>
            </DialogHeader>
            {selectedPayroll && (
              <PayrollDetailsView payroll={selectedPayroll} />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição de Folha */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Folha de Pagamento
              </DialogTitle>
              <DialogDescription>
                Edite os valores da folha de pagamento antes de validar
              </DialogDescription>
            </DialogHeader>
            {selectedPayroll && (
              <PayrollEditForm 
                payroll={selectedPayroll} 
                onSave={async (updatedData) => {
                  try {
                    toast.loading('Salvando alterações...', { id: 'save-payroll' });

                    // Atualizar folha
                    await EntityService.update({
                      schema: 'rh',
                      table: 'payroll',
                      companyId: selectedCompany?.id || '',
                      id: selectedPayroll.id,
                      data: {
                        salario_base: updatedData.salario_base,
                        horas_trabalhadas: updatedData.horas_trabalhadas,
                        horas_extras: updatedData.horas_extras,
                        valor_horas_extras: updatedData.valor_horas_extras,
                        total_vencimentos: updatedData.total_vencimentos,
                        total_descontos: updatedData.total_descontos,
                        salario_liquido: updatedData.salario_liquido,
                        observacoes: updatedData.observacoes,
                        updated_at: new Date().toISOString()
                      }
                    });

                    // Atualizar ou criar eventos/rúbricas
                    if (updatedData.events && updatedData.events.length > 0) {
                      for (const event of updatedData.events) {
                        try {
                          // Se é um evento virtual (não existe no banco), criar
                          if (event.id.startsWith('virtual-')) {
                            const { createPayrollEvent } = await import('@/services/rh/payrollCalculationService');
                            await createPayrollEvent(selectedCompany?.id || '', {
                              payroll_id: event.payroll_id,
                              employee_id: event.employee_id,
                              company_id: event.company_id,
                              rubrica_id: event.rubrica_id,
                              codigo_rubrica: event.codigo_rubrica,
                              descricao_rubrica: event.descricao_rubrica,
                              tipo_rubrica: event.tipo_rubrica,
                              quantidade: event.quantidade,
                              valor_unitario: event.valor_unitario,
                              valor_total: event.valor_total,
                              percentual: event.percentual,
                              mes_referencia: event.mes_referencia,
                              ano_referencia: event.ano_referencia,
                              calculado_automaticamente: event.calculado_automaticamente,
                              origem_evento: event.origem_evento,
                              observacoes: event.observacoes
                            });
                          } else {
                            // Atualizar evento existente
                            await EntityService.update({
                              schema: 'rh',
                              table: 'payroll_events',
                              companyId: selectedCompany?.id || '',
                              id: event.id,
                              data: {
                                quantidade: event.quantidade,
                                valor_unitario: event.valor_unitario,
                                valor_total: event.valor_total,
                                updated_at: new Date().toISOString()
                              }
                            });
                          }
                        } catch (eventError) {
                          console.error(`Erro ao salvar evento ${event.id}:`, eventError);
                        }
                      }
                    }

                    toast.success('Folha atualizada com sucesso!', { id: 'save-payroll' });
                    setIsEditDialogOpen(false);
                    refetch();
                  } catch (error) {
                    console.error('Erro ao atualizar folha:', error);
                    toast.error('Erro ao atualizar folha de pagamento', { id: 'save-payroll' });
                  }
                }}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* AlertDialog de Confirmação de Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a folha de pagamento de{' '}
                <strong>{payrollToDelete?.employee?.nome}</strong> referente ao período{' '}
                <strong>
                  {payrollToDelete?.mes_referencia}/{payrollToDelete?.ano_referencia}
                </strong>?
                <br />
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RequirePage>
  );
}

// =====================================================
// COMPONENTE DE VISUALIZAÇÃO DE DETALHES
// =====================================================

function PayrollDetailsView({ payroll }: { payroll: Payroll }) {
  const { selectedCompany } = useCompany();
  const { data: eventsData, isLoading: isLoadingEvents } = usePayrollEvents(payroll.id);
  const events = eventsData?.data || [];

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = monthNames[(payroll.mes_referencia || 1) - 1];

  const proventos = events.filter(e => e.tipo_rubrica === 'provento');
  const descontos = events.filter(e => e.tipo_rubrica === 'desconto');

  return (
    <div className="space-y-6">
      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Funcionário</p>
              <p className="font-medium">{payroll.employee?.nome || 'N/A'}</p>
              {payroll.employee?.matricula && (
                <p className="text-xs text-muted-foreground">Matrícula: {payroll.employee.matricula}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium">{monthName}/{payroll.ano_referencia}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={
                payroll.status === 'pago' ? 'default' :
                payroll.status === 'processado' ? 'outline' :
                payroll.status === 'cancelado' ? 'destructive' : 'secondary'
              }>
                {payroll.status === 'pago' ? 'Pago' :
                 payroll.status === 'processado' ? 'Processado' :
                 payroll.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
              </Badge>
            </div>
            {payroll.data_pagamento && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Pagamento</p>
                <p className="font-medium">
                  {new Date(payroll.data_pagamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Valores Resumidos */}
      <Card>
        <CardHeader>
          <CardTitle>Valores Resumidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Salário Base</p>
              <p className="text-lg font-bold">{formatCurrency(payroll.salario_base || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vencimentos</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(payroll.total_vencimentos || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Descontos</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(payroll.total_descontos || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salário Líquido</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(payroll.salario_liquido || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horas Trabalhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Horas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
              <p className="text-lg font-medium">{payroll.horas_trabalhadas || 0}h</p>
            </div>
            {payroll.horas_extras && payroll.horas_extras > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Horas Extras</p>
                <p className="text-lg font-medium">{payroll.horas_extras}h</p>
              </div>
            )}
            {payroll.valor_horas_extras && payroll.valor_horas_extras > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Valor Horas Extras</p>
                <p className="text-lg font-medium">{formatCurrency(payroll.valor_horas_extras)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Proventos */}
      {proventos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {proventos.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{event.descricao_rubrica}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: {event.codigo_rubrica}
                      {event.quantidade && event.quantidade !== 1 && ` • Qtd: ${event.quantidade}`}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    {formatCurrency(event.valor_total || 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Descontos */}
      {descontos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Descontos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {descontos.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{event.descricao_rubrica}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: {event.codigo_rubrica}
                      {event.quantidade && event.quantidade !== 1 && ` • Qtd: ${event.quantidade}`}
                    </p>
                  </div>
                  <p className="font-bold text-red-600">
                    {formatCurrency(event.valor_total || 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingEvents && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Carregando eventos...</p>
        </div>
      )}

      {!isLoadingEvents && events.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum evento registrado para esta folha</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =====================================================
// COMPONENTE DE EDIÇÃO DE FOLHA
// =====================================================

function PayrollEditForm({ 
  payroll, 
  onSave, 
  onCancel 
}: { 
  payroll: Payroll; 
  onSave: (data: Partial<Payroll> & { events?: PayrollEvent[] }) => void;
  onCancel: () => void;
}) {
  const { selectedCompany } = useCompany();
  const { data: eventsData, isLoading: isLoadingEvents } = usePayrollEvents(payroll.id);
  const events = eventsData?.data || [];
  const { data: allRubricas, isLoading: isLoadingRubricas } = useActiveRubricas(selectedCompany?.id || '');
  
  const [formData, setFormData] = useState({
    salario_base: payroll.salario_base || 0,
    horas_trabalhadas: payroll.horas_trabalhadas || 0,
    horas_extras: payroll.horas_extras || 0,
    valor_horas_extras: payroll.valor_horas_extras || 0,
    total_vencimentos: payroll.total_vencimentos || 0,
    total_descontos: payroll.total_descontos || 0,
    salario_liquido: payroll.salario_liquido || 0,
    observacoes: payroll.observacoes || '',
  });

  const [eventsDataState, setEventsDataState] = useState<PayrollEvent[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Criar eventos virtuais para rúbricas que não existem na folha
  const createVirtualEvents = (rubricas: Rubrica[], existingEvents: PayrollEvent[]): PayrollEvent[] => {
    const existingRubricaIds = new Set(existingEvents.map(e => e.rubrica_id));
    const virtualEvents: PayrollEvent[] = [];

    rubricas.forEach(rubrica => {
      if (!existingRubricaIds.has(rubrica.id) && (rubrica.tipo === 'provento' || rubrica.tipo === 'desconto')) {
        virtualEvents.push({
          id: `virtual-${rubrica.id}`,
          payroll_id: payroll.id,
          employee_id: payroll.employee_id,
          company_id: payroll.company_id,
          rubrica_id: rubrica.id,
          codigo_rubrica: rubrica.codigo,
          descricao_rubrica: rubrica.nome,
          tipo_rubrica: rubrica.tipo,
          quantidade: 1,
          valor_unitario: 0,
          valor_total: 0,
          percentual: 0,
          mes_referencia: payroll.mes_referencia,
          ano_referencia: payroll.ano_referencia,
          calculado_automaticamente: false,
          origem_evento: 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    });

    return [...existingEvents, ...virtualEvents];
  };

  // Inicializar eventos quando carregarem
  useEffect(() => {
    if (!isInitialized && events.length >= 0 && allRubricas && allRubricas.length > 0) {
      // Criar eventos completos (existentes + virtuais para rúbricas sem eventos)
      const allEvents = createVirtualEvents(allRubricas, events);
      setEventsDataState(allEvents);
      setIsInitialized(true);
      
      // NÃO recalcular totais na inicialização - usar os valores já salvos na folha
      // Os totais já estão corretos no banco de dados
    }
  }, [events, allRubricas, isInitialized, payroll.id]);

  const recalculateTotals = (data: typeof formData, events: PayrollEvent[]) => {
    // Calcular totais da mesma forma que o sistema original calcula
    // Somar TODOS os proventos e descontos dos eventos
    // O sistema original calcula: total_vencimentos = soma de todos os proventos dos eventos
    // Não usar os campos salario_base e valor_horas_extras separadamente,
    // pois eles podem já estar incluídos nos eventos ou podem ser calculados de forma diferente
    
    const proventos = events
      .filter(e => e.tipo_rubrica === 'provento')
      .reduce((sum, e) => sum + (Number(e.valor_total) || 0), 0);
    
    const descontos = events
      .filter(e => e.tipo_rubrica === 'desconto')
      .reduce((sum, e) => sum + (Number(e.valor_total) || 0), 0);

    // Se não há eventos ou os eventos não somam nada, usar os campos da folha como fallback
    // Caso contrário, usar a soma dos eventos (que é como o sistema original calcula)
    let novoTotalVencimentos: number;
    if (proventos > 0 || events.length > 0) {
      // Usar soma dos eventos (inclui salário base, horas extras e outros proventos)
      novoTotalVencimentos = proventos;
    } else {
      // Fallback: usar campos da folha se não houver eventos
      novoTotalVencimentos = (Number(data.salario_base) || 0) + (Number(data.valor_horas_extras) || 0);
    }
    
    const novoTotalDescontos = descontos;
    const novoSalarioLiquido = novoTotalVencimentos - novoTotalDescontos;

    return {
      total_vencimentos: novoTotalVencimentos,
      total_descontos: novoTotalDescontos,
      salario_liquido: novoSalarioLiquido
    };
  };

  const handleChange = (field: string, value: number | string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Recalcular valor de horas extras se horas extras mudar
      if (field === 'horas_extras') {
        const horasExtras = Number(value) || 0;
        const salarioBase = newData.salario_base;
        const valorHora = salarioBase / 160; // 160h = 1 mês
        const novoValorHorasExtras = horasExtras * valorHora;
        newData.valor_horas_extras = novoValorHorasExtras;
      }

      // Recalcular valor de horas extras se salário base mudar e houver horas extras
      if (field === 'salario_base' && newData.horas_extras > 0) {
        const valorHora = Number(value) / 160;
        newData.valor_horas_extras = newData.horas_extras * valorHora;
      }

      // Recalcular totais quando horas extras, valor de horas extras ou salário base mudar
      if (field === 'horas_extras' || field === 'valor_horas_extras' || field === 'salario_base') {
        const novosTotais = recalculateTotals(newData, eventsDataState);
        newData.total_vencimentos = novosTotais.total_vencimentos;
        newData.total_descontos = novosTotais.total_descontos;
        newData.salario_liquido = novosTotais.salario_liquido;
      }

      // Recalcular salário líquido se necessário
      if (field === 'total_vencimentos' || field === 'total_descontos') {
        const vencimentos = field === 'total_vencimentos' ? Number(value) : newData.total_vencimentos;
        const descontos = field === 'total_descontos' ? Number(value) : newData.total_descontos;
        newData.salario_liquido = vencimentos - descontos;
      }

      return newData;
    });
  };

  const handleEventChange = (eventId: string, field: 'quantidade' | 'valor_unitario' | 'valor_total', value: number) => {
    setEventsDataState(prev => {
      const updatedEvents = prev.map(event => {
        if (event.id === eventId) {
          const updated = { ...event };
          
          if (field === 'quantidade' || field === 'valor_unitario') {
            updated[field] = value;
            // Recalcular valor_total
            updated.valor_total = (updated.quantidade || 1) * (updated.valor_unitario || 0);
          } else {
            updated.valor_total = value;
          }

          return updated;
        }
        return event;
      });

      // Recalcular totais baseado nos eventos atualizados
      const novosTotais = recalculateTotals(formData, updatedEvents);
      
      setFormData(prev => ({
        ...prev,
        total_vencimentos: novosTotais.total_vencimentos,
        total_descontos: novosTotais.total_descontos,
        salario_liquido: novosTotais.salario_liquido
      }));

      return updatedEvents;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Salvar eventos atualizados junto com a folha
    onSave({
      ...formData,
      events: eventsDataState
    });
  };

  const proventos = eventsDataState.filter(e => e.tipo_rubrica === 'provento');
  const descontos = eventsDataState.filter(e => e.tipo_rubrica === 'desconto');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campos Básicos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="salario_base">Salário Base</Label>
          <Input
            id="salario_base"
            type="number"
            step="0.01"
            value={formData.salario_base}
            onChange={(e) => handleChange('salario_base', parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="horas_trabalhadas">Horas Trabalhadas</Label>
          <Input
            id="horas_trabalhadas"
            type="number"
            step="0.01"
            value={formData.horas_trabalhadas}
            onChange={(e) => handleChange('horas_trabalhadas', parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="horas_extras">Horas Extras</Label>
          <Input
            id="horas_extras"
            type="number"
            step="0.01"
            value={formData.horas_extras}
            onChange={(e) => handleChange('horas_extras', parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="valor_horas_extras">Valor Horas Extras</Label>
          <Input
            id="valor_horas_extras"
            type="number"
            step="0.01"
            value={formData.valor_horas_extras}
            onChange={(e) => handleChange('valor_horas_extras', parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="total_vencimentos">Total Vencimentos</Label>
          <Input
            id="total_vencimentos"
            type="number"
            step="0.01"
            value={formData.total_vencimentos}
            onChange={(e) => handleChange('total_vencimentos', parseFloat(e.target.value) || 0)}
            className="font-semibold"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="total_descontos">Total Descontos</Label>
          <Input
            id="total_descontos"
            type="number"
            step="0.01"
            value={formData.total_descontos}
            onChange={(e) => handleChange('total_descontos', parseFloat(e.target.value) || 0)}
            className="font-semibold"
          />
        </div>
        
        <div className="space-y-2 col-span-2">
          <Label htmlFor="salario_liquido">Salário Líquido</Label>
          <Input
            id="salario_liquido"
            type="number"
            step="0.01"
            value={formData.salario_liquido}
            onChange={(e) => handleChange('salario_liquido', parseFloat(e.target.value) || 0)}
            className="font-bold text-lg"
          />
        </div>
      </div>

      {/* Rúbricas/Eventos */}
      {(isLoadingEvents || isLoadingRubricas) ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Carregando rúbricas...</p>
        </div>
      ) : eventsDataState.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Rúbricas da Folha</h3>
            
            {/* Proventos */}
            {proventos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-600">Proventos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proventos.map((event) => (
                    <div key={event.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                      <div className="col-span-4">
                        <p className="text-sm font-medium">{event.descricao_rubrica}</p>
                        <p className="text-xs text-muted-foreground">{event.codigo_rubrica}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={event.quantidade || 1}
                          onChange={(e) => handleEventChange(event.id, 'quantidade', parseFloat(e.target.value) || 1)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Valor Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={event.valor_unitario || 0}
                          onChange={(e) => handleEventChange(event.id, 'valor_unitario', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Valor Total</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={event.valor_total || 0}
                          onChange={(e) => handleEventChange(event.id, 'valor_total', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm font-semibold"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-bold text-green-600">
                          {formatCurrency(event.valor_total || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Descontos */}
            {descontos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-600">Descontos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {descontos.map((event) => (
                    <div key={event.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                      <div className="col-span-4">
                        <p className="text-sm font-medium">{event.descricao_rubrica}</p>
                        <p className="text-xs text-muted-foreground">{event.codigo_rubrica}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={event.quantidade || 1}
                          onChange={(e) => handleEventChange(event.id, 'quantidade', parseFloat(e.target.value) || 1)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Valor Unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={event.valor_unitario || 0}
                          onChange={(e) => handleEventChange(event.id, 'valor_unitario', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Valor Total</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={event.valor_total || 0}
                          onChange={(e) => handleEventChange(event.id, 'valor_total', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm font-semibold"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-bold text-red-600">
                          {formatCurrency(event.valor_total || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma rúbrica encontrada</p>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => handleChange('observacoes', e.target.value)}
          rows={4}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}
