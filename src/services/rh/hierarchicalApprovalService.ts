import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// SERVIÇO DE APROVAÇÃO HIERÁRQUICA
// =====================================================

export interface ApprovalLevel {
  id: string;
  company_id: string;
  name: string;
  level_order: number;
  required_approvals: number;
  max_amount?: number;
  max_hours?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLevelApprover {
  id: string;
  approval_level_id: string;
  user_id: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  user?: {
    id: string;
    nome: string;
    email: string;
  };
}

export interface CompensationApproval {
  id: string;
  compensation_request_id: string;
  approval_level_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  approver?: {
    id: string;
    nome: string;
    email: string;
  };
  approval_level?: ApprovalLevel;
}

export interface ApprovalWorkflow {
  compensation_request_id: string;
  current_level: number;
  total_levels: number;
  approvals: CompensationApproval[];
  status: 'pending' | 'approved' | 'rejected';
  can_approve: boolean;
  next_approvers: ApprovalLevelApprover[];
}

export class HierarchicalApprovalService {
  /**
   * Lista níveis de aprovação da empresa
   */
  static async getApprovalLevels(companyId: string): Promise<ApprovalLevel[]> {
    try {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'approval_levels',
        companyId,
        filters: { is_active: true },
        orderBy: 'level_order'
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar níveis de aprovação:', error);
      throw error;
    }
  }

  /**
   * Cria um novo nível de aprovação
   */
  static async createApprovalLevel(
    companyId: string,
    data: Partial<ApprovalLevel>
  ): Promise<ApprovalLevel> {
    try {
      const result = await EntityService.create({
        schema: 'rh',
        table: 'approval_levels',
        companyId,
        data: {
          ...data,
          company_id: companyId
        }
      });

      return result.data;
    } catch (error) {
      console.error('Erro ao criar nível de aprovação:', error);
      throw error;
    }
  }

  /**
   * Atualiza um nível de aprovação
   */
  static async updateApprovalLevel(
    id: string,
    data: Partial<ApprovalLevel>
  ): Promise<ApprovalLevel> {
    try {
      const result = await EntityService.update({
        schema: 'rh',
        table: 'approval_levels',
        companyId: data.company_id || '',
        id,
        data
      });

      return result.data;
    } catch (error) {
      console.error('Erro ao atualizar nível de aprovação:', error);
      throw error;
    }
  }

  /**
   * Lista aprovadores de um nível
   */
  static async getLevelApprovers(levelId: string): Promise<ApprovalLevelApprover[]> {
    try {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'approval_level_approvers',
        companyId: '', // Não precisa de companyId para esta consulta
        filters: { 
          approval_level_id: levelId,
          is_active: true 
        },
        select: `
          *,
          user:profiles(id, nome, email)
        `
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar aprovadores do nível:', error);
      throw error;
    }
  }

  /**
   * Adiciona aprovador a um nível
   */
  static async addLevelApprover(
    levelId: string,
    userId: string,
    isPrimary: boolean = false
  ): Promise<ApprovalLevelApprover> {
    try {
      const result = await EntityService.create({
        schema: 'rh',
        table: 'approval_level_approvers',
        companyId: '', // Não precisa de companyId para esta operação
        data: {
          approval_level_id: levelId,
          user_id: userId,
          is_primary: isPrimary
        }
      });

      return result.data;
    } catch (error) {
      console.error('Erro ao adicionar aprovador:', error);
      throw error;
    }
  }

  /**
   * Remove aprovador de um nível
   */
  static async removeLevelApprover(id: string): Promise<void> {
    try {
      await EntityService.update({
        schema: 'rh',
        table: 'approval_level_approvers',
        companyId: '', // Não precisa de companyId para esta operação
        id,
        data: { is_active: false }
      });
    } catch (error) {
      console.error('Erro ao remover aprovador:', error);
      throw error;
    }
  }

