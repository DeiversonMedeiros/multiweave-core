import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { SimpleDataTable } from '@/components/rh/SimpleDataTable';
import { TableActions } from '@/components/rh/TableActions';
import { RequireEntity } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  usePayroll, 
  useDeletePayroll,
  usePayrollStats,
  usePayrollById
} from '@/hooks/rh/usePayroll';
import { usePayrollCalculation, useCalculationProgress, usePayrollEvents } from '@/hooks/rh/usePayrollCalculation';
import { Payroll, PayrollEvent } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { formatCurrency } from '@/services/rh/payrollCalculationService';
import { generatePayslipPDF, downloadPayslip } from '@/services/rh/payslipService';
import { EntityService } from '@/services/generic/entityService';
import { Employee } from '@/integrations/supabase/rh-types';

// =====================================================
// COMPONENTE PRINCIPAL - FOLHA DE PAGAMENTO UNIFICADA
// =====================================================

export default function PayrollPage() {
  const { selectedCompany } = useCompany();
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [processoAtivo, setProcessoAtivo] = useState<string | undefined>();
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
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

      // Buscar eventos da folha
      const { getPayrollEvents } = await import('@/services/rh/payrollCalculationService');
      const eventsResult = await getPayrollEvents(selectedCompany.id, payroll.id);
      const events = eventsResult.data || [];

      // Gerar PDF
      const blob = await generatePayslipPDF({
        payroll,
        employee,
        events,
        company: {
          name: selectedCompany.nome || 'Empresa',
          cnpj: selectedCompany.cnpj,
          address: selectedCompany.endereco
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
            case 'processado':
              return 'default';
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
            case 'processado':
              return 'Processado';
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
      render: (payroll: Payroll) => (
        <TableActions
          item={payroll}
          actions={[
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
          ]}
        />
      ),
    },
  ];

  return (
    <RequireEntity entityName="payroll" action="read">
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
              <SelectItem value="processado">Processado</SelectItem>
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
    </RequireEntity>
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
