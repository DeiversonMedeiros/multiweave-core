import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO DE NOTIFICAÇÕES
// =====================================================

export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  type: 'compensation_request' | 'compensation_approved' | 'compensation_rejected' | 'compensation_reminder';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  /**
   * Cria uma notificação
   */
  static async createNotification(
    userId: string,
    companyId: string,
    template: NotificationTemplate
  ): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          company_id: companyId,
          type: template.type,
          title: template.title,
          message: template.message,
          data: template.data,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Busca notificações do usuário
   */
  static async getUserNotifications(
    userId: string,
    companyId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  /**
   * Marca notificação como lida
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  static async markAllAsRead(userId: string, companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      throw error;
    }
  }

  /**
   * Conta notificações não lidas
   */
  static async getUnreadCount(userId: string, companyId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      throw error;
    }
  }

  /**
   * Notifica sobre nova solicitação de compensação
   */
  static async notifyNewCompensationRequest(
    employeeId: string,
    companyId: string,
    compensationData: any
  ): Promise<void> {
    try {
      // Buscar gestores da empresa
      const { data: managers, error: managersError } = await supabase
        .from('user_companies')
        .select(`
          user_id,
          profile:profiles(nome, permissoes)
        `)
        .eq('company_id', companyId)
        .eq('ativo', true);

      if (managersError) throw managersError;

      // Filtrar apenas gestores
      const managersToNotify = managers?.filter(manager => 
        manager.profile?.permissoes?.manager || 
        manager.profile?.permissoes?.admin
      ) || [];

      // Criar notificações para cada gestor
      for (const manager of managersToNotify) {
        await this.createNotification(
          manager.user_id,
          companyId,
          {
            type: 'compensation_request',
            title: 'Nova Solicitação de Compensação',
            message: `Nova solicitação de compensação de ${compensationData.quantidade_horas}h foi enviada para aprovação.`,
            data: {
              compensation_id: compensationData.id,
              employee_id: employeeId,
              hours: compensationData.quantidade_horas,
              date: compensationData.data_inicio
            }
          }
        );
      }
    } catch (error) {
      console.error('Erro ao notificar nova solicitação:', error);
    }
  }

  /**
   * Notifica sobre aprovação de compensação
   */
  static async notifyCompensationApproved(
    employeeId: string,
    companyId: string,
    compensationData: any
  ): Promise<void> {
    try {
      // Buscar dados do funcionário
      const { data: employee, error: employeeError } = await supabase
        .from('rh.employees')
        .select('user_id, nome')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee?.user_id) return;

      await this.createNotification(
        employee.user_id,
        companyId,
        {
          type: 'compensation_approved',
          title: 'Compensação Aprovada',
          message: `Sua solicitação de compensação de ${compensationData.quantidade_horas}h foi aprovada!`,
          data: {
            compensation_id: compensationData.id,
            hours: compensationData.quantidade_horas,
            date: compensationData.data_inicio
          }
        }
      );
    } catch (error) {
      console.error('Erro ao notificar aprovação:', error);
    }
  }

  /**
   * Notifica sobre rejeição de compensação
   */
  static async notifyCompensationRejected(
    employeeId: string,
    companyId: string,
    compensationData: any,
    reason: string
  ): Promise<void> {
    try {
      // Buscar dados do funcionário
      const { data: employee, error: employeeError } = await supabase
        .from('rh.employees')
        .select('user_id, nome')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee?.user_id) return;

      await this.createNotification(
        employee.user_id,
        companyId,
        {
          type: 'compensation_rejected',
          title: 'Compensação Rejeitada',
          message: `Sua solicitação de compensação foi rejeitada. Motivo: ${reason}`,
          data: {
            compensation_id: compensationData.id,
            hours: compensationData.quantidade_horas,
            date: compensationData.data_inicio,
            reason
          }
        }
      );
    } catch (error) {
      console.error('Erro ao notificar rejeição:', error);
    }
  }

  /**
   * Envia lembretes de compensações pendentes
   */
  static async sendPendingReminders(companyId: string): Promise<void> {
    try {
      // Buscar compensações pendentes há mais de 3 dias
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: pendingCompensations, error } = await supabase
        .from('rh.compensation_requests')
        .select(`
          id,
          employee_id,
          quantidade_horas,
          data_inicio,
          employee:rh.employees(user_id, nome)
        `)
        .eq('company_id', companyId)
        .eq('status', 'pendente')
        .lt('created_at', threeDaysAgo.toISOString());

      if (error) throw error;

      // Buscar gestores
      const { data: managers, error: managersError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('ativo', true);

      if (managersError) throw managersError;

      // Enviar lembretes
      for (const compensation of pendingCompensations || []) {
        for (const manager of managers || []) {
          await this.createNotification(
            manager.user_id,
            companyId,
            {
              type: 'compensation_reminder',
              title: 'Lembrete: Compensação Pendente',
              message: `Compensação de ${compensation.quantidade_horas}h de ${compensation.employee?.nome} está pendente há mais de 3 dias.`,
              data: {
                compensation_id: compensation.id,
                employee_id: compensation.employee_id,
                days_pending: Math.floor((new Date().getTime() - new Date(compensation.created_at).getTime()) / (1000 * 60 * 60 * 24))
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('Erro ao enviar lembretes:', error);
    }
  }
}
