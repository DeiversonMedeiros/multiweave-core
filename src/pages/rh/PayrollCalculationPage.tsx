import React, { useState } from 'react';
import { Play, Pause, Square, RotateCcw, Settings, BarChart3, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompany } from '@/lib/company-context';
import { usePayrollCalculation, useCalculationLogs, useCalculationProgress, usePayrollSummary } from '@/hooks/rh/usePayrollCalculation';
import { formatCurrency, formatDate } from '@/services/rh/payrollCalculationService';
import { toast } from 'sonner';

export default function PayrollCalculationPage() {
  const { selectedCompany } = useCompany();
  const [mesReferencia, setMesReferencia] = useState(new Date().getMonth() + 1);
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear());
  const [processoAtivo, setProcessoAtivo] = useState<string | undefined>();

  // Hooks
  const calculatePayrollMutation = usePayrollCalculation();
  const { data: logsData } = useCalculationLogs();
  const { progresso, status, isProcessing, isCompleted, hasError, tempoExecucao, logs: progressLogs, erros } = useCalculationProgress(processoAtivo);
  const { totalFuncionarios, totalVencimentos, totalDescontos, totalLiquido, totalEventos, isLoading: summaryLoading } = usePayrollSummary(mesReferencia, anoReferencia);

  // Dados
  const calculationLogs = logsData?.data || [];

  // Handlers
  const handleStartCalculation = async () => {
    if (!selectedCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    try {
      const processoId = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setProcessoAtivo(processoId);

      await calculatePayrollMutation.mutateAsync({
        companyId: selectedCompany.id,
        mesReferencia,
        anoReferencia,
        tipoProcesso: 'folha_mensal',
        usuarioNome: 'Usuário Atual' // TODO: Pegar do contexto de usuário
      });

      toast.success('Cálculo de folha iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar cálculo:', error);
      toast.error('Erro ao iniciar cálculo de folha');
    }
  };

  const handleStopCalculation = () => {
    // TODO: Implementar parada do cálculo
    setProcessoAtivo(undefined);
    toast.info('Parada do cálculo solicitada');
  };

  const handleRecalculate = () => {
    // TODO: Implementar recálculo
    toast.info('Recálculo será implementado em breve');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'iniciado':
        return 'bg-blue-100 text-blue-800';
      case 'processando':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'erro':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para acessar o motor de cálculo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Motor de Cálculo</h1>
          <p className="text-muted-foreground">
            Engine de cálculo de folha de pagamento
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Configuração do Período */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Cálculo</CardTitle>
          <CardDescription>
            Configure o período e parâmetros para o cálculo de folha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês de Referência</Label>
              <Select 
                value={mesReferencia.toString()} 
                onValueChange={(value) => setMesReferencia(parseInt(value))}
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
              <Label htmlFor="ano">Ano de Referência</Label>
              <Select 
                value={anoReferencia.toString()} 
                onValueChange={(value) => setAnoReferencia(parseInt(value))}
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
              <Label>Período</Label>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleStartCalculation}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Calculando...' : 'Iniciar Cálculo'}
                </Button>
                {isProcessing && (
                  <Button variant="outline" onClick={handleStopCalculation}>
                    <Square className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progresso do Cálculo Ativo */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon(status)}
              <span className="ml-2">Processamento em Andamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
          </CardContent>
        </Card>
      )}

      {/* Resumo do Período */}
      {!summaryLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Funcionários</p>
                  <p className="text-2xl font-bold">{totalFuncionarios}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Vencimentos</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalVencimentos)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Descontos</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalDescontos)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Salário Líquido</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalLiquido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs de Execução */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
          <CardDescription>
            Logs dos processos de cálculo executados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculationLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum processo de cálculo encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {calculationLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-medium">{log.descricao_processo}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.mes_referencia}/{log.ano_referencia} • 
                        {log.total_funcionarios} funcionários • 
                        {log.eventos_calculados} eventos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                    {log.tempo_execucao_segundos && (
                      <span className="text-sm text-muted-foreground">
                        {Math.floor(log.tempo_execucao_segundos / 60)}m {log.tempo_execucao_segundos % 60}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
