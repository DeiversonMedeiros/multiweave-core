// =====================================================
// SERVIÇO DE PAGAMENTOS MENSAIS DE ALUGUEL DE EQUIPAMENTOS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface EquipmentRentalMonthlyPayment {
  id: string;
  equipment_rental_approval_id: string;
  employee_id: string;
  company_id: string;
  month_reference: number;
  year_reference: number;
  valor_base: number;
  dias_trabalhados: number;
  dias_ausencia: number;
  desconto_ausencia: number;
  valor_calculado: number;
  valor_aprovado: number | null;
  status: 'pendente_aprovacao' | 'aprovado' | 'rejeitado' | 'enviado_flash' | 'boleto_gerado' | 'enviado_contas_pagar' | 'pago' | 'cancelado';
  aprovado_por: string | null;
  aprovado_em: string | null;
  observacoes_aprovacao: string | null;
  flash_payment_id: string | null;
  flash_invoice_id: string | null;
  flash_account_number: string | null;
  accounts_payable_id: string | null;
  processado_por: string | null;
  processado_em: string | null;
  enviado_flash_em: string | null;
  enviado_contas_pagar_em: string | null;
  cost_center_id: string | null;
  classe_financeira_id: string | null;
  created_at: string;
  updated_at: string;
  // Relações
  employee?: {
    id: string;
    nome: string;
    matricula: string;
  };
  equipment_rental?: {
    id: string;
    tipo_equipamento: string;
    valor_mensal: number;
  };
}

export interface ProcessMonthlyRentalsParams {
  companyId: string;
  monthReference: number;
  yearReference: number;
}

export interface ApproveMonthlyPaymentParams {
  paymentId: string;
  valorAprovado?: number;
  observacoes?: string;
}

export interface RejectMonthlyPaymentParams {
  paymentId: string;
  observacoes: string;
}

/**
 * Lista pagamentos mensais de aluguéis para gestor
 */
export async function listMonthlyPaymentsForManager(
  companyId: string,
  userId: string,
  filters?: {
    monthReference?: number;
    yearReference?: number;
    status?: EquipmentRentalMonthlyPayment['status'];
  }
): Promise<EquipmentRentalMonthlyPayment[]> {
  try {
    const { data, error } = await supabase.rpc('get_equipment_rental_monthly_payments_for_manager', {
      p_company_id: companyId,
      p_user_id: userId,
      p_month_reference: filters?.monthReference || null,
      p_year_reference: filters?.yearReference || null,
      p_status: filters?.status || null
    });

    if (error) {
      throw error;
    }

    // A função RPC já retorna funcionario_nome, funcionario_matricula e tipo_equipamento
    // Mapear os dados para o formato esperado pela página
    const paymentsWithRelations = (data || []).map((payment: any) => {
      return {
        ...payment,
        // Usar funcionario_nome retornado pela RPC
        employee: {
          id: payment.employee_id,
          nome: payment.funcionario_nome || 'N/A',
          matricula: payment.funcionario_matricula || 'N/A'
        },
        // Usar tipo_equipamento retornado pela RPC
        equipment_rental: payment.tipo_equipamento ? {
          id: payment.equipment_rental_approval_id,
          tipo_equipamento: payment.tipo_equipamento,
          valor_mensal: payment.valor_base || 0
        } : undefined,
        // Garantir que campos numéricos não sejam null/undefined
        dias_trabalhados: payment.dias_trabalhados ?? 0,
        dias_ausencia: payment.dias_ausencia ?? 0,
        desconto_ausencia: payment.desconto_ausencia ?? 0,
        valor_base: payment.valor_base ?? 0,
        valor_calculado: payment.valor_calculado ?? 0,
        valor_aprovado: payment.valor_aprovado ?? null
      };
    });

    return paymentsWithRelations;
  } catch (error) {
    console.error('Erro ao listar pagamentos mensais para gestor:', error);
    throw error;
  }
}