  /**
   * Busca workflow de aprovação de uma solicitação
   */
  static async getApprovalWorkflow(
    compensationRequestId: string
  ): Promise<ApprovalWorkflow | null> {
    try {
      const { data, error } = await supabase
        .from('rh.compensation_approvals')
        .select(`
          *,
          approver:profiles(id, nome, email),
          approval_level:rh.approval_levels(*)
        `)
        .eq('compensation_request_id', compensationRequestId)
        .order('created_at');

      if (error) throw error;

      if (!data || data.length === 0) {
        return null;
      }

      // Determinar status geral
      const hasRejected = data.some(a => a.status === 'rejected');
      const allApproved = data.every(a => a.status === 'approved');
      
      let status: 'pending' | 'approved' | 'rejected';
      if (hasRejected) {
        status = 'rejected';
      } else if (allApproved) {
        status = 'approved';
      } else {
        status = 'pending';
      }

      // Determinar nível atual
      const currentLevel = Math.max(...data.map(a => a.approval_level?.level_order || 0));
      const totalLevels = Math.max(...data.map(a => a.approval_level?.level_order || 0));

      return {
        compensation_request_id: compensationRequestId,
        current_level: currentLevel,
        total_levels: totalLevels,
        approvals: data,
        status,
        can_approve: false, // Será determinado pelo frontend baseado no usuário logado
        next_approvers: [] // Será preenchido pelo frontend
      };
    } catch (error) {
      console.error('Erro ao buscar workflow de aprovação:', error);
      throw error;
    }
  }

  /**
   * Aprova uma solicitação
   */
  static async approveCompensation(
    compensationRequestId: string,
    approverId: string,
    comments?: string
  ): Promise<CompensationApproval> {
    try {
      const { data, error } = await supabase
        .from('rh.compensation_approvals')
        .update({
          status: 'approved',
          comments,
          approved_at: new Date().toISOString()
        })
        .eq('compensation_request_id', compensationRequestId)
        .eq('approver_id', approverId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;

      // Verificar se todas as aprovações foram concluídas
      await this.checkAndUpdateCompensationStatus(compensationRequestId);

      return data;
    } catch (error) {
      console.error('Erro ao aprovar compensação:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma solicitação
   */
  static async rejectCompensation(
    compensationRequestId: string,
    approverId: string,
    comments: string
  ): Promise<CompensationApproval> {
    try {
      const { data, error } = await supabase
        .from('rh.compensation_approvals')
        .update({
          status: 'rejected',
          comments,
          approved_at: new Date().toISOString()
        })
        .eq('compensation_request_id', compensationRequestId)
        .eq('approver_id', approverId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;

      // Atualizar status da solicitação para rejeitada
      await supabase
        .from('rh.compensation_requests')
        .update({ status: 'rejeitado' })
        .eq('id', compensationRequestId);

      return data;
    } catch (error) {
      console.error('Erro ao rejeitar compensação:', error);
      throw error;
    }
  }

  /**
   * Verifica e atualiza status da solicitação baseado nas aprovações
   */
  static async checkAndUpdateCompensationStatus(
    compensationRequestId: string
  ): Promise<void> {
    try {
      // Buscar todas as aprovações
      const { data: approvals, error } = await supabase
        .from('rh.compensation_approvals')
        .select('status')
        .eq('compensation_request_id', compensationRequestId);

      if (error) throw error;

      if (!approvals || approvals.length === 0) {
        return;
      }

      // Verificar se todas foram aprovadas
      const allApproved = approvals.every(a => a.status === 'approved');
      const hasRejected = approvals.some(a => a.status === 'rejected');

      let newStatus: string;
      if (hasRejected) {
        newStatus = 'rejeitado';
      } else if (allApproved) {
        newStatus = 'aprovado';
      } else {
        return; // Ainda pendente
      }

      // Atualizar status da solicitação
      await supabase
        .from('rh.compensation_requests')
        .update({ status: newStatus })
        .eq('id', compensationRequestId);

    } catch (error) {
      console.error('Erro ao verificar status da compensação:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes de aprovação para um usuário
   */
  static async getPendingApprovalsForUser(
    userId: string,
    companyId: string
  ): Promise<CompensationApproval[]> {
    try {
      const { data, error } = await supabase
        .from('rh.compensation_approvals')
        .select(`
          *,
          compensation_request:rh.compensation_requests(*),
          approver:profiles(id, nome, email),
          approval_level:rh.approval_levels(*)
        `)
        .eq('approver_id', userId)
        .eq('status', 'pending')
        .eq('compensation_request.company_id', companyId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar aprovações pendentes:', error);
      throw error;
    }
  }

  /**
   * Cria aprovações necessárias para uma solicitação
   */
  static async createApprovalsForRequest(
    compensationRequestId: string,
    companyId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('create_compensation_approvals', {
        p_compensation_request_id: compensationRequestId,
        p_company_id: companyId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar aprovações:', error);
      throw error;
    }
  }
}
