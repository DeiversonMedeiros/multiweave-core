import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import {
  calculatePayroll,
  getCalculationLogs,
  getPayrolls,
  getPayrollEvents,
  getPayrollConfig,
  createPayrollConfig,
  PayrollCalculationParams,
  PayrollCalculationResult
} from '@/services/rh/payrollCalculationService';
import { CalculationLog, Payroll, PayrollEvent, PayrollConfig } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL - MOTOR DE CÁLCULO
// =====================================================

export function usePayrollCalculation() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PayrollCalculationParams) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await calculatePayroll({
        ...params,
        companyId: selectedCompany.id
      });
      
      return result;
    },
    onSuccess: (result) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['calculation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-events'] });
      
      console.log('Cálculo de folha concluído:', result);
    },
    onError: (error) => {
      console.error('Erro no cálculo de folha:', error);
    }
  });
}

// =====================================================
// HOOKS PARA LOGS DE CÁLCULO
// =====================================================

export function useCalculationLogs(filters: any = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['calculation-logs', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await getCalculationLogs(selectedCompany.id, filters);
      return {
        data: result.data,
        count: result.totalCount,
        hasMore: result.data.length >= 100
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 5000, // Refetch a cada 5 segundos para logs ativos
  });
}

export function useCalculationLog(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['calculation-log', selectedCompany?.id, id],
    queryFn: async () => {
      if (!selectedCompany?.id || !id) throw new Error('Parâmetros inválidos');
      
      const result = await getCalculationLogs(selectedCompany.id, { id });
      return result.data.length > 0 ? result.data[0] : null;
    },
    enabled: !!selectedCompany?.id && !!id,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: (data) => {
      // Refetch se o log ainda estiver processando
      return data?.status === 'processando' ? 2000 : false;
    },
  });
}

// =====================================================
// HOOKS PARA FOLHAS DE PAGAMENTO
// =====================================================

export function usePayrolls(filters: any = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payrolls', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await getPayrolls(selectedCompany.id, filters);
      return {
        data: result.data,
        count: result.totalCount,
        hasMore: result.data.length >= 100
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function usePayroll(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payroll', selectedCompany?.id, id],
    queryFn: async () => {
      if (!selectedCompany?.id || !id) throw new Error('Parâmetros inválidos');
      
      const result = await getPayrolls(selectedCompany.id, { id });
      return result.data.length > 0 ? result.data[0] : null;
    },
    enabled: !!selectedCompany?.id && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function usePayrollByPeriod(
  mesReferencia: number,
  anoReferencia: number,
  employeeId?: string
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payroll-period', selectedCompany?.id, mesReferencia, anoReferencia, employeeId],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const filters: any = {
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia
      };
      
      if (employeeId) {
        filters.employee_id = employeeId;
      }
      
      const result = await getPayrolls(selectedCompany.id, filters);
      return {
        data: result.data,
        count: result.totalCount
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// =====================================================
// HOOKS PARA EVENTOS DE FOLHA
// =====================================================

export function usePayrollEvents(
  payrollId?: string,
  employeeId?: string
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payroll-events', selectedCompany?.id, payrollId, employeeId],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await getPayrollEvents(selectedCompany.id, payrollId, employeeId);
      return {
        data: result.data,
        count: result.totalCount
      };
    },
    enabled: !!selectedCompany?.id && (!!payrollId || !!employeeId),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function usePayrollEventsByPeriod(
  mesReferencia: number,
  anoReferencia: number,
  employeeId?: string
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payroll-events-period', selectedCompany?.id, mesReferencia, anoReferencia, employeeId],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const filters: any = {
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia
      };
      
      if (employeeId) {
        filters.employee_id = employeeId;
      }
      
      const result = await getPayrollEvents(selectedCompany.id, undefined, employeeId);
      return {
        data: result.data.filter(event => 
          event.mes_referencia === mesReferencia && 
          event.ano_referencia === anoReferencia
        ),
        count: result.data.length
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

// =====================================================
// HOOKS PARA CONFIGURAÇÕES DE FOLHA
// =====================================================

export function usePayrollConfig(
  mesReferencia: number,
  anoReferencia: number
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['payroll-config', selectedCompany?.id, mesReferencia, anoReferencia],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await getPayrollConfig(selectedCompany.id, mesReferencia, anoReferencia);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useCreatePayrollConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (config: Omit<PayrollConfig, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await createPayrollConfig(selectedCompany.id, config);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-config'] });
    },
  });
}

// =====================================================
// HOOKS PARA ESTATÍSTICAS E RESUMOS
// =====================================================

export function usePayrollSummary(
  mesReferencia: number,
  anoReferencia: number
) {
  const { data: payrolls } = usePayrollByPeriod(mesReferencia, anoReferencia);
  const { data: events } = usePayrollEventsByPeriod(mesReferencia, anoReferencia);

  return {
    totalFuncionarios: payrolls?.count || 0,
    totalVencimentos: payrolls?.data.reduce((sum, p) => sum + (p.total_vencimentos || 0), 0) || 0,
    totalDescontos: payrolls?.data.reduce((sum, p) => sum + (p.total_descontos || 0), 0) || 0,
    totalLiquido: payrolls?.data.reduce((sum, p) => sum + (p.salario_liquido || 0), 0) || 0,
    totalEventos: events?.count || 0,
    isLoading: !payrolls || !events
  };
}

export function useCalculationProgress(processoId: string | undefined) {
  const { data: log } = useCalculationLog(processoId);

  return {
    log,
    isLoading: !log,
    progresso: log?.progresso || 0,
    status: log?.status || 'iniciado',
    isProcessing: log?.status === 'processando',
    isCompleted: log?.status === 'concluido',
    hasError: log?.status === 'erro',
    tempoExecucao: log?.tempo_execucao_segundos,
    logs: log?.logs_execucao || [],
    erros: log?.erros_execucao || []
  };
}
