import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Settings, BarChart3, Clock, CheckCircle, XCircle, AlertCircle, Users, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompany } from '@/lib/company-context';
import { usePayrollProgress, PayrollProcessConfig } from '@/hooks/rh/usePayrollProgress';
import { ProcessControlPanel } from '@/components/rh/payroll/ProcessControlPanel';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { usePayrollConfig } from '@/hooks/rh/usePayrollConfig';
import { useRubricas } from '@/hooks/rh/useRubricas';
import { useInssBrackets } from '@/hooks/rh/useInssBrackets';
import { useIrrfBrackets } from '@/hooks/rh/useIrrfBrackets';
import { useFgtsConfig } from '@/hooks/rh/useFgtsConfig';
import { useCalculationLogs } from '@/hooks/rh/usePayrollCalculation';
import { toast } from 'sonner';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function PayrollCalculationPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [mesReferencia, setMesReferencia] = useState(new Date().getMonth() + 1);
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');
  const [processConfig, setProcessConfig] = useState<PayrollProcessConfig | null>(null);

  // Hooks de dados
  const { employees, isLoading: employeesLoading } = useEmployees(selectedCompany?.id || '');
  const { data: payrollConfig } = usePayrollConfig(mesReferencia, anoReferencia);
  const { data: rubricas } = useRubricas(selectedCompany?.id || '');
  const { data: inssBrackets } = useInssBrackets(selectedCompany?.id || '', anoReferencia, mesReferencia);
  const { data: irrfBrackets } = useIrrfBrackets(selectedCompany?.id || '', anoReferencia, mesReferencia);
  const { data: fgtsConfig } = useFgtsConfig(selectedCompany?.id || '', anoReferencia, mesReferencia);
  const { data: logsData } = useCalculationLogs();

  // Hook de progresso
  const {
    isProcessing,
    isPaused,
    isCompleted,
    hasError,
    progress,
    currentStep,
    currentEmployeeName,
    estimatedTimeRemaining,
    processingTime,
    successfulEmployees,
    failedEmployees,
    totalEmployees,
    errors,
    results,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    resetProgress,
    clearErrors,
    formatTimeRemaining,
    formatProcessingTime,
    successRate,
    canPause,
    canResume,
    canCancel,
    canRestart
  } = usePayrollProgress();

  // Dados
  const calculationLogs = logsData?.data || [];

  // Preparar configuração do processo
  useEffect(() => {
    if (selectedCompany?.id && employees && payrollConfig && rubricas && inssBrackets && irrfBrackets) {
      setProcessConfig({
        employees: employees.filter(emp => emp.status === 'ativo'),
        config: payrollConfig,
        rubricas: rubricas.filter(r => r.ativo),
        inssBrackets,
        irrfBrackets,
        fgtsConfig: fgtsConfig || null,
        period: { month: mesReferencia, year: anoReferencia },
        options: {
          batchSize: 50,
          maxConcurrency: 4,
          retryAttempts: 3,
          retryDelay: 1000,
          enableProgressTracking: true
        }
      });
    }
  }, [selectedCompany?.id, employees, payrollConfig, rubricas, inssBrackets, irrfBrackets, fgtsConfig, mesReferencia, anoReferencia]);

  // Handlers
  const handleStartCalculation = async () => {
    if (!processConfig) {
      toast.error('Configuração não está pronta');
      return;
    }

    try {
      await startProcessing(processConfig);
      toast.success('Cálculo de folha iniciado com sucesso!');
    } catch (error) {
      console.error('Erro ao iniciar cálculo:', error);
      toast.error('Erro ao iniciar cálculo de folha');
    }
  };

  const handlePauseCalculation = () => {
    pauseProcessing();
    toast.info('Processamento pausado');
  };

  const handleResumeCalculation = async () => {
    if (!processConfig) {
      toast.error('Configuração não está pronta');
      return;
    }

    try {
      await resumeProcessing(processConfig);
      toast.success('Processamento retomado');
    } catch (error) {
      console.error('Erro ao retomar cálculo:', error);
      toast.error('Erro ao retomar cálculo');
    }
  };

  const handleCancelCalculation = () => {
    cancelProcessing();
    toast.info('Processamento cancelado');
  };

  const handleRestartCalculation = () => {
    resetProgress();
    toast.info('Processamento reiniciado');
  };

  const handleOpenSettings = () => {
    navigate('/rh/payroll-config');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'iniciado':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'processando':
        return <Play className="h-4 w-4 text-green-500" />;
      case 'concluido':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelado':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      iniciado: { variant: 'outline' as const, label: 'Iniciado' },
      processando: { variant: 'default' as const, label: 'Processando' },
      concluido: { variant: 'default' as const, label: 'Concluído' },
      erro: { variant: 'destructive' as const, label: 'Erro' },
      cancelado: { variant: 'secondary' as const, label: 'Cancelado' }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.iniciado;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  return (
    <RequireEntity entityName="payroll_calculation" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Motor de Cálculo - Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Sistema avançado de cálculo paralelo para folha de pagamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Período</CardTitle>
          <CardDescription>
            Selecione o período para cálculo da folha de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês de Referência</Label>
              <Select value={mesReferencia.toString()} onValueChange={(value) => setMesReferencia(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar mês" />
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
              <Select value={anoReferencia.toString()} onValueChange={(value) => setAnoReferencia(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar ano" />
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
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Funcionários</p>
                <p className="text-2xl font-bold">{employees?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Processados com Sucesso</p>
                <p className="text-2xl font-bold">{successfulEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Falhas</p>
                <p className="text-2xl font-bold">{failedEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{successRate()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="control">Controle de Processamento</TabsTrigger>
          <TabsTrigger value="logs">Logs de Execução</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Painel de Controle */}
            <ProcessControlPanel
              processConfig={processConfig}
              onStart={handleStartCalculation}
              onPause={handlePauseCalculation}
              onResume={handleResumeCalculation}
              onCancel={handleCancelCalculation}
              onRestart={handleRestartCalculation}
            />
            
            {/* Status Atual */}
            <Card>
              <CardHeader>
                <CardTitle>Status Atual</CardTitle>
                <CardDescription>
                  Informações sobre o processamento em andamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{currentStep}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    
                    {currentEmployeeName && (
                      <p className="text-sm text-muted-foreground">
                        Processando: <strong>{currentEmployeeName}</strong>
                      </p>
                    )}
                    
                    {estimatedTimeRemaining > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Tempo estimado: {formatTimeRemaining(estimatedTimeRemaining)}
                      </p>
                    )}
                  </div>
                )}
                
                {isCompleted && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Processamento Concluído</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tempo total: {formatProcessingTime(processingTime)}
                    </p>
                  </div>
                )}
                
                {hasError && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Erro no Processamento</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Verifique os logs para mais detalhes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="control" className="space-y-4">
          <ProcessControlPanel
            processConfig={processConfig}
            onStart={handleStartCalculation}
            onPause={handlePauseCalculation}
            onResume={handleResumeCalculation}
            onCancel={handleCancelCalculation}
            onRestart={handleRestartCalculation}
          />
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Execução</CardTitle>
              <CardDescription>
                Histórico de execuções do motor de cálculo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calculationLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="font-medium">{log.descricao_processo}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.mes_referencia}/{log.ano_referencia} - {log.funcionarios_processados}/{log.total_funcionarios} funcionários
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4">
          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados do Processamento</CardTitle>
                <CardDescription>
                  Detalhes dos resultados da última execução
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {results.totalEmployees}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {results.successfulEmployees}
                      </div>
                      <div className="text-xs text-muted-foreground">Sucessos</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {results.failedEmployees}
                      </div>
                      <div className="text-xs text-muted-foreground">Falhas</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatProcessingTime(results.totalProcessingTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">Tempo Total</div>
                    </div>
                  </div>
                  
                  {results.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Erros Encontrados</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {results.errors.slice(0, 10).map((error, index) => (
                          <p key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {error}
                          </p>
                        ))}
                        {results.errors.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            ... e mais {results.errors.length - 10} erros
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </RequireEntity>
  );
}
