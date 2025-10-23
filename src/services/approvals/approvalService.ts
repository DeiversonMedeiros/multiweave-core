import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export interface ApprovalConfig {
  id: string;
  company_id: string;
  processo_tipo: 'conta_pagar' | 'requisicao_compra' | 'cotacao_compra' | 'solicitacao_saida_material' | 'solicitacao_transferencia_material';
  centro_custo_id?: string;
  departamento?: string;
  classe_financeira?: string;
  usuario_id?: string;
  valor_limite?: number;
  nivel_aprovacao: number;
  aprovadores: Array<{
    user_id: string;
    is_primary: boolean;
    ordem: number;
  }>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Approval {
  id: string;
  company_id: string;
  processo_tipo: string;
  processo_id: string;
  nivel_aprovacao: number;
  aprovador_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
  data_aprovacao?: string;
  observacoes?: string;
  aprovador_original_id?: string;
  transferido_em?: string;
  transferido_por?: string;
  motivo_transferencia?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialExitRequest {
  id: string;
  company_id: string;
  funcionario_solicitante_id: string; // Quem solicita (auxiliar administrativo)
  funcionario_receptor_id: string; // Quem recebe o material (técnico)
  almoxarifado_id: string;
  centro_custo_id?: string;
  projeto_id?: string;
  data_solicitacao: string;
  data_aprovacao?: string;
  data_saida?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado' | 'entregue';
  valor_total?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialExitRequestItem {
  id: string;
  company_id: string;
  solicitacao_id: string;
  material_id: string;
  quantidade_solicitada: number;
  quantidade_entregue?: number;
  valor_unitario?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface EditHistory {
  id: string;
  company_id: string;
  processo_tipo: string;
  processo_id: string;
  usuario_editor_id: string;
  data_edicao: string;
  campos_alterados?: string[];
  valores_anteriores?: Record<string, any>;
  valores_novos?: Record<string, any>;
  aprovacoes_resetadas: boolean;
  data_reset?: string;
  created_at: string;
}

export class ApprovalService {
  // =====================================================
  // CONFIGURAÇÕES DE APROVAÇÃO
  // =====================================================

  static async getApprovalConfigs(companyId: string, filters?: {
    processo_tipo?: string;
    ativo?: boolean;
  }): Promise<ApprovalConfig[]> {
    try {
      // Usar query direta para debug
      let query = supabase
        .from('configuracoes_aprovacao_unificada')
        .select('*')
        .eq('company_id', companyId);
      
      if (filters?.processo_tipo) {
        query = query.eq('processo_tipo', filters.processo_tipo);
      }
      
      if (filters?.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar configurações de aprovação:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro na função getApprovalConfigs:', error);
      throw error;
    }
  }

  static async getApprovalConfig(id: string, companyId: string): Promise<ApprovalConfig | null> {
    try {
      const { data, error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar configuração de aprovação:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Erro na função getApprovalConfig:', error);
      throw error;
    }
  }

  static async createApprovalConfig(data: Omit<ApprovalConfig, 'id' | 'created_at' | 'updated_at'>, companyId: string): Promise<ApprovalConfig> {
    try {
      const { data: result, error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .insert({ ...data, company_id: companyId })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar configuração de aprovação:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Erro na função createApprovalConfig:', error);
      throw error;
    }
  }

  static async updateApprovalConfig(id: string, data: Partial<ApprovalConfig>, companyId: string): Promise<ApprovalConfig> {
    try {
      const { data: result, error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .update(data)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar configuração de aprovação:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Erro na função updateApprovalConfig:', error);
      throw error;
    }
  }

  static async deleteApprovalConfig(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('configuracoes_aprovacao_unificada')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Erro ao excluir configuração de aprovação:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro na função deleteApprovalConfig:', error);
      throw error;
    }
  }

  // =====================================================
  // APROVAÇÕES
  // =====================================================

  static async getPendingApprovals(userId: string, companyId: string): Promise<Approval[]> {
    try {
      const { data, error } = await supabase.rpc('get_pending_approvals_for_user', {
        p_user_id: userId,
        p_company_id: companyId
      });

      if (error) {
        console.error('Erro ao buscar aprovações pendentes:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Erro na função getPendingApprovals:', error);
      throw error;
    }
  }

  static async getApprovalsByProcess(processo_tipo: string, processo_id: string, companyId: string): Promise<Approval[]> {
    try {
      const { data, error } = await supabase
        .from('aprovacoes_unificada')
        .select('*')
        .eq('company_id', companyId)
        .eq('processo_tipo', processo_tipo)
        .eq('processo_id', processo_id);
      
      if (error) {
        console.error('Erro ao buscar aprovações por processo:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro na função getApprovalsByProcess:', error);
      throw error;
    }
  }

  static async processApproval(
    aprovacao_id: string,
    status: 'aprovado' | 'rejeitado' | 'cancelado',
    observacoes: string,
    aprovador_id: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('process_approval', {
        p_aprovacao_id: aprovacao_id,
        p_status: status,
        p_observacoes: observacoes,
        p_aprovador_id: aprovador_id
      });

      if (error) {
        console.error('Erro ao processar aprovação:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função processApproval:', error);
      throw error;
    }
  }

  static async transferApproval(
    aprovacao_id: string,
    novo_aprovador_id: string,
    motivo: string,
    transferido_por: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('transfer_approval', {
        p_aprovacao_id: aprovacao_id,
        p_novo_aprovador_id: novo_aprovador_id,
        p_motivo: motivo,
        p_transferido_por: transferido_por
      });

      if (error) {
        console.error('Erro ao transferir aprovação:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função transferApproval:', error);
      throw error;
    }
  }

  static async createApprovalsForProcess(
    processo_tipo: string,
    processo_id: string,
    companyId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('create_approvals_for_process', {
        p_processo_tipo: processo_tipo,
        p_processo_id: processo_id,
        p_company_id: companyId
      });

      if (error) {
        console.error('Erro ao criar aprovações:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função createApprovalsForProcess:', error);
      throw error;
    }
  }

  static async resetApprovalsAfterEdit(
    processo_tipo: string,
    processo_id: string,
    companyId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('reset_approvals_after_edit', {
        p_processo_tipo: processo_tipo,
        p_processo_id: processo_id,
        p_company_id: companyId
      });

      if (error) {
        console.error('Erro ao resetar aprovações:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função resetApprovalsAfterEdit:', error);
      throw error;
    }
  }

  static async canEditSolicitation(processo_tipo: string, processo_id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('can_edit_solicitation', {
        p_processo_tipo: processo_tipo,
        p_processo_id: processo_id
      });

      if (error) {
        console.error('Erro ao verificar permissão de edição:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro na função canEditSolicitation:', error);
      throw error;
    }
  }

  // =====================================================
  // SAÍDAS DE MATERIAIS
  // =====================================================

  static async getMaterialExitRequests(companyId: string, filters?: {
    funcionario_solicitante_id?: string;
    almoxarifado_id?: string;
    status?: string;
  }): Promise<MaterialExitRequest[]> {
    try {
      const result = await EntityService.list({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        filters: filters || {}
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Erro na função getMaterialExitRequests:', error);
      throw error;
    }
  }

  static async getMaterialExitRequest(id: string, companyId: string): Promise<MaterialExitRequest | null> {
    try {
      const result = await EntityService.get({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        id
      });
      
      return result.data || null;
    } catch (error) {
      console.error('Erro na função getMaterialExitRequest:', error);
      throw error;
    }
  }

  static async createMaterialExitRequest(data: Omit<MaterialExitRequest, 'id' | 'created_at' | 'updated_at'>, companyId: string): Promise<MaterialExitRequest> {
    try {
      const result = await EntityService.create({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        data: { ...data, company_id: companyId }
      });
      
      return result.data;
    } catch (error) {
      console.error('Erro na função createMaterialExitRequest:', error);
      throw error;
    }
  }

  static async updateMaterialExitRequest(id: string, data: Partial<MaterialExitRequest>, companyId: string): Promise<MaterialExitRequest> {
    try {
      const result = await EntityService.update({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        id,
        data
      });
      
      return result.data;
    } catch (error) {
      console.error('Erro na função updateMaterialExitRequest:', error);
      throw error;
    }
  }

  static async deleteMaterialExitRequest(id: string, companyId: string): Promise<void> {
    try {
      await EntityService.delete({
        schema: 'almoxarifado',
        table: 'solicitacoes_saida_materiais',
        companyId,
        id
      });
    } catch (error) {
      console.error('Erro na função deleteMaterialExitRequest:', error);
      throw error;
    }
  }

  // =====================================================
  // HISTÓRICO DE EDIÇÕES
  // =====================================================

  static async getEditHistory(processo_tipo: string, processo_id: string, companyId: string): Promise<EditHistory[]> {
    try {
      const { data, error } = await supabase
        .from('historico_edicoes_solicitacoes')
        .select('*')
        .eq('company_id', companyId)
        .eq('processo_tipo', processo_tipo)
        .eq('processo_id', processo_id)
        .order('data_edicao', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar histórico de edições:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro na função getEditHistory:', error);
      throw error;
    }
  }

  static async createEditHistory(data: Omit<EditHistory, 'id' | 'created_at'>, companyId: string): Promise<EditHistory> {
    try {
      const { data: result, error } = await supabase
        .from('historico_edicoes_solicitacoes')
        .insert({ ...data, company_id: companyId })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar histórico de edição:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Erro na função createEditHistory:', error);
      throw error;
    }
  }
}
