import { supabase } from '@/integrations/supabase/client';
import { Employee, PayrollConfig, Rubrica, InssBracket, IrrfBracket, FgtsConfig } from '@/integrations/supabase/rh-types';
import { ParallelPayrollEngine, BatchResult } from './parallelPayrollEngine';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface ProcessingJob {
  id: string;
  companyId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalEmployees: number;
  processedEmployees: number;
  successfulEmployees: number;
  failedEmployees: number;
  currentEmployee: string;
  currentStep: string;
  estimatedTimeRemaining: number;
  processingTime: number;
  errors: string[];
  results: BatchResult | null;
  config: ProcessingJobConfig;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
}

export interface ProcessingJobConfig {
  employees: Employee[];
  payrollConfig: PayrollConfig;
  rubricas: Rubrica[];
  inssBrackets: InssBracket[];
  irrfBrackets: IrrfBracket[];
  fgtsConfig: FgtsConfig | null;
  period: { month: number; year: number };
  options: {
    batchSize: number;
    maxConcurrency: number;
    retryAttempts: number;
    retryDelay: number;
    enableProgressTracking: boolean;
  };
}

export interface JobFilters {
  status?: string;
  companyId?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface JobStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageProcessingTime: number;
  totalEmployeesProcessed: number;
}

// =====================================================
// PROCESSADOR ASSÍNCRONO
// =====================================================

export class AsyncPayrollProcessor {
  private static instance: AsyncPayrollProcessor;
  private activeJobs: Map<string, AbortController> = new Map();
  private progressCallbacks: Map<string, (job: ProcessingJob) => void> = new Map();
  private engine: ParallelPayrollEngine;

  private constructor() {
    this.engine = ParallelPayrollEngine.getInstance();
  }

  static getInstance(): AsyncPayrollProcessor {
    if (!AsyncPayrollProcessor.instance) {
      AsyncPayrollProcessor.instance = new AsyncPayrollProcessor();
    }
    return AsyncPayrollProcessor.instance;
  }

