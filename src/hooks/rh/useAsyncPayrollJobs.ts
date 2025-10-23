import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { AsyncPayrollProcessor, ProcessingJob, ProcessingJobConfig, JobFilters, JobStats } from '@/services/rh/asyncPayrollProcessor';
import { toast } from 'sonner';

// =====================================================
// HOOKS PARA JOBS ASSÍNCRONOS
// =====================================================

/**
 * Hook para listar jobs de processamento
 */
export function usePayrollJobs(filters: JobFilters = {}) {
  const { selectedCompany } = useCompany();
  const processor = AsyncPayrollProcessor.getInstance();

  return useQuery({
    queryKey: ['payroll-jobs', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      return await processor.listJobs({
        ...filters,
        companyId: selectedCompany.id
      });
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 5000, // Refetch a cada 5 segundos para jobs ativos
  });
}

/**
 * Hook para buscar job específico
 */
export function usePayrollJob(jobId: string) {
  const processor = AsyncPayrollProcessor.getInstance();

  return useQuery({
    queryKey: ['payroll-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      return await processor.getJob(jobId);
    },
    enabled: !!jobId,
    staleTime: 1000 * 10, // 10 segundos
    refetchInterval: (data) => {
      // Refetch mais frequentemente para jobs ativos
      if (data?.status === 'running' || data?.status === 'pending') {
        return 2000; // 2 segundos
      }
      return false; // Não refetch para jobs completos
    },
  });
}

/**
 * Hook para criar job de processamento
 */
export function useCreatePayrollJob() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const processor = AsyncPayrollProcessor.getInstance();

  return useMutation({
    mutationFn: async (config: ProcessingJobConfig) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await processor.createJob(
        selectedCompany.id,
        config,
        'current-user' // TODO: Pegar do contexto de usuário
      );
    },
    onSuccess: (job) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      
      toast.success(`Job de processamento criado: ${job.id}`);
    },
    onError: (error) => {
      console.error('Erro ao criar job:', error);
      toast.error('Erro ao criar job de processamento');
    }
  });
}

/**
 * Hook para iniciar job
 */
export function useStartPayrollJob() {
  const queryClient = useQueryClient();
  const processor = AsyncPayrollProcessor.getInstance();

  return useMutation({
    mutationFn: async (jobId: string) => {
      await processor.startJob(jobId);
    },
    onSuccess: (_, jobId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      
      toast.success('Job iniciado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao iniciar job:', error);
      toast.error('Erro ao iniciar job');
    }
  });
}

/**
 * Hook para pausar job
 */
export function usePausePayrollJob() {
  const queryClient = useQueryClient();
  const processor = AsyncPayrollProcessor.getInstance();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const success = await processor.pauseJob(jobId);
      if (!success) {
        throw new Error('Não foi possível pausar o job');
      }
    },
    onSuccess: (_, jobId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      
      toast.success('Job pausado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao pausar job:', error);
      toast.error('Erro ao pausar job');
    }
  });
}

/**
 * Hook para retomar job
 */
export function useResumePayrollJob() {
  const queryClient = useQueryClient();
  const processor = AsyncPayrollProcessor.getInstance();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const success = await processor.resumeJob(jobId);
      if (!success) {
        throw new Error('Não foi possível retomar o job');
      }
    },
    onSuccess: (_, jobId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      
      toast.success('Job retomado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao retomar job:', error);
      toast.error('Erro ao retomar job');
    }
  });
}

/**
 * Hook para cancelar job
 */
export function useCancelPayrollJob() {
  const queryClient = useQueryClient();
  const processor = AsyncPayrollProcessor.getInstance();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const success = await processor.cancelJob(jobId);
      if (!success) {
        throw new Error('Não foi possível cancelar o job');
      }
    },
    onSuccess: (_, jobId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      
      toast.success('Job cancelado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao cancelar job:', error);
      toast.error('Erro ao cancelar job');
    }
  });
}

/**
 * Hook para deletar job
 */
