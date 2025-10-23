import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface DashboardStats {
  total_funcionarios: number;
  solicitacoes_pendentes: number;
  ferias_pendentes: number;
  compensacoes_pendentes: number;
  atestados_pendentes: number;
  reembolsos_pendentes: number;
  equipamentos_pendentes: number;
  correcoes_pendentes: number;
}

export interface RecentActivity {
  id: string;
  tipo: 'ferias' | 'compensacao' | 'atestado' | 'reembolso' | 'equipamento' | 'correcao_ponto';
  funcionario_nome: string;
  data_solicitacao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  descricao: string;
}

// =====================================================
// SERVIÇOS
// =====================================================

/**
 * Busca estatísticas do dashboard do gestor
 */
export async function getGestorDashboardStats(companyId: string): Promise<DashboardStats> {
  try {
    const { data, error } = await supabase.rpc('get_gestor_dashboard_stats', {
      company_uuid: companyId
    });

    if (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      throw error;
    }

    return data || {
      total_funcionarios: 0,
      solicitacoes_pendentes: 0,
      ferias_pendentes: 0,
      compensacoes_pendentes: 0,
      atestados_pendentes: 0,
      reembolsos_pendentes: 0,
      equipamentos_pendentes: 0,
      correcoes_pendentes: 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    throw error;
  }
}

/**
 * Busca atividades recentes do gestor
 */
export async function getGestorRecentActivities(
  companyId: string, 
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    const { data, error } = await supabase.rpc('get_gestor_recent_activities', {
      company_uuid: companyId,
      limit_count: limit
    });

    if (error) {
      console.error('Erro ao buscar atividades recentes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error);
    throw error;
  }
}

/**
 * Busca estatísticas do dashboard usando queries diretas (fallback)
 */
export async function getGestorDashboardStatsDirect(companyId: string): Promise<DashboardStats> {
  try {
    console.log('Buscando estatísticas para companyId:', companyId);
    
    // Buscar total de funcionários ativos
    const funcionariosResult = await EntityService.list({
      schema: 'rh',
      table: 'employees',
      companyId: companyId,
      filters: { status: 'ativo' },
      count: true
    });
    
    const totalFuncionarios = funcionariosResult.totalCount || 0;

    // Buscar férias pendentes
    const feriasResult = await EntityService.list({
      schema: 'rh',
      table: 'vacations',
      companyId: companyId,
      filters: { status: 'pendente' },
      count: true
    });
    const feriasPendentes = feriasResult.totalCount || 0;

    // Buscar compensações pendentes
    const compensacoesResult = await EntityService.list({
      schema: 'rh',
      table: 'compensation_requests',
      companyId: companyId,
      filters: { status: 'pendente' },
      count: true
    });
    const compensacoesPendentes = compensacoesResult.totalCount || 0;

    // Buscar atestados pendentes
    const atestadosResult = await EntityService.list({
      schema: 'rh',
      table: 'medical_certificates',
      companyId: companyId,
      filters: { status: 'pendente' },
      count: true
    });
    const atestadosPendentes = atestadosResult.totalCount || 0;

    // Buscar reembolsos pendentes
    const reembolsosResult = await EntityService.list({
      schema: 'rh',
      table: 'reimbursement_requests',
      companyId: companyId,
      filters: { status: 'pendente' },
      count: true
    });
    const reembolsosPendentes = reembolsosResult.totalCount || 0;

    // Buscar equipamentos pendentes
    const equipamentosResult = await EntityService.list({
      schema: 'rh',
      table: 'equipment_rental_approvals',
      companyId: companyId,
      filters: { status: 'pendente' },
      count: true
    });
    const equipamentosPendentes = equipamentosResult.totalCount || 0;

    // Buscar correções pendentes
    const correcoesResult = await EntityService.list({
      schema: 'rh',
      table: 'attendance_corrections',
      companyId: companyId,
      filters: { status: 'pendente' },
      count: true
    });
    const correcoesPendentes = correcoesResult.totalCount || 0;

    const solicitacoesPendentes = (feriasPendentes || 0) + 
                                 (compensacoesPendentes || 0) + 
                                 (atestadosPendentes || 0) + 
                                 (reembolsosPendentes || 0) + 
                                 (equipamentosPendentes || 0) + 
                                 (correcoesPendentes || 0);

    return {
      total_funcionarios: totalFuncionarios || 0,
      solicitacoes_pendentes: solicitacoesPendentes,
      ferias_pendentes: feriasPendentes || 0,
      compensacoes_pendentes: compensacoesPendentes || 0,
      atestados_pendentes: atestadosPendentes || 0,
      reembolsos_pendentes: reembolsosPendentes || 0,
      equipamentos_pendentes: equipamentosPendentes || 0,
      correcoes_pendentes: correcoesPendentes || 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard (método direto):', error);
    throw error;
  }
}

/**
 * Busca atividades recentes usando queries diretas (fallback)
 */
export async function getGestorRecentActivitiesDirect(
  companyId: string, 
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    // Por enquanto, retornar array vazio para evitar erros PGRST205
    // TODO: Implementar RPC functions para buscar atividades recentes
    console.log('Buscando atividades recentes para companyId:', companyId, 'limit:', limit);
    
    return [];

  } catch (error) {
    console.error('Erro ao buscar atividades recentes (método direto):', error);
    throw error;
  }
}
