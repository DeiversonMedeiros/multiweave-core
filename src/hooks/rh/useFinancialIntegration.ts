import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { 
  FinancialIntegrationService, 
  AccountsPayable, 
  FinancialReport, 
  IntegrationConfig,
  PayrollToAPMapping 
} from '@/services/rh/financialIntegrationService';
import { toast } from 'sonner';

// =====================================================
// HOOKS PARA INTEGRAÇÃO FINANCEIRA
// =====================================================

/**
 * Hook para buscar contas a pagar da folha
 */
export function usePayrollAccountsPayable(companyId: string, period?: string) {
  const integrationService = FinancialIntegrationService.getInstance();

  return useQuery({
    queryKey: ['payroll-accounts-payable', companyId, period],
    queryFn: async () => {
      if (!companyId) return [];

      // Buscar contas a pagar relacionadas à folha
      const { data, error } = await supabase
        .from('financeiro.accounts_payable')
        .select('*')
        .eq('company_id', companyId)
        .eq('document_type', 'payroll')
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar contas a pagar: ${error.message}`);
      }

      return (data || []) as AccountsPayable[];

    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para gerar relatório financeiro
 */
export function useFinancialReport(companyId: string, period: string) {
  const integrationService = FinancialIntegrationService.getInstance();

  return useQuery({
    queryKey: ['financial-report', companyId, period],
    queryFn: async () => {
      if (!companyId || !period) return null;

      return await integrationService.generateFinancialReport(companyId, period);
    },
    enabled: !!companyId && !!period,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar configuração de integração
 */
export function useIntegrationConfig(companyId: string) {
  const integrationService = FinancialIntegrationService.getInstance();

  return useQuery({
    queryKey: ['integration-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      return await integrationService.getIntegrationConfig(companyId);
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}

/**
 * Hook para salvar configuração de integração
 */
export function useSaveIntegrationConfig() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const integrationService = FinancialIntegrationService.getInstance();

  return useMutation({
    mutationFn: async (config: IntegrationConfig) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      await integrationService.saveIntegrationConfig(selectedCompany.id, config);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['integration-config'] });
      toast.success('Configuração de integração salva com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração de integração');
    }
  });
}

/**
 * Hook para gerar contas a pagar da folha
 */
export function useGenerateAccountsPayable() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const integrationService = FinancialIntegrationService.getInstance();

  return useMutation({
    mutationFn: async ({ 
      payrollData, 
      config 
    }: { 
      payrollData: any[]; 
      config: IntegrationConfig; 
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await integrationService.generateAccountsPayableFromPayroll(
        selectedCompany.id,
        payrollData,
        config
      );
    },
    onSuccess: (accountsPayable) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['financial-report'] });
      
      toast.success(`${accountsPayable.length} contas a pagar criadas com sucesso`);
    },
    onError: (error) => {
      console.error('Erro ao gerar contas a pagar:', error);
      toast.error('Erro ao gerar contas a pagar');
    }
  });
}

/**
 * Hook para sincronizar folha com contas a pagar
 */
export function useSyncPayrollWithAP() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const integrationService = FinancialIntegrationService.getInstance();

  return useMutation({
    mutationFn: async (payrollId: string) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await integrationService.syncPayrollWithAccountsPayable(
        selectedCompany.id,
        payrollId
      );
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['payroll-accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['financial-report'] });
      
      toast.success('Folha sincronizada com contas a pagar');
    },
    onError: (error) => {
      console.error('Erro ao sincronizar folha:', error);
      toast.error('Erro ao sincronizar folha com contas a pagar');
    }
  });
}

/**
 * Hook para buscar estatísticas financeiras
 */
export function useFinancialStats(companyId: string, period: string) {
  const { data: report, ...rest } = useFinancialReport(companyId, period);

  const stats = {
    totalPayroll: report?.totalPayroll || 0,
    totalDeductions: report?.totalDeductions || 0,
    netPayroll: report?.netPayroll || 0,
    totalEmployees: report?.summary.totalEmployees || 0,
    averageSalary: report?.summary.averageSalary || 0,
    totalCosts: report?.summary.totalCosts || 0,
    accountsPayableCount: report?.accountsPayable.length || 0,
    pendingAP: report?.accountsPayable.filter(ap => ap.status === 'pending').length || 0,
    paidAP: report?.accountsPayable.filter(ap => ap.status === 'paid').length || 0
  };

  return {
    ...rest,
    data: stats,
    stats
  };
}

/**
 * Hook para buscar contas a pagar por status
 */
export function useAccountsPayableByStatus(companyId: string, status: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.status === status) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar pendentes
 */
export function usePendingAccountsPayable(companyId: string) {
  return useAccountsPayableByStatus(companyId, 'pending');
}

/**
 * Hook para buscar contas a pagar pagas
 */
export function usePaidAccountsPayable(companyId: string) {
  return useAccountsPayableByStatus(companyId, 'paid');
}

/**
 * Hook para buscar contas a pagar aprovadas
 */
export function useApprovedAccountsPayable(companyId: string) {
  return useAccountsPayableByStatus(companyId, 'approved');
}

/**
 * Hook para buscar contas a pagar canceladas
 */
export function useCancelledAccountsPayable(companyId: string) {
  return useAccountsPayableByStatus(companyId, 'cancelled');
}

/**
 * Hook para buscar contas a pagar por período
 */
export function useAccountsPayableByPeriod(companyId: string, period: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => 
    ap.document_number.includes(`FOLHA-${period}`)
  ) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por funcionário
 */
export function useAccountsPayableByEmployee(companyId: string, employeeId: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.employee_id === employeeId) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por centro de custo
 */
export function useAccountsPayableByCostCenter(companyId: string, costCenterId: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.cost_center_id === costCenterId) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por valor
 */
export function useAccountsPayableByAmount(companyId: string, minAmount: number, maxAmount: number) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => 
    ap.amount >= minAmount && ap.amount <= maxAmount
  ) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por data de vencimento
 */
export function useAccountsPayableByDueDate(companyId: string, startDate: string, endDate: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => 
    ap.due_date >= startDate && ap.due_date <= endDate
  ) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por categoria
 */
export function useAccountsPayableByCategory(companyId: string, category: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.category === category) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por fornecedor
 */
export function useAccountsPayableBySupplier(companyId: string, supplierId: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.supplier_id === supplierId) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por documento
 */
export function useAccountsPayableByDocument(companyId: string, documentNumber: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => 
    ap.document_number.includes(documentNumber)
  ) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por tipo de documento
 */
export function useAccountsPayableByDocumentType(companyId: string, documentType: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.document_type === documentType) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por criador
 */
export function useAccountsPayableByCreator(companyId: string, createdBy: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => ap.created_by === createdBy) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por data de criação
 */
export function useAccountsPayableByCreatedDate(companyId: string, startDate: string, endDate: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => 
    ap.created_at >= startDate && ap.created_at <= endDate
  ) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}

/**
 * Hook para buscar contas a pagar por data de atualização
 */
export function useAccountsPayableByUpdatedDate(companyId: string, startDate: string, endDate: string) {
  const { data: allAP, ...rest } = usePayrollAccountsPayable(companyId);

  const filteredAP = allAP?.filter(ap => 
    ap.updated_at >= startDate && ap.updated_at <= endDate
  ) || [];

  return {
    ...rest,
    data: filteredAP,
    accountsPayable: filteredAP
  };
}