/**
 * Lista pagamentos mensais de aluguéis
 */
export async function listMonthlyPayments(
  companyId: string,
  filters?: {
    monthReference?: number;
    yearReference?: number;
    status?: EquipmentRentalMonthlyPayment['status'];
    employeeId?: string;
  }
): Promise<EquipmentRentalMonthlyPayment[]> {
  try {
    // Usar RPC function para buscar dados com relações
    const { data, error } = await supabase.rpc('list_equipment_rental_monthly_payments', {
      p_company_id: companyId,
      p_month_reference: filters?.monthReference || null,
      p_year_reference: filters?.yearReference || null,
      p_status: filters?.status || null,
      p_employee_id: filters?.employeeId || null
    });

    if (error) {
      throw error;
    }

    return (data || []) as EquipmentRentalMonthlyPayment[];
  } catch (error) {
    console.error('Erro ao listar pagamentos mensais:', error);
    throw error;
  }
}

/**
 * Processa pagamentos mensais de aluguéis
 */
export async function processMonthlyRentals(
  params: ProcessMonthlyRentalsParams
): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('process_monthly_equipment_rentals', {
      p_company_id: params.companyId,
      p_month_reference: params.monthReference,
      p_year_reference: params.yearReference,
      p_processed_by: user.id
    });

    if (error) {
      throw error;
    }

    return data as number;
  } catch (error) {
    console.error('Erro ao processar pagamentos mensais:', error);
    throw error;
  }
}

/**
 * Aprova pagamento mensal
 */
export async function approveMonthlyPayment(
  params: ApproveMonthlyPaymentParams
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('approve_monthly_equipment_rental_payment', {
      p_payment_id: params.paymentId,
      p_approved_by: user.id,
      p_valor_aprovado: params.valorAprovado || null,
      p_observacoes: params.observacoes || null
    });

    if (error) {
      throw error;
    }

    return data as boolean;
  } catch (error) {
    console.error('Erro ao aprovar pagamento mensal:', error);
    throw error;
  }
}

/**
 * Rejeita pagamento mensal
 */
export async function rejectMonthlyPayment(
  params: RejectMonthlyPaymentParams
): Promise<boolean> {
  try {
    if (!params.observacoes || params.observacoes.trim() === '') {
      throw new Error('Observações são obrigatórias para rejeitar um pagamento');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('reject_monthly_equipment_rental_payment', {
      p_payment_id: params.paymentId,
      p_rejected_by: user.id,
      p_observacoes: params.observacoes
    });

    if (error) {
      throw error;
    }

    return data as boolean;
  } catch (error) {
    console.error('Erro ao rejeitar pagamento mensal:', error);
    throw error;
  }
}

/**
 * Calcula valor mensal de um aluguel
 */
export async function calculateMonthlyValue(
  equipmentRentalApprovalId: string,
  monthReference: number,
  yearReference: number
): Promise<{
  valor_base: number;
  dias_trabalhados: number;
  dias_ausencia: number;
  desconto_ausencia: number;
  valor_calculado: number;
}> {
  try {
    const { data, error } = await supabase.rpc('calculate_equipment_rental_monthly_value', {
      p_equipment_rental_approval_id: equipmentRentalApprovalId,
      p_month_reference: monthReference,
      p_year_reference: yearReference
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Não foi possível calcular o valor mensal');
    }

    return data[0];
  } catch (error) {
    console.error('Erro ao calcular valor mensal:', error);
    throw error;
  }
}

/**
 * Busca pagamento por ID
 */
export async function getMonthlyPaymentById(
  paymentId: string,
  companyId: string
): Promise<EquipmentRentalMonthlyPayment | null> {
  try {
    // Usar RPC function para buscar pagamento por ID com relações
    const { data: payments, error } = await supabase.rpc('list_equipment_rental_monthly_payments', {
      p_company_id: companyId,
      p_month_reference: null,
      p_year_reference: null,
      p_status: null,
      p_employee_id: null
    });

    if (error) {
      throw error;
    }

    // Encontrar o pagamento específico
    const payment = payments?.find((p: any) => p.id === paymentId);
    return payment || null;
  } catch (error) {
    console.error('Erro ao buscar pagamento por ID:', error);
    throw error;
  }
}

/**
 * Envia pagamento para Flash
 */
export async function sendToFlash(paymentId: string): Promise<{
  success: boolean;
  payment_id: string;
  flash_account_number?: string;
  flash_payment_id?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('send_equipment_rental_to_flash', {
      p_payment_id: paymentId,
      p_sent_by: user.id
    });

    if (error) {
      throw error;
    }

    return data as any;
  } catch (error) {
    console.error('Erro ao enviar para Flash:', error);
    throw error;
  }
}

/**
 * Gera boleto Flash
 */
export async function generateFlashInvoice(paymentId: string): Promise<{
  success: boolean;
  payment_id: string;
  flash_invoice_id?: string;
  invoice_url?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('generate_flash_invoice', {
      p_payment_id: paymentId,
      p_sent_by: user.id
    });

    if (error) {
      throw error;
    }

    return data as any;
  } catch (error) {
    console.error('Erro ao gerar boleto Flash:', error);
    throw error;
  }
}

