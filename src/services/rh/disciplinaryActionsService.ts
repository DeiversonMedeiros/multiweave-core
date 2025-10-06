// =====================================================
// SERVIÇO DE AÇÕES DISCIPLINARES
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { DisciplinaryAction, DisciplinaryActionCreateData, DisciplinaryActionUpdateData, DisciplinaryActionFilters } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getDisciplinaryActions(
  companyId: string,
  filters: DisciplinaryActionFilters = {}
): Promise<{ data: DisciplinaryAction[]; totalCount: number }> {
  try {
    const result = await EntityService.list<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId,
      filters,
      orderBy: 'data_ocorrencia',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de ações disciplinares:', error);
    throw error;
  }
}

export async function getDisciplinaryActionById(
  id: string,
  companyId: string
): Promise<DisciplinaryAction | null> {
  try {
    return await EntityService.getById<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de ações disciplinares:', error);
    throw error;
  }
}

export async function createDisciplinaryAction(
  actionData: DisciplinaryActionCreateData
): Promise<DisciplinaryAction> {
  try {
    return await EntityService.create<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId: actionData.company_id,
      data: actionData
    });
  } catch (error) {
    console.error('Erro no serviço de ações disciplinares:', error);
    throw error;
  }
}

export async function updateDisciplinaryAction(
  actionData: DisciplinaryActionUpdateData
): Promise<DisciplinaryAction> {
  try {
    const { id, company_id, ...updateData } = actionData;

    return await EntityService.update<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de ações disciplinares:', error);
    throw error;
  }
}

export async function deleteDisciplinaryAction(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de ações disciplinares:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getActionTypeLabel(tipo: string): string {
  const tipos = {
    advertencia: 'Advertência',
    suspensao: 'Suspensão',
    demissao_justa_causa: 'Demissão por Justa Causa',
    transferencia: 'Transferência',
    outros: 'Outros'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getActionTypeColor(tipo: string): string {
  const cores = {
    advertencia: 'bg-yellow-100 text-yellow-800',
    suspensao: 'bg-orange-100 text-orange-800',
    demissao_justa_causa: 'bg-red-100 text-red-800',
    transferencia: 'bg-blue-100 text-blue-800',
    outros: 'bg-gray-100 text-gray-800'
  };
  return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getSeverityLabel(gravidade: string): string {
  const gravidades = {
    leve: 'Leve',
    moderada: 'Moderada',
    grave: 'Grave',
    gravissima: 'Gravíssima'
  };
  return gravidades[gravidade as keyof typeof gravidades] || gravidade;
}

export function getSeverityColor(gravidade: string): string {
  const cores = {
    leve: 'bg-green-100 text-green-800',
    moderada: 'bg-yellow-100 text-yellow-800',
    grave: 'bg-orange-100 text-orange-800',
    gravissima: 'bg-red-100 text-red-800'
  };
  return cores[gravidade as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getActionStatusLabel(status: string): string {
  const statusMap = {
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    cancelado: 'Cancelado',
    arquivado: 'Arquivado'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getActionStatusColor(status: string): string {
  const cores = {
    ativo: 'bg-blue-100 text-blue-800',
    suspenso: 'bg-yellow-100 text-yellow-800',
    cancelado: 'bg-gray-100 text-gray-800',
    arquivado: 'bg-purple-100 text-purple-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DAS AÇÕES DISCIPLINARES
// =====================================================

export async function getEmployeeDisciplinaryActions(
  employeeId: string,
  companyId: string
): Promise<DisciplinaryAction[]> {
  try {
    const result = await EntityService.list<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'data_ocorrencia',
      orderDirection: 'DESC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar ações disciplinares do funcionário:', error);
    throw error;
  }
}

export async function getActionsBySeverity(
  companyId: string,
  gravidade: string
): Promise<DisciplinaryAction[]> {
  try {
    const result = await EntityService.list<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId,
      filters: { gravidade: gravidade },
      orderBy: 'data_ocorrencia',
      orderDirection: 'DESC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar ações por gravidade:', error);
    throw error;
  }
}

export async function approveDisciplinaryAction(
  id: string,
  companyId: string,
  aprovadoPor: string,
  observacoes?: string
): Promise<DisciplinaryAction> {
  try {
    return await EntityService.update<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId: companyId,
      id: id,
      data: {
        aprovado_por: aprovadoPor,
        data_aprovacao: new Date().toISOString(),
        observacoes: observacoes
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar ação disciplinar:', error);
    throw error;
  }
}

export async function archiveDisciplinaryAction(
  id: string,
  companyId: string,
  motivoArquivamento: string
): Promise<DisciplinaryAction> {
  try {
    return await EntityService.update<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId: companyId,
      id: id,
      data: {
        status: 'arquivado',
        data_arquivamento: new Date().toISOString(),
        motivo_arquivamento: motivoArquivamento
      }
    });
  } catch (error) {
    console.error('Erro ao arquivar ação disciplinar:', error);
    throw error;
  }
}

export async function cancelDisciplinaryAction(
  id: string,
  companyId: string,
  motivoCancelamento: string
): Promise<DisciplinaryAction> {
  try {
    return await EntityService.update<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId: companyId,
      id: id,
      data: {
        status: 'cancelado',
        observacoes: motivoCancelamento
      }
    });
  } catch (error) {
    console.error('Erro ao cancelar ação disciplinar:', error);
    throw error;
  }
}

export async function getDisciplinaryActionStats(companyId: string) {
  try {
    const result = await EntityService.list<DisciplinaryAction>({
      schema: 'rh',
      table: 'disciplinary_actions',
      companyId,
      filters: {},
      orderBy: 'data_ocorrencia',
      orderDirection: 'DESC'
    });

    const actions = result.data;
    const stats = {
      total_actions: actions.length,
      by_type: {
        advertencia: actions.filter(action => action.tipo_acao === 'advertencia').length,
        suspensao: actions.filter(action => action.tipo_acao === 'suspensao').length,
        demissao_justa_causa: actions.filter(action => action.tipo_acao === 'demissao_justa_causa').length,
        transferencia: actions.filter(action => action.tipo_acao === 'transferencia').length,
        outros: actions.filter(action => action.tipo_acao === 'outros').length
      },
      by_severity: {
        leve: actions.filter(action => action.gravidade === 'leve').length,
        moderada: actions.filter(action => action.gravidade === 'moderada').length,
        grave: actions.filter(action => action.gravidade === 'grave').length,
        gravissima: actions.filter(action => action.gravidade === 'gravissima').length
      },
      by_status: {
        ativo: actions.filter(action => action.status === 'ativo').length,
        suspenso: actions.filter(action => action.status === 'suspenso').length,
        cancelado: actions.filter(action => action.status === 'cancelado').length,
        arquivado: actions.filter(action => action.status === 'arquivado').length
      },
      recent_actions: actions.filter(action => {
        const actionDate = new Date(action.data_ocorrencia);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return actionDate >= thirtyDaysAgo;
      }).length
    };

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas das ações disciplinares:', error);
    throw error;
  }
}
