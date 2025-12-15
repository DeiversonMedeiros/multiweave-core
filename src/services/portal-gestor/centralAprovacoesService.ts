import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AprovacaoItem {
  id: string;
  tipo: 'ferias' | 'compensacao' | 'atestado' | 'reembolso' | 'equipamento' | 'correcao_ponto' | 'registro_ponto' | 'assinatura_ponto' | 'requisicao_compra';
  funcionario_nome: string;
  funcionario_matricula: string;
  data_solicitacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  descricao: string;
  dias?: number;
  horas?: number;
  valor?: number;
  observacoes?: string;
}

export interface AprovacaoFilters {
  status?: string;
  tipo?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface ApprovalFilters {
  search?: string;
  status?: string;
  tipo?: string;
}

// =====================================================
// SERVIÇOS
// =====================================================

/**
 * Busca todas as aprovações com filtros
 */
export async function getAprovacoes(
  companyId: string, 
  filters: AprovacaoFilters = {}
): Promise<AprovacaoItem[]> {
  try {
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Usar a função RPC unificada que retorna aprovações formatadas
    // Inclui férias, compensações, financeiro e também requisicoes_compra
    const { data, error } = await supabase.rpc('get_pending_approvals_unified_for_user', {
      p_user_id: user.id,
      p_company_id: companyId
    });

    if (error) {
      console.error('Erro ao buscar aprovações pendentes:', error);
      throw error;
    }

    let aprovacoes = (data || []) as AprovacaoItem[];

    // Aplicar filtros adicionais
    if (filters.status && filters.status !== 'todos') {
      aprovacoes = aprovacoes.filter(aprovacao => aprovacao.status === filters.status);
    }

    if (filters.tipo && filters.tipo !== 'todos') {
      aprovacoes = aprovacoes.filter(aprovacao => aprovacao.tipo === filters.tipo);
    }

    return aprovacoes;

  } catch (error) {
    console.error('Erro ao buscar aprovações:', error);
    throw error;
  }
}

/**
 * Busca aprovações pendentes com filtros
 */
export async function getPendingApprovals(companyId: string, userId: string, filters: ApprovalFilters): Promise<AprovacaoItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_pending_approvals_unified_for_user', {
      p_user_id: userId,
      p_company_id: companyId
    });

    if (error) {
      console.error('Erro ao buscar aprovações pendentes:', error);
      throw error;
    }

    let aprovacoes = data || [];

    // Aplicar filtros adicionais
    if (filters.search) {
      aprovacoes = aprovacoes.filter(aprovacao =>
        aprovacao.funcionario_nome.toLowerCase().includes(filters.search!.toLowerCase()) ||
        aprovacao.funcionario_matricula.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'todos') {
      aprovacoes = aprovacoes.filter(aprovacao => aprovacao.status === filters.status);
    }

    if (filters.tipo && filters.tipo !== 'todos') {
      aprovacoes = aprovacoes.filter(aprovacao => aprovacao.tipo === filters.tipo);
    }

    return aprovacoes;

  } catch (error) {
    console.error('Erro ao buscar aprovações pendentes:', error);
    throw error;
  }
}

/**
 * Aprova uma solicitação
 */
