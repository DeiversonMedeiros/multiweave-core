import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface EventApprovalResult {
  success: boolean;
  approvedCount: number;
  rejectedCount: number;
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ApprovalHistory {
  id: string;
  event_id: string;
  action: 'approved' | 'rejected';
  user_id: string;
  user_name: string;
  reason?: string;
  created_at: string;
}

export interface EventApprovalFilters {
  eventIds?: string[];
  employeeId?: string;
  eventType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// =====================================================
// SERVIÇO DE APROVAÇÃO DE EVENTOS
// =====================================================

export class EventApprovalService {
  /**
   * Aprova múltiplos eventos
   */
  static async approveEvents(
    eventIds: string[],
    approvedBy: string,
    companyId: string
  ): Promise<EventApprovalResult> {
    try {
      if (eventIds.length === 0) {
        throw new Error('Nenhum evento selecionado para aprovação');
      }

      const result: EventApprovalResult = {
        success: true,
        approvedCount: 0,
        rejectedCount: 0,
        errors: []
      };

      // Aprovar eventos em lote
      const { data, error } = await supabase
        .from('rh.payroll_events')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', eventIds)
        .eq('company_id', companyId)
        .select('id');

      if (error) {
        throw new Error(`Erro ao aprovar eventos: ${error.message}`);
      }

      result.approvedCount = data?.length || 0;

      // Registrar histórico de aprovação
      await this.recordApprovalHistory(eventIds, 'approved', approvedBy, companyId);

      // Verificar se todos os eventos foram aprovados
      if (result.approvedCount !== eventIds.length) {
        result.errors.push(`${eventIds.length - result.approvedCount} eventos não puderam ser aprovados`);
      }

      return result;

    } catch (error) {
      console.error('Erro ao aprovar eventos:', error);
      return {
        success: false,
        approvedCount: 0,
        rejectedCount: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Rejeita múltiplos eventos
   */
  static async rejectEvents(
    eventIds: string[],
    rejectedBy: string,
    reason: string,
    companyId: string
  ): Promise<EventApprovalResult> {
    try {
      if (eventIds.length === 0) {
        throw new Error('Nenhum evento selecionado para rejeição');
      }

      if (!reason.trim()) {
        throw new Error('Motivo da rejeição é obrigatório');
      }

      const result: EventApprovalResult = {
        success: true,
        approvedCount: 0,
        rejectedCount: 0,
        errors: []
      };

      // Rejeitar eventos em lote
      const { data, error } = await supabase
        .from('rh.payroll_events')
        .update({
          status: 'rejected',
          rejected_by: rejectedBy,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .in('id', eventIds)
        .eq('company_id', companyId)
        .select('id');

      if (error) {
        throw new Error(`Erro ao rejeitar eventos: ${error.message}`);
      }

      result.rejectedCount = data?.length || 0;

      // Registrar histórico de rejeição
      await this.recordApprovalHistory(eventIds, 'rejected', rejectedBy, companyId, reason);

      // Verificar se todos os eventos foram rejeitados
      if (result.rejectedCount !== eventIds.length) {
        result.errors.push(`${eventIds.length - result.rejectedCount} eventos não puderam ser rejeitados`);
      }

      return result;

    } catch (error) {
      console.error('Erro ao rejeitar eventos:', error);
      return {
        success: false,
        approvedCount: 0,
        rejectedCount: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Valida eventos antes da aprovação/rejeição
   */
  static async validateEvents(
    eventIds: string[],
    companyId: string
  ): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Buscar eventos
      const { data: events, error } = await supabase
        .from('rh.payroll_events')
        .select('*')
        .in('id', eventIds)
        .eq('company_id', companyId);

      if (error) {
        throw new Error(`Erro ao buscar eventos: ${error.message}`);
      }

      if (!events || events.length === 0) {
        errors.push('Nenhum evento encontrado');
        return { isValid: false, errors, warnings };
      }

      // Verificar se todos os eventos foram encontrados
      if (events.length !== eventIds.length) {
        errors.push(`${eventIds.length - events.length} eventos não foram encontrados`);
      }

      // Validar cada evento
      for (const event of events) {
        // Verificar se já foi processado
        if (event.status === 'processed') {
          errors.push(`Evento ${event.codigo_rubrica} já foi processado`);
        }

        // Verificar se já foi aprovado
        if (event.status === 'approved') {
          warnings.push(`Evento ${event.codigo_rubrica} já foi aprovado`);
        }

        // Verificar se já foi rejeitado
        if (event.status === 'rejected') {
          warnings.push(`Evento ${event.codigo_rubrica} já foi rejeitado`);
        }

        // Verificar valores
        if (event.valor_total === 0 && event.tipo_rubrica !== 'informacao') {
          warnings.push(`Evento ${event.codigo_rubrica} tem valor zero`);
        }

        // Verificar se tem funcionário válido
        if (!event.employee_id) {
          errors.push(`Evento ${event.codigo_rubrica} não tem funcionário associado`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      console.error('Erro ao validar eventos:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        warnings: []
      };
    }
  }

  /**
   * Busca histórico de aprovações de um evento
   */
  static async getApprovalHistory(
    eventId: string,
    companyId: string
  ): Promise<ApprovalHistory[]> {
    try {
      const { data, error } = await supabase
        .from('rh.event_approval_history')
        .select(`
          id,
          event_id,
          action,
          user_id,
          user_name,
          reason,
          created_at
        `)
        .eq('event_id', eventId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao buscar histórico de aprovação:', error);
      return [];
    }
  }

  /**
   * Busca eventos com filtros
   */
  static async getEvents(
    companyId: string,
    filters: EventApprovalFilters = {}
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('rh.payroll_events')
        .select(`
          *,
          employees!inner(nome, cpf),
          rubricas!inner(codigo, nome, tipo)
        `)
        .eq('company_id', companyId);

      // Aplicar filtros
      if (filters.eventIds && filters.eventIds.length > 0) {
        query = query.in('id', filters.eventIds);
      }

      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      if (filters.eventType) {
        query = query.eq('tipo_rubrica', filters.eventType);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar eventos: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Aprova eventos em lote com validação
   */
  static async approveEventsBatch(
    eventIds: string[],
    approvedBy: string,
    companyId: string
  ): Promise<EventApprovalResult> {
    try {
      // Validar eventos primeiro
      const validation = await this.validateEvents(eventIds, companyId);
      
      if (!validation.isValid) {
        return {
          success: false,
          approvedCount: 0,
          rejectedCount: 0,
          errors: validation.errors
        };
      }

      // Mostrar warnings se houver
      if (validation.warnings.length > 0) {
        console.warn('Warnings na validação:', validation.warnings);
      }

      // Aprovar eventos
      return await this.approveEvents(eventIds, approvedBy, companyId);

    } catch (error) {
      console.error('Erro ao aprovar eventos em lote:', error);
      return {
        success: false,
        approvedCount: 0,
        rejectedCount: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Rejeita eventos em lote com validação
   */
  static async rejectEventsBatch(
    eventIds: string[],
    rejectedBy: string,
    reason: string,
    companyId: string
  ): Promise<EventApprovalResult> {
    try {
      // Validar eventos primeiro
      const validation = await this.validateEvents(eventIds, companyId);
      
      if (!validation.isValid) {
        return {
          success: false,
          approvedCount: 0,
          rejectedCount: 0,
          errors: validation.errors
        };
      }

      // Rejeitar eventos
      return await this.rejectEvents(eventIds, rejectedBy, reason, companyId);

    } catch (error) {
      console.error('Erro ao rejeitar eventos em lote:', error);
      return {
        success: false,
        approvedCount: 0,
        rejectedCount: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Registra histórico de aprovação/rejeição
   */
  private static async recordApprovalHistory(
    eventIds: string[],
    action: 'approved' | 'rejected',
    userId: string,
    companyId: string,
    reason?: string
  ): Promise<void> {
    try {
      const historyRecords = eventIds.map(eventId => ({
        event_id: eventId,
        action,
        user_id: userId,
        user_name: 'Usuário Atual', // TODO: Buscar nome do usuário
        reason,
        company_id: companyId,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('rh.event_approval_history')
        .insert(historyRecords);

      if (error) {
        console.error('Erro ao registrar histórico:', error);
        // Não falhar a operação principal por causa do histórico
      }

    } catch (error) {
      console.error('Erro ao registrar histórico de aprovação:', error);
    }
  }

  /**
   * Estatísticas de aprovação
   */
  static async getApprovalStats(
    companyId: string,
    period?: string
  ): Promise<{
    totalEvents: number;
    pendingEvents: number;
    approvedEvents: number;
    rejectedEvents: number;
    processedEvents: number;
  }> {
    try {
      let query = supabase
        .from('rh.payroll_events')
        .select('status')
        .eq('company_id', companyId);

      if (period) {
        const [year, month] = period.split('-');
        query = query
          .eq('ano_referencia', parseInt(year))
          .eq('mes_referencia', parseInt(month));
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      const stats = {
        totalEvents: data?.length || 0,
        pendingEvents: data?.filter(e => e.status === 'pending').length || 0,
        approvedEvents: data?.filter(e => e.status === 'approved').length || 0,
        rejectedEvents: data?.filter(e => e.status === 'rejected').length || 0,
        processedEvents: data?.filter(e => e.status === 'processed').length || 0,
      };

      return stats;

    } catch (error) {
      console.error('Erro ao buscar estatísticas de aprovação:', error);
      return {
        totalEvents: 0,
        pendingEvents: 0,
        approvedEvents: 0,
        rejectedEvents: 0,
        processedEvents: 0,
      };
    }
  }
}
