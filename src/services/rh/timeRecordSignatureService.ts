import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface TimeRecordSignatureConfig {
  id?: string;
  company_id: string;
  is_enabled: boolean;
  signature_period_days: number;
  reminder_days: number;
  require_manager_approval: boolean;
  auto_close_month: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TimeRecordSignature {
  id: string;
  company_id: string;
  employee_id: string;
  month_year: string;
  signature_data?: any;
  signature_timestamp?: string;
  ip_address?: string;
  user_agent?: string;
  status: 'pending' | 'signed' | 'expired' | 'rejected' | 'approved';
  manager_approval_required: boolean;
  manager_approved_by?: string;
  manager_approved_at?: string;
  rejection_reason?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureNotification {
  id: string;
  company_id: string;
  employee_id: string;
  signature_id: string;
  notification_type: 'initial' | 'reminder' | 'expiration_warning' | 'expired';
  sent_at: string;
  sent_via: 'email' | 'sms' | 'system';
  status: 'sent' | 'delivered' | 'failed';
  created_at: string;
}

class TimeRecordSignatureService {
  // Configurações
  async getConfig(companyId: string): Promise<TimeRecordSignatureConfig> {
    console.log('🔍 [SERVICE] getConfig chamado para companyId:', companyId);
    
    const result = await EntityService.list({
      schema: 'rh',
      table: 'time_record_signature_config',
      companyId: companyId,
      filters: { company_id: companyId }
    });

    console.log('🔍 [SERVICE] Resultado da busca:', result);

    if (result.error) {
      console.error('❌ [SERVICE] Erro ao buscar configuração:', result.error);
      throw new Error(`Erro ao buscar configuração: ${result.error.message}`);
    }

    // Se não existe configuração, retorna uma padrão
    if (!result.data || result.data.length === 0) {
      console.log('🔧 [SERVICE] Nenhuma configuração encontrada, retornando padrão');
      const defaultConfig = {
        company_id: companyId,
        is_enabled: false,
        signature_period_days: 5,
        reminder_days: 3,
        require_manager_approval: true,
        auto_close_month: true,
      };
      console.log('🔧 [SERVICE] Configuração padrão:', defaultConfig);
      return defaultConfig;
    }

    console.log('✅ [SERVICE] Configuração encontrada:', result.data[0]);
    return result.data[0];
  }

  async updateConfig(config: TimeRecordSignatureConfig): Promise<TimeRecordSignatureConfig> {
    console.log('💾 [SERVICE] updateConfig chamado com:', config);
    
    try {
      // Usar RPC direto para atualizar a configuração
      const { data, error } = await (supabase.rpc as any)('update_time_record_signature_config', {
        p_id: config.id,
        p_company_id: config.company_id,
        p_is_enabled: config.is_enabled,
        p_signature_period_days: config.signature_period_days,
        p_reminder_days: config.reminder_days,
        p_require_manager_approval: config.require_manager_approval,
        p_auto_close_month: config.auto_close_month
      });

      console.log('💾 [SERVICE] Resultado da RPC:', { data, error });

      if (error) {
        console.error('❌ [SERVICE] Erro ao salvar configuração:', error);
        throw new Error(`Erro ao salvar configuração: ${error.message}`);
      }

      console.log('✅ [SERVICE] Configuração salva com sucesso:', data);
      return data;
    } catch (error) {
      console.error('❌ [SERVICE] Erro geral ao salvar configuração:', error);
      throw error;
    }
  }

  // Assinaturas
  async getEmployeeSignatures(employeeId: string, companyId: string): Promise<TimeRecordSignature[]> {
    console.log('🔍 [SERVICE] getEmployeeSignatures chamado:', { employeeId, companyId });
    
    const result = await EntityService.list({
      schema: 'rh',
      table: 'time_record_signatures',
      companyId: companyId,
      filters: { employee_id: employeeId },
      orderBy: 'month_year',
      orderDirection: 'DESC'
    });

    console.log('🔍 [SERVICE] Resultado da busca de assinaturas:', {
      hasError: !!result.error,
      error: result.error,
      dataLength: result.data?.length || 0,
      data: result.data
    });

    if (result.error) {
      console.error('❌ [SERVICE] Erro ao buscar assinaturas:', result.error);
      throw new Error(`Erro ao buscar assinaturas: ${result.error.message}`);
    }

    console.log('✅ [SERVICE] Assinaturas encontradas:', result.data?.length || 0);
    return result.data || [];
  }

  async getCompanySignatures(companyId: string, monthYear?: string): Promise<TimeRecordSignature[]> {
    const filters: any = {};
    if (monthYear) {
      filters.month_year = monthYear;
    }

    const result = await EntityService.list({
      schema: 'rh',
      table: 'time_record_signatures',
      companyId: companyId,
      filters: filters,
      orderBy: 'month_year',
      orderDirection: 'DESC'
    });

    if (result.error) {
      throw new Error(`Erro ao buscar assinaturas da empresa: ${result.error.message}`);
    }

    return result.data || [];
  }

  async signRecord(
    signatureId: string, 
    signatureData: any, 
    companyId: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<TimeRecordSignature> {
    const result = await EntityService.update({
      schema: 'rh',
      table: 'time_record_signatures',
      companyId: companyId,
      id: signatureId,
      data: {
        signature_data: signatureData,
        signature_timestamp: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'signed',
        updated_at: new Date().toISOString()
      }
    });

    if (result.error) {
      throw new Error(`Erro ao assinar registro: ${result.error.message}`);
    }

    return result.data;
  }

  async approveSignature(signatureId: string, managerId: string, companyId: string): Promise<TimeRecordSignature> {
    const result = await EntityService.update({
      schema: 'rh',
      table: 'time_record_signatures',
      companyId: companyId,
      id: signatureId,
      data: {
        manager_approved_by: managerId,
        manager_approved_at: new Date().toISOString(),
        status: 'approved',
        updated_at: new Date().toISOString()
      }
    });

    if (result.error) {
      throw new Error(`Erro ao aprovar assinatura: ${result.error.message}`);
    }

    return result.data;
  }

  async rejectSignature(signatureId: string, managerId: string, reason: string, companyId: string): Promise<TimeRecordSignature> {
    const result = await EntityService.update({
      schema: 'rh',
      table: 'time_record_signatures',
      companyId: companyId,
      id: signatureId,
      data: {
        manager_approved_by: managerId,
        manager_approved_at: new Date().toISOString(),
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      }
    });

    if (result.error) {
      throw new Error(`Erro ao rejeitar assinatura: ${result.error.message}`);
    }

    return result.data;
  }

  /**
   * Busca assinaturas de ponto pendentes de aprovação do gestor
   */
  async getPendingSignatures(companyId: string, userId?: string): Promise<any[]> {
    if (!userId) {
      // Se não tiver userId, buscar do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }
      userId = user.id;
    }

    const { data, error } = await (supabase.rpc as any)('get_pending_signatures', {
      p_company_id: companyId,
      p_user_id: userId
    });

    if (error) {
      console.error('Erro ao buscar assinaturas pendentes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Aprova uma assinatura de ponto usando RPC
   */
  async approveSignatureRPC(signatureId: string, approvedBy: string, observacoes?: string): Promise<boolean> {
    const { data, error } = await (supabase.rpc as any)('approve_time_record_signature', {
      p_signature_id: signatureId,
      p_approved_by: approvedBy,
      p_observacoes: observacoes || null
    });

    if (error) {
      console.error('Erro ao aprovar assinatura:', error);
      throw error;
    }

    return data as boolean;
  }

  /**
   * Rejeita uma assinatura de ponto usando RPC
   */
  async rejectSignatureRPC(signatureId: string, rejectedBy: string, rejectionReason: string): Promise<boolean> {
    const { data, error } = await (supabase.rpc as any)('reject_time_record_signature', {
      p_signature_id: signatureId,
      p_rejected_by: rejectedBy,
      p_rejection_reason: rejectionReason
    });

    if (error) {
      console.error('Erro ao rejeitar assinatura:', error);
      throw error;
    }

    return data as boolean;
  }

  // Método removido: generateMonthlySignatures
  // Use unlockSignaturesForMonth() ao invés, que já cria os registros
  // e controla a liberação/bloqueio de forma mais completa.

  // Processamento de assinaturas expiradas
  async processExpiredSignatures(): Promise<void> {
    const { error } = await (supabase.rpc as any)('process_expired_signatures');

    if (error) {
      throw new Error(`Erro ao processar assinaturas expiradas: ${error.message}`);
    }
  }

  // Estatísticas
  async getSignatureStats(companyId: string, monthYear?: string): Promise<any> {
    const { data, error } = await (supabase.rpc as any)('get_signature_stats', {
      p_company_id: companyId,
      p_month_year: monthYear
    });

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    return data?.[0] || {
      total_signatures: 0,
      pending_signatures: 0,
      signed_signatures: 0,
      expired_signatures: 0,
      rejected_signatures: 0,
      approved_signatures: 0
    };
  }

  // Notificações
  async getNotifications(employeeId: string, companyId: string): Promise<SignatureNotification[]> {
    const result = await EntityService.list({
      schema: 'rh',
      table: 'signature_notifications',
      companyId: companyId,
      filters: { employee_id: employeeId },
      orderBy: { field: 'created_at', ascending: false }
    });

    if (result.error) {
      throw new Error(`Erro ao buscar notificações: ${result.error.message}`);
    }

    return result.data || [];
  }

  async markNotificationAsRead(notificationId: string, companyId: string): Promise<void> {
    const result = await EntityService.update({
      schema: 'rh',
      table: 'signature_notifications',
      companyId: companyId,
      id: notificationId,
      data: { status: 'delivered' }
    });

    if (result.error) {
      throw new Error(`Erro ao marcar notificação como lida: ${result.error.message}`);
    }
  }

  // =====================================================
  // CONTROLE DE LIBERAÇÃO/BLOQUEIO POR MÊS/ANO
  // =====================================================

  /**
   * Libera assinaturas para um mês/ano específico
   */
  async unlockSignaturesForMonth(
    companyId: string,
    monthYear: string,
    notes?: string
  ): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await (supabase.rpc as any)('unlock_signatures_for_month', {
      p_company_id: companyId,
      p_month_year: monthYear,
      p_unlocked_by: user.id,
      p_notes: notes || null
    });

    if (error) {
      console.error('Erro ao liberar assinaturas:', error);
      throw new Error(`Erro ao liberar assinaturas: ${error.message}`);
    }

    return data;
  }

  /**
   * Bloqueia assinaturas para um mês/ano específico
   */
  async lockSignaturesForMonth(
    companyId: string,
    monthYear: string,
    notes?: string
  ): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await (supabase.rpc as any)('lock_signatures_for_month', {
      p_company_id: companyId,
      p_month_year: monthYear,
      p_locked_by: user.id,
      p_notes: notes || null
    });

    if (error) {
      console.error('Erro ao bloquear assinaturas:', error);
      throw new Error(`Erro ao bloquear assinaturas: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca estatísticas detalhadas de assinaturas para um mês/ano
   */
  async getMonthStats(companyId: string, monthYear: string): Promise<any> {
    const { data, error } = await (supabase.rpc as any)('get_signature_month_stats', {
      p_company_id: companyId,
      p_month_year: monthYear
    });

    if (error) {
      console.error('Erro ao buscar estatísticas do mês:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    return data || {
      month_year: monthYear,
      is_locked: false,
      total_employees: 0,
      total_signatures: 0,
      signed_count: 0,
      pending_count: 0,
      expired_count: 0,
      approved_count: 0,
      rejected_count: 0,
      not_signed_count: 0
    };
  }

  /**
   * Lista funcionários que assinaram/não assinaram para um mês/ano
   */
  async getEmployeeSignatureList(companyId: string, monthYear: string): Promise<any[]> {
    const { data, error } = await (supabase.rpc as any)('get_signature_employee_list', {
      p_company_id: companyId,
      p_month_year: monthYear
    });

    if (error) {
      console.error('Erro ao buscar lista de funcionários:', error);
      throw new Error(`Erro ao buscar lista de funcionários: ${error.message}`);
    }

    return (data || []) as any[];
  }

  /**
   * Busca apenas o status de liberação/bloqueio de um mês/ano
   */
  async getMonthStatus(companyId: string, monthYear: string): Promise<any> {
    const { data, error } = await (supabase.rpc as any)('get_signature_month_status', {
      p_company_id: companyId,
      p_month_year: monthYear
    });

    if (error) {
      console.error('Erro ao buscar status do mês:', error);
      throw new Error(`Erro ao buscar status do mês: ${error.message}`);
    }

    return data || {
      month_year: monthYear,
      is_locked: false,
      has_control: false
    };
  }
}

export const timeRecordSignatureService = new TimeRecordSignatureService();