  /**
   * Cria um novo job de processamento
   */
  async createJob(
    companyId: string,
    config: ProcessingJobConfig,
    createdBy: string
  ): Promise<ProcessingJob> {
    try {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const job: ProcessingJob = {
        id: jobId,
        companyId,
        status: 'pending',
        progress: 0,
        totalEmployees: config.employees.length,
        processedEmployees: 0,
        successfulEmployees: 0,
        failedEmployees: 0,
        currentEmployee: '',
        currentStep: 'Aguardando processamento',
        estimatedTimeRemaining: 0,
        processingTime: 0,
        errors: [],
        results: null,
        config,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        createdBy
      };

      // Salvar job no banco de dados
      const { data, error } = await supabase
        .from('rh.processing_jobs')
        .insert({
          id: jobId,
          company_id: companyId,
          status: job.status,
          progress: job.progress,
          total_employees: job.totalEmployees,
          processed_employees: job.processedEmployees,
          successful_employees: job.successfulEmployees,
          failed_employees: job.failedEmployees,
          current_employee: job.currentEmployee,
          current_step: job.currentStep,
          estimated_time_remaining: job.estimatedTimeRemaining,
          processing_time: job.processingTime,
          errors: job.errors,
          config: job.config,
          created_at: job.createdAt,
          started_at: job.startedAt,
          completed_at: job.completedAt,
          created_by: job.createdBy
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar job: ${error.message}`);
      }

      return job;

    } catch (error) {
      console.error('Erro ao criar job de processamento:', error);
      throw error;
    }
  }

  /**
   * Inicia processamento de um job
   */
  async startJob(jobId: string): Promise<void> {
    try {
      // Buscar job
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job não encontrado');
      }

      if (job.status !== 'pending') {
        throw new Error('Job não está pendente');
      }

      // Atualizar status para running
      await this.updateJobStatus(jobId, 'running', {
        startedAt: new Date().toISOString(),
        currentStep: 'Iniciando processamento'
      });

      // Criar AbortController para o job
      const abortController = new AbortController();
      this.activeJobs.set(jobId, abortController);

      // Iniciar processamento em background
      this.processJobInBackground(jobId, abortController.signal);

    } catch (error) {
      console.error('Erro ao iniciar job:', error);
      await this.updateJobStatus(jobId, 'failed', {
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      });
      throw error;
    }
  }

  /**
   * Processa job em background
   */
  private async processJobInBackground(jobId: string, signal: AbortSignal): Promise<void> {
    try {
      // Verificar se foi cancelado
      if (signal.aborted) {
        await this.updateJobStatus(jobId, 'cancelled');
        return;
      }

      // Buscar job atualizado
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job não encontrado');
      }

      // Configurar callback de progresso
      this.engine.onProgress(jobId, (update) => {
        this.updateJobProgress(jobId, update);
      });

      // Iniciar processamento
      const startTime = Date.now();
      
      const result = await this.engine.calculatePayrollBatch(
        job.config.employees,
        job.config.payrollConfig,
        job.config.rubricas,
        job.config.inssBrackets,
        job.config.irrfBrackets,
        job.config.fgtsConfig,
        job.config.period,
        job.config.options
      );

      const processingTime = Date.now() - startTime;

      // Atualizar job com resultados
      await this.updateJobStatus(jobId, 'completed', {
        progress: 100,
        processedEmployees: result.processedEmployees,
        successfulEmployees: result.successfulEmployees,
        failedEmployees: result.failedEmployees,
        currentStep: 'Processamento concluído',
        estimatedTimeRemaining: 0,
        processingTime,
        results: result,
        completedAt: new Date().toISOString()
      });

      // Limpar job ativo
      this.activeJobs.delete(jobId);
      this.progressCallbacks.delete(jobId);

    } catch (error) {
      console.error('Erro no processamento do job:', error);
      
      await this.updateJobStatus(jobId, 'failed', {
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        completedAt: new Date().toISOString()
      });

      // Limpar job ativo
      this.activeJobs.delete(jobId);
      this.progressCallbacks.delete(jobId);
    }
  }

  /**
   * Atualiza progresso do job
   */
  private async updateJobProgress(jobId: string, update: any): Promise<void> {
    try {
      await this.updateJobStatus(jobId, 'running', {
        progress: update.progress,
        processedEmployees: update.currentEmployee,
        currentEmployee: update.currentEmployeeName,
        currentStep: update.currentStep,
        estimatedTimeRemaining: update.estimatedTimeRemaining,
        errors: update.errors
      });

      // Notificar callbacks
      const callback = this.progressCallbacks.get(jobId);
      if (callback) {
        const job = await this.getJob(jobId);
        if (job) {
          callback(job);
        }
      }

    } catch (error) {
      console.error('Erro ao atualizar progresso do job:', error);
    }
  }

  /**
   * Atualiza status do job
   */
  private async updateJobStatus(
    jobId: string, 
    status: string, 
    updates: Partial<ProcessingJob> = {}
  ): Promise<void> {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...updates
      };

      const { error } = await supabase
        .from('rh.processing_jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        throw new Error(`Erro ao atualizar job: ${error.message}`);
      }

    } catch (error) {
      console.error('Erro ao atualizar status do job:', error);
      throw error;
    }
  }

  /**
   * Busca job por ID
   */
  async getJob(jobId: string): Promise<ProcessingJob | null> {
    try {
      const { data, error } = await supabase
        .from('rh.processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job não encontrado
        }
        throw new Error(`Erro ao buscar job: ${error.message}`);
      }

      return this.mapJobFromDatabase(data);

    } catch (error) {
      console.error('Erro ao buscar job:', error);
      return null;
    }
  }

  /**
   * Lista jobs com filtros
   */
  async listJobs(filters: JobFilters = {}): Promise<ProcessingJob[]> {
    try {
      let query = supabase
        .from('rh.processing_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId);
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao listar jobs: ${error.message}`);
      }

      return (data || []).map(job => this.mapJobFromDatabase(job));

    } catch (error) {
      console.error('Erro ao listar jobs:', error);
      return [];
    }
  }

