import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  AlertTriangle,
  BarChart3,
  Timer
} from 'lucide-react';
import { usePayrollProgress, PayrollProcessConfig } from '@/hooks/rh/usePayrollProgress';

// =====================================================
// INTERFACE DE PROPS
// =====================================================

interface ProcessControlPanelProps {
  processConfig: PayrollProcessConfig | null;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRestart?: () => void;
  className?: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function ProcessControlPanel({
  processConfig,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRestart,
  className = ''
}: ProcessControlPanelProps) {
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

  // Handlers
  const handleStart = async () => {
    if (processConfig) {
      try {
        await startProcessing(processConfig);
        onStart?.();
      } catch (error) {
        console.error('Erro ao iniciar processamento:', error);
      }
    }
  };

  const handlePause = () => {
    pauseProcessing();
    onPause?.();
  };

  const handleResume = async () => {
    if (processConfig) {
      try {
        await resumeProcessing(processConfig);
        onResume?.();
      } catch (error) {
        console.error('Erro ao retomar processamento:', error);
      }
    }
  };

  const handleCancel = () => {
    cancelProcessing();
    onCancel?.();
  };

  const handleRestart = () => {
    resetProgress();
    onRestart?.();
  };

  // Renderizar status
  const renderStatus = () => {
    if (hasError) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    }

    if (isCompleted) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Concluído
        </Badge>
      );
    }

    if (isPaused) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Pause className="h-3 w-3" />
          Pausado
        </Badge>
      );
    }

    if (isProcessing) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Processando
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Square className="h-3 w-3" />
        Parado
      </Badge>
    );
  };

  // Renderizar botões de controle
  const renderControlButtons = () => {
    if (isProcessing) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={!canPause}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={!canCancel}
          >
            <Square className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      );
    }

    if (isPaused) {
      return (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleResume}
            disabled={!canResume}
          >
            <Play className="h-4 w-4 mr-2" />
            Retomar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={!canCancel}
          >
            <Square className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      );
    }

    if (isCompleted || hasError) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={!canRestart}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reiniciar
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="default"
        size="sm"
        onClick={handleStart}
        disabled={!processConfig}
      >
        <Play className="h-4 w-4 mr-2" />
        Iniciar
      </Button>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Card de Controle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Controle de Processamento
              </CardTitle>
              <CardDescription>
                Gerencie o processamento da folha de pagamento
              </CardDescription>
            </div>
            {renderStatus()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botões de Controle */}
          <div className="flex items-center justify-between">
            {renderControlButtons()}
            
            {errors.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearErrors}
              >
                Limpar Erros
              </Button>
            )}
          </div>

          {/* Progresso */}
          {(isProcessing || isPaused || isCompleted) && (
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
            </div>
          )}

          {/* Estatísticas */}
          {(isProcessing || isPaused || isCompleted) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {successfulEmployees}
                </div>
                <div className="text-xs text-muted-foreground">Sucessos</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {failedEmployees}
                </div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {successRate()}%
                </div>
                <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatProcessingTime(processingTime)}
                </div>
                <div className="text-xs text-muted-foreground">Tempo Total</div>
              </div>
            </div>
          )}

          {/* Tempo Estimado */}
          {isProcessing && estimatedTimeRemaining > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>Tempo estimado restante: {formatTimeRemaining(estimatedTimeRemaining)}</span>
            </div>
          )}

          {/* Resumo Final */}
          {isCompleted && results && (
            <div className="space-y-2">
              <h4 className="font-medium">Resumo do Processamento</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total de Funcionários:</span>
                  <span className="ml-2 font-medium">{totalEmployees}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Processados com Sucesso:</span>
                  <span className="ml-2 font-medium text-green-600">{successfulEmployees}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Falhas:</span>
                  <span className="ml-2 font-medium text-red-600">{failedEmployees}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tempo Total:</span>
                  <span className="ml-2 font-medium">{formatProcessingTime(processingTime)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas de Erro */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Erros encontrados:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
                {errors.length > 5 && (
                  <li className="text-sm text-muted-foreground">
                    ... e mais {errors.length - 5} erros
                  </li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Informações do Processo */}
      {processConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuração do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Funcionários:</span>
                <span className="ml-2 font-medium">{processConfig.employees.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Período:</span>
                <span className="ml-2 font-medium">
                  {processConfig.period.month.toString().padStart(2, '0')}/{processConfig.period.year}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Rubricas:</span>
                <span className="ml-2 font-medium">{processConfig.rubricas.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tamanho do Lote:</span>
                <span className="ml-2 font-medium">{processConfig.options?.batchSize || 50}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
