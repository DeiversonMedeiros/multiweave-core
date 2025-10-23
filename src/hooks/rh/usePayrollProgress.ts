import { useState, useEffect, useCallback } from 'react';
import { ParallelPayrollEngine, ProgressUpdate, BatchResult } from '@/services/rh/parallelPayrollEngine';
import { Employee, PayrollConfig, Rubrica, InssBracket, IrrfBracket, FgtsConfig } from '@/integrations/supabase/rh-types';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface PayrollProgress {
  batchId: string | null;
  isProcessing: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  hasError: boolean;
  currentEmployee: number;
  totalEmployees: number;
  currentEmployeeName: string;
  currentStep: string;
  progress: number;
  estimatedTimeRemaining: number;
  processingTime: number;
  successfulEmployees: number;
  failedEmployees: number;
  errors: string[];
  results: BatchResult | null;
}

export interface PayrollProcessConfig {
  employees: Employee[];
  config: PayrollConfig;
  rubricas: Rubrica[];
  inssBrackets: InssBracket[];
  irrfBrackets: IrrfBracket[];
  fgtsConfig: FgtsConfig | null;
  period: { month: number; year: number };
  options?: {
    batchSize?: number;
    maxConcurrency?: number;
    retryAttempts?: number;
    retryDelay?: number;
    enableProgressTracking?: boolean;
  };
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function usePayrollProgress() {
  const [progress, setProgress] = useState<PayrollProgress>({
    batchId: null,
    isProcessing: false,
    isPaused: false,
    isCompleted: false,
    hasError: false,
    currentEmployee: 0,
    totalEmployees: 0,
    currentEmployeeName: '',
    currentStep: '',
    progress: 0,
    estimatedTimeRemaining: 0,
    processingTime: 0,
    successfulEmployees: 0,
    failedEmployees: 0,
    errors: [],
    results: null
  });

  const engine = ParallelPayrollEngine.getInstance();

  // Callback para atualizações de progresso
  const handleProgressUpdate = useCallback((update: ProgressUpdate) => {
    setProgress(prev => ({
      ...prev,
      currentEmployee: update.currentEmployee,
      totalEmployees: update.totalEmployees,
      currentEmployeeName: update.currentEmployeeName,
      currentStep: update.currentStep,
      progress: update.progress,
      estimatedTimeRemaining: update.estimatedTimeRemaining,
      errors: update.errors
    }));
  }, []);

  // Iniciar processamento
  const startProcessing = useCallback(async (processConfig: PayrollProcessConfig) => {
    try {
      setProgress(prev => ({
        ...prev,
        isProcessing: true,
        isPaused: false,
        isCompleted: false,
        hasError: false,
        currentEmployee: 0,
        totalEmployees: processConfig.employees.length,
        currentEmployeeName: '',
        currentStep: 'Iniciando processamento...',
        progress: 0,
        estimatedTimeRemaining: 0,
        processingTime: 0,
        successfulEmployees: 0,
        failedEmployees: 0,
        errors: [],
        results: null
      }));

      // Registrar callback de progresso
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      engine.onProgress(batchId, handleProgressUpdate);

      setProgress(prev => ({ ...prev, batchId }));

      // Iniciar processamento
      const result = await engine.calculatePayrollBatch(
        processConfig.employees,
        processConfig.config,
        processConfig.rubricas,
        processConfig.inssBrackets,
        processConfig.irrfBrackets,
        processConfig.fgtsConfig,
        processConfig.period,
        {
          batchSize: processConfig.options?.batchSize || 50,
          maxConcurrency: processConfig.options?.maxConcurrency || 4,
          retryAttempts: processConfig.options?.retryAttempts || 3,
          retryDelay: processConfig.options?.retryDelay || 1000,
          enableProgressTracking: processConfig.options?.enableProgressTracking !== false
        }
      );

      // Atualizar estado final
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        isCompleted: true,
        currentStep: 'Processamento concluído',
        progress: 100,
        estimatedTimeRemaining: 0,
        successfulEmployees: result.successfulEmployees,
        failedEmployees: result.failedEmployees,
        processingTime: result.totalProcessingTime,
        results: result,
        errors: result.errors
      }));

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        hasError: true,
        currentStep: 'Erro no processamento',
        errors: [...prev.errors, errorMessage]
      }));

      throw error;
    }
  }, [engine, handleProgressUpdate]);

  // Pausar processamento
  const pauseProcessing = useCallback(() => {
    if (progress.batchId) {
      engine.cancelBatch(progress.batchId);
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        isPaused: true,
        currentStep: 'Processamento pausado'
      }));
    }
  }, [engine, progress.batchId]);

  // Retomar processamento
  const resumeProcessing = useCallback(async (processConfig: PayrollProcessConfig) => {
    // Para retomar, precisamos reiniciar o processamento
    // com os funcionários restantes
    const remainingEmployees = processConfig.employees.slice(progress.currentEmployee);
    
    if (remainingEmployees.length > 0) {
      const newConfig = {
        ...processConfig,
        employees: remainingEmployees
      };
      
      return await startProcessing(newConfig);
    }
  }, [progress.currentEmployee, startProcessing]);

  // Cancelar processamento
  const cancelProcessing = useCallback(() => {
    if (progress.batchId) {
      engine.cancelBatch(progress.batchId);
      setProgress(prev => ({
        ...prev,
        isProcessing: false,
        isPaused: false,
        isCompleted: false,
        hasError: false,
        currentStep: 'Processamento cancelado',
        batchId: null
      }));
    }
  }, [engine, progress.batchId]);

  // Resetar progresso
  const resetProgress = useCallback(() => {
    setProgress({
      batchId: null,
      isProcessing: false,
      isPaused: false,
      isCompleted: false,
      hasError: false,
      currentEmployee: 0,
      totalEmployees: 0,
      currentEmployeeName: '',
      currentStep: '',
      progress: 0,
      estimatedTimeRemaining: 0,
      processingTime: 0,
      successfulEmployees: 0,
      failedEmployees: 0,
      errors: [],
      results: null
    });
  }, []);

  // Limpar erros
  const clearErrors = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      errors: [],
      hasError: false
    }));
  }, []);

  // Formatar tempo restante
  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (seconds <= 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  // Formatar tempo de processamento
  const formatProcessingTime = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    return formatTimeRemaining(seconds);
  }, [formatTimeRemaining]);

  // Calcular taxa de sucesso
  const successRate = useCallback((): number => {
    if (progress.totalEmployees === 0) return 0;
    return Math.round((progress.successfulEmployees / progress.totalEmployees) * 100);
  }, [progress.successfulEmployees, progress.totalEmployees]);

  // Verificar se pode pausar
  const canPause = progress.isProcessing && !progress.isPaused;

  // Verificar se pode retomar
  const canResume = progress.isPaused && !progress.isCompleted;

  // Verificar se pode cancelar
  const canCancel = progress.isProcessing || progress.isPaused;

  // Verificar se pode reiniciar
  const canRestart = progress.isCompleted || progress.hasError;

  return {
    // Estado do progresso
    progress,
    
    // Ações
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    resetProgress,
    clearErrors,
    
    // Utilitários
    formatTimeRemaining,
    formatProcessingTime,
    successRate,
    
    // Flags de estado
    canPause,
    canResume,
    canCancel,
    canRestart,
    
    // Estado simplificado
    isProcessing: progress.isProcessing,
    isPaused: progress.isPaused,
    isCompleted: progress.isCompleted,
    hasError: progress.hasError,
    progressPercentage: progress.progress,
    currentStep: progress.currentStep,
    currentEmployeeName: progress.currentEmployeeName,
    estimatedTimeRemaining: progress.estimatedTimeRemaining,
    processingTime: progress.processingTime,
    successfulEmployees: progress.successfulEmployees,
    failedEmployees: progress.failedEmployees,
    totalEmployees: progress.totalEmployees,
    errors: progress.errors,
    results: progress.results
  };
}

// =====================================================
// HOOK PARA PROGRESSO SIMPLIFICADO
// =====================================================

export function useSimplePayrollProgress() {
  const {
    isProcessing,
    isPaused,
    isCompleted,
    hasError,
    progressPercentage,
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

  return {
    // Estado
    isProcessing,
    isPaused,
    isCompleted,
    hasError,
    progress: progressPercentage,
    currentStep,
    currentEmployeeName,
    estimatedTimeRemaining,
    processingTime,
    successfulEmployees,
    failedEmployees,
    totalEmployees,
    errors,
    results,
    
    // Ações
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    resetProgress,
    clearErrors,
    
    // Utilitários
    formatTimeRemaining,
    formatProcessingTime,
    successRate,
    
    // Flags
    canPause,
    canResume,
    canCancel,
    canRestart
  };
}