/**
 * Envia pagamento para Contas a Pagar
 */
export async function sendToAccountsPayable(
  paymentId: string,
  dueDate?: Date
): Promise<{
  success: boolean;
  payment_id: string;
  accounts_payable_id?: string;
  numero_titulo?: string;
  data_vencimento?: string;
  message?: string;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('send_equipment_rental_to_accounts_payable', {
      p_payment_id: paymentId,
      p_sent_by: user.id,
      p_due_date: dueDate ? dueDate.toISOString().split('T')[0] : null
    });

    if (error) {
      throw error;
    }

    return data as any;
  } catch (error) {
    console.error('Erro ao enviar para Contas a Pagar:', error);
    throw error;
  }
}

/**
 * Envia múltiplos pagamentos para Flash
 */
export async function sendMultipleToFlash(paymentIds: string[]): Promise<{
  success: boolean;
  total: number;
  success_count: number;
  error_count: number;
  results: any[];
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('send_multiple_payments_to_flash', {
      p_payment_ids: paymentIds,
      p_sent_by: user.id
    });

    if (error) {
      throw error;
    }

    return data as any;
  } catch (error) {
    console.error('Erro ao enviar múltiplos pagamentos para Flash:', error);
    throw error;
  }
}

/**
 * Envia múltiplos pagamentos para Contas a Pagar
 */
export async function sendMultipleToAccountsPayable(
  paymentIds: string[],
  dueDate?: Date
): Promise<{
  success: boolean;
  total: number;
  success_count: number;
  error_count: number;
  results: any[];
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('send_multiple_payments_to_accounts_payable', {
      p_payment_ids: paymentIds,
      p_sent_by: user.id,
      p_due_date: dueDate ? dueDate.toISOString().split('T')[0] : null
    });

    if (error) {
      throw error;
    }

    return data as any;
  } catch (error) {
    console.error('Erro ao enviar múltiplos pagamentos para Contas a Pagar:', error);
    throw error;
  }
}

/**
 * Envia múltiplos pagamentos agrupados por centro de custo para Flash
 */
export async function sendMultipleToFlashByCostCenter(
  paymentIds: string[]
): Promise<{
  success: boolean;
  total_pagamentos: number;
  total_erros: number;
  results: any[];
  message: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase.rpc('send_multiple_equipment_rentals_to_flash_by_cost_center', {
      p_payment_ids: paymentIds,
      p_sent_by: user.id
    });

    if (error) {
      throw error;
    }

    return data as any;
  } catch (error) {
    console.error('Erro ao enviar múltiplos pagamentos agrupados por centro de custo:', error);
    throw error;
  }
}