export async function approveRequest(payload: { tipo: AprovacaoItem['tipo']; id: string; observacoes?: string }): Promise<boolean> {
  try {
    const { tipo, id, observacoes } = payload;
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    let rpcFunction: string;
    let rpcParams: any = {};

    switch (tipo) {
      case 'ferias':
        rpcFunction = 'approve_vacation';
        rpcParams = { vacation_id: id, approved_by: user.id, observacoes };
        break;
      case 'compensacao':
        rpcFunction = 'approve_compensation';
        rpcParams = { compensation_id: id, approved_by: user.id, observacoes };
        break;
      case 'atestado':
        rpcFunction = 'approve_medical_certificate';
        rpcParams = { certificate_id: id, approved_by: user.id, observacoes };
        break;
      case 'reembolso':
        rpcFunction = 'approve_reimbursement';
        rpcParams = { reimbursement_id: id, approved_by: user.id, observacoes };
        break;
      case 'equipamento':
        rpcFunction = 'approve_equipment';
        rpcParams = { equipment_id: id, approved_by: user.id, observacoes };
        break;
      case 'correcao_ponto':
        rpcFunction = 'approve_attendance_correction';
        rpcParams = { correction_id: id, approved_by: user.id, observacoes };
        break;
      case 'registro_ponto':
        rpcFunction = 'approve_time_record';
        rpcParams = { p_time_record_id: id, p_approved_by: user.id, p_observacoes: observacoes };
        break;
      case 'assinatura_ponto':
        rpcFunction = 'approve_time_record_signature';
        rpcParams = { p_signature_id: id, p_approved_by: user.id, p_observacoes: observacoes };
        break;
      case 'requisicao_compra':
        rpcFunction = 'process_approval';
        rpcParams = { 
          p_aprovacao_id: id, 
          p_status: 'aprovado', 
          p_observacoes: observacoes || null,
          p_aprovador_id: user.id
        };
        console.log('[CentralAprovacoes] Chamando process_approval para requisicao_compra:', {
          rpcParams,
          userId: user.id,
        });
        break;
      default:
        throw new Error(`Tipo de aprovação desconhecido: ${tipo}`);
    }

    const { data, error } = await supabase.rpc(rpcFunction, rpcParams);

    console.log('[CentralAprovacoes] Resultado RPC approveRequest:', {
      tipo,
      id,
      rpcFunction,
      data,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
    });

    if (error) {
      console.error(`Erro ao aprovar ${tipo}:`, error);
      throw error;
    }

    return data as boolean;

  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    throw error;
  }
}

/**
 * Rejeita uma solicitação
 */
export async function rejectRequest(payload: { tipo: AprovacaoItem['tipo']; id: string; observacoes: string }): Promise<boolean> {
  try {
    const { tipo, id, observacoes } = payload;
    
    if (!observacoes) {
      throw new Error('Observações são obrigatórias para rejeitar uma solicitação.');
    }
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    let rpcFunction: string;
    let rpcParams: any = {};

    switch (tipo) {
      case 'ferias':
        rpcFunction = 'reject_vacation';
        rpcParams = { vacation_id: id, rejected_by: user.id, observacoes };
        break;
      case 'compensacao':
        rpcFunction = 'reject_compensation';
        rpcParams = { compensation_id: id, rejected_by: user.id, observacoes };
        break;
      case 'atestado':
        rpcFunction = 'reject_medical_certificate';
        rpcParams = { certificate_id: id, rejected_by: user.id, observacoes };
        break;
      case 'reembolso':
        rpcFunction = 'reject_reimbursement';
        rpcParams = { reimbursement_id: id, rejected_by: user.id, observacoes };
        break;
      case 'equipamento':
        rpcFunction = 'reject_equipment';
        rpcParams = { equipment_id: id, rejected_by: user.id, observacoes };
        break;
      case 'correcao_ponto':
        rpcFunction = 'reject_attendance_correction';
        rpcParams = { correction_id: id, rejected_by: user.id, observacoes };
        break;
      case 'registro_ponto':
        rpcFunction = 'reject_time_record';
        rpcParams = { p_time_record_id: id, p_rejected_by: user.id, p_observacoes: observacoes };
        break;
      case 'assinatura_ponto':
        rpcFunction = 'reject_time_record_signature';
        rpcParams = { p_signature_id: id, p_rejected_by: user.id, p_rejection_reason: observacoes };
        break;
      case 'requisicao_compra':
        rpcFunction = 'process_approval';
        rpcParams = { 
          p_aprovacao_id: id, 
          p_status: 'rejeitado', 
          p_observacoes: observacoes,
          p_aprovador_id: user.id
        };
        break;
      default:
        throw new Error(`Tipo de rejeição desconhecido: ${tipo}`);
    }

    const { data, error } = await supabase.rpc(rpcFunction, rpcParams);

    if (error) {
      console.error(`Erro ao rejeitar ${tipo}:`, error);
      throw error;
    }

    return data as boolean;

  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    throw error;
  }
}