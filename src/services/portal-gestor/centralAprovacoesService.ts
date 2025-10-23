import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AprovacaoItem {
  id: string;
  tipo: 'ferias' | 'compensacao' | 'atestado' | 'reembolso' | 'equipamento' | 'correcao_ponto';
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
    // Por enquanto, retornar array vazio para evitar erros PGRST205
    // TODO: Implementar RPC functions para buscar aprovações
    console.log('Buscando aprovações para companyId:', companyId, 'filters:', filters);
    
    return [];

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
    const { data, error } = await supabase.rpc('get_pending_approvals_for_user', {
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
      default:
        throw new Error(`Tipo de aprovação desconhecido: ${tipo}`);
    }

    const { data, error } = await supabase.rpc(rpcFunction, rpcParams);

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