  /**
   * Cancela um job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) {
        return false;
      }

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return false;
      }

      // Cancelar processamento ativo
      const abortController = this.activeJobs.get(jobId);
      if (abortController) {
        abortController.abort();
        this.activeJobs.delete(jobId);
        this.progressCallbacks.delete(jobId);
      }

      // Atualizar status
      await this.updateJobStatus(jobId, 'cancelled', {
        completedAt: new Date().toISOString()
      });

      return true;

    } catch (error) {
      console.error('Erro ao cancelar job:', error);
      return false;
    }
  }

  /**
   * Pausa um job
   */
  async pauseJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job || job.status !== 'running') {
        return false;
      }

      // Cancelar processamento ativo
      const abortController = this.activeJobs.get(jobId);
      if (abortController) {
        abortController.abort();
        this.activeJobs.delete(jobId);
        this.progressCallbacks.delete(jobId);
      }

      // Atualizar status
      await this.updateJobStatus(jobId, 'pending', {
        currentStep: 'Pausado'
      });

      return true;

    } catch (error) {
      console.error('Erro ao pausar job:', error);
      return false;
    }
  }

  /**
   * Retoma um job pausado
   */
  async resumeJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job || job.status !== 'pending') {
        return false;
      }

      // Reiniciar processamento
      await this.startJob(jobId);
      return true;

    } catch (error) {
      console.error('Erro ao retomar job:', error);
      return false;
    }
  }

  /**
   * Deleta um job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    try {
      // Cancelar se estiver rodando
      await this.cancelJob(jobId);

      // Deletar do banco
      const { error } = await supabase
        .from('rh.processing_jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        throw new Error(`Erro ao deletar job: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Erro ao deletar job:', error);
      return false;
    }
  }

  /**
   * Busca estatísticas de jobs
   */
  async getJobStats(companyId: string): Promise<JobStats> {
    try {
      const { data, error } = await supabase
        .from('rh.processing_jobs')
        .select('status, processing_time, processed_employees')
        .eq('company_id', companyId);

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      const jobs = data || [];
      
      const stats: JobStats = {
        totalJobs: jobs.length,
        pendingJobs: jobs.filter(j => j.status === 'pending').length,
        runningJobs: jobs.filter(j => j.status === 'running').length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        cancelledJobs: jobs.filter(j => j.status === 'cancelled').length,
        averageProcessingTime: 0,
        totalEmployeesProcessed: 0
      };

      // Calcular estatísticas adicionais
      const completedJobs = jobs.filter(j => j.status === 'completed');
      if (completedJobs.length > 0) {
        stats.averageProcessingTime = completedJobs.reduce((sum, j) => sum + (j.processing_time || 0), 0) / completedJobs.length;
        stats.totalEmployeesProcessed = completedJobs.reduce((sum, j) => sum + (j.processed_employees || 0), 0);
      }

      return stats;

    } catch (error) {
      console.error('Erro ao buscar estatísticas de jobs:', error);
      return {
        totalJobs: 0,
        pendingJobs: 0,
        runningJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        cancelledJobs: 0,
        averageProcessingTime: 0,
        totalEmployeesProcessed: 0
      };
    }
  }

  /**
   * Registra callback de progresso
   */
  onJobProgress(jobId: string, callback: (job: ProcessingJob) => void): void {
    this.progressCallbacks.set(jobId, callback);
  }

  /**
   * Remove callback de progresso
   */
  offJobProgress(jobId: string): void {
    this.progressCallbacks.delete(jobId);
  }

  /**
   * Mapeia job do banco de dados
   */
  private mapJobFromDatabase(data: any): ProcessingJob {
    return {
      id: data.id,
      companyId: data.company_id,
      status: data.status,
      progress: data.progress || 0,
      totalEmployees: data.total_employees || 0,
      processedEmployees: data.processed_employees || 0,
      successfulEmployees: data.successful_employees || 0,
      failedEmployees: data.failed_employees || 0,
      currentEmployee: data.current_employee || '',
      currentStep: data.current_step || '',
      estimatedTimeRemaining: data.estimated_time_remaining || 0,
      processingTime: data.processing_time || 0,
      errors: data.errors || [],
      results: data.results || null,
      config: data.config || {},
      createdAt: data.created_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      createdBy: data.created_by
    };
  }
}
