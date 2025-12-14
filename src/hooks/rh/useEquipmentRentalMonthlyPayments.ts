// =====================================================
// HOOKS PARA PAGAMENTOS MENSAIS DE ALUGUEL DE EQUIPAMENTOS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMonthlyPayments,
  processMonthlyRentals,
  approveMonthlyPayment,
  rejectMonthlyPayment,
  calculateMonthlyValue,
  getMonthlyPaymentById,
  sendToFlash,
  generateFlashInvoice,
  sendToAccountsPayable,
  sendMultipleToFlash,
  sendMultipleToAccountsPayable,
  sendMultipleToFlashByCostCenter,
  EquipmentRentalMonthlyPayment,
  ProcessMonthlyRentalsParams,
  ApproveMonthlyPaymentParams,
  RejectMonthlyPaymentParams
} from '@/services/rh/equipmentRentalMonthlyPaymentsService';
import { useCompany } from '@/lib/company-context';

/**
 * Hook para listar pagamentos mensais
 */
export function useMonthlyPayments(filters?: {
  monthReference?: number;
  yearReference?: number;
  status?: EquipmentRentalMonthlyPayment['status'];
  employeeId?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['equipment-rental-monthly-payments', selectedCompany?.id, filters],
    queryFn: () => listMonthlyPayments(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
  });
}

/**
 * Hook para buscar pagamento por ID
 */
export function useMonthlyPayment(paymentId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['equipment-rental-monthly-payment', paymentId, selectedCompany?.id],
    queryFn: () => getMonthlyPaymentById(paymentId, selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id && !!paymentId,
  });
}

/**
 * Hook para processar pagamentos mensais
 */
export function useProcessMonthlyRentals() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (params: Omit<ProcessMonthlyRentalsParams, 'companyId'>) =>
      processMonthlyRentals({
        ...params,
        companyId: selectedCompany?.id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
    },
  });
}

/**
 * Hook para aprovar pagamento mensal
 */
export function useApproveMonthlyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ApproveMonthlyPaymentParams) => approveMonthlyPayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payment'] });
    },
  });
}

/**
 * Hook para rejeitar pagamento mensal
 */
export function useRejectMonthlyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RejectMonthlyPaymentParams) => rejectMonthlyPayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payment'] });
    },
  });
}

/**
 * Hook para calcular valor mensal
 */
export function useCalculateMonthlyValue(
  equipmentRentalApprovalId: string | null,
  monthReference: number,
  yearReference: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [
      'calculate-monthly-value',
      equipmentRentalApprovalId,
      monthReference,
      yearReference,
    ],
    queryFn: () =>
      calculateMonthlyValue(
        equipmentRentalApprovalId!,
        monthReference,
        yearReference
      ),
    enabled: enabled && !!equipmentRentalApprovalId,
  });
}

/**
 * Hook para enviar pagamento para Flash
 */
export function useSendToFlash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => sendToFlash(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payment'] });
    },
  });
}

/**
 * Hook para gerar boleto Flash
 */
export function useGenerateFlashInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => generateFlashInvoice(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payment'] });
    },
  });
}

/**
 * Hook para enviar pagamento para Contas a Pagar
 */
export function useSendToAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, dueDate }: { paymentId: string; dueDate?: Date }) =>
      sendToAccountsPayable(paymentId, dueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payment'] });
    },
  });
}

/**
 * Hook para enviar múltiplos pagamentos para Flash
 */
export function useSendMultipleToFlash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentIds: string[]) => sendMultipleToFlash(paymentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
    },
  });
}

/**
 * Hook para enviar múltiplos pagamentos para Contas a Pagar
 */
export function useSendMultipleToAccountsPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentIds, dueDate }: { paymentIds: string[]; dueDate?: Date }) =>
      sendMultipleToAccountsPayable(paymentIds, dueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
    },
  });
}

/**
 * Hook para enviar múltiplos pagamentos agrupados por centro de custo
 */
export function useSendMultipleToFlashByCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentIds: string[]) => sendMultipleToFlashByCostCenter(paymentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-rental-monthly-payments'] });
    },
  });
}