export function useDeletePayrollJob() {
  const queryClient = useQueryClient();
  const processor = AsyncPayrollProcessor.getInstance();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const success = await processor.deleteJob(jobId);
      if (!success) {
        throw new Error('Não foi possível deletar o job');
      }
    },
    onSuccess: (_, jobId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-stats'] });
      
      toast.success('Job deletado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao deletar job:', error);
      toast.error('Erro ao deletar job');
    }
  });
}

/**
 * Hook para estatísticas de jobs
 */
export function useJobStats() {
  const { selectedCompany } = useCompany();
  const processor = AsyncPayrollProcessor.getInstance();

  return useQuery({
    queryKey: ['job-stats', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) {
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

      return await processor.getJobStats(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60, // 1 minuto
  });
}

/**
 * Hook para jobs ativos (running ou pending)
 */
export function useActiveJobs() {
  const { data: jobs, ...rest } = usePayrollJobs();
  
  const activeJobs = jobs?.filter(job => 
    job.status === 'running' || job.status === 'pending'
  ) || [];

  return {
    ...rest,
    data: activeJobs,
    activeJobs
  };
}

/**
 * Hook para jobs completos
 */
export function useCompletedJobs() {
  const { data: jobs, ...rest } = usePayrollJobs();
  
  const completedJobs = jobs?.filter(job => 
    job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
  ) || [];

  return {
    ...rest,
    data: completedJobs,
    completedJobs
  };
}

/**
 * Hook para jobs com erro
 */
export function useFailedJobs() {
  const { data: jobs, ...rest } = usePayrollJobs();
  
  const failedJobs = jobs?.filter(job => job.status === 'failed') || [];

  return {
    ...rest,
    data: failedJobs,
    failedJobs
  };
}

/**
 * Hook para gerenciar job específico
 */
export function useJobManagement(jobId: string) {
  const { data: job, isLoading, error } = usePayrollJob(jobId);
  const startJob = useStartPayrollJob();
  const pauseJob = usePausePayrollJob();
  const resumeJob = useResumePayrollJob();
  const cancelJob = useCancelPayrollJob();
  const deleteJob = useDeletePayrollJob();

  const canStart = job?.status === 'pending';
  const canPause = job?.status === 'running';
  const canResume = job?.status === 'pending';
  const canCancel = job?.status === 'running' || job?.status === 'pending';
  const canDelete = job?.status === 'completed' || job?.status === 'failed' || job?.status === 'cancelled';

  const handleStart = () => {
    if (jobId) startJob.mutate(jobId);
  };

  const handlePause = () => {
    if (jobId) pauseJob.mutate(jobId);
  };

  const handleResume = () => {
    if (jobId) resumeJob.mutate(jobId);
  };

  const handleCancel = () => {
    if (jobId) cancelJob.mutate(jobId);
  };

  const handleDelete = () => {
    if (jobId) deleteJob.mutate(jobId);
  };

  return {
    job,
    isLoading,
    error,
    canStart,
    canPause,
    canResume,
    canCancel,
    canDelete,
    startJob: handleStart,
    pauseJob: handlePause,
    resumeJob: handleResume,
    cancelJob: handleCancel,
    deleteJob: handleDelete,
    isStarting: startJob.isPending,
    isPausing: pauseJob.isPending,
    isResuming: resumeJob.isPending,
    isCancelling: cancelJob.isPending,
    isDeleting: deleteJob.isPending
  };
}

/**
 * Hook para processar folha de pagamento assincronamente
 */
export function useProcessPayrollAsync() {
  const createJob = useCreatePayrollJob();
  const startJob = useStartPayrollJob();

  const processPayroll = async (config: ProcessingJobConfig) => {
    try {
      // Criar job
      const job = await createJob.mutateAsync(config);
      
      // Iniciar processamento
      await startJob.mutateAsync(job.id);
      
      return job;
    } catch (error) {
      console.error('Erro ao processar folha assincronamente:', error);
      throw error;
    }
  };

  return {
    processPayroll,
    isProcessing: createJob.isPending || startJob.isPending,
    error: createJob.error || startJob.error
  };
}
