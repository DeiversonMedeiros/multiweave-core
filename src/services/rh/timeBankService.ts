// =====================================================
// SERVIÇO DE BANCO DE HORAS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { TimeBank, TimeBankCreateData, TimeBankUpdateData, TimeBankFilters } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getTimeBankEntries(
  companyId: string,
  filters: TimeBankFilters = {}
): Promise<{ data: TimeBank[]; totalCount: number }> {
  try {
    const result = await EntityService.list<TimeBank>({
      schema: 'rh',
      table: 'time_bank',
      companyId,
      filters,
      orderBy: 'data_registro',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

export async function getTimeBankEntryById(
  id: string,
  companyId: string
): Promise<TimeBank | null> {
  try {
    return await EntityService.getById<TimeBank>({
      schema: 'rh',
      table: 'time_bank',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

export async function createTimeBankEntry(
  timeBankData: TimeBankCreateData
): Promise<TimeBank> {
  try {
    return await EntityService.create<TimeBank>({
      schema: 'rh',
      table: 'time_bank',
      companyId: timeBankData.company_id,
      data: timeBankData
    });
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

export async function updateTimeBankEntry(
  timeBankData: TimeBankUpdateData
): Promise<TimeBank> {
  try {
    const { id, company_id, ...updateData } = timeBankData;

    return await EntityService.update<TimeBank>({
      schema: 'rh',
      table: 'time_bank',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

export async function deleteTimeBankEntry(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'time_bank',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getTimeBankTypeLabel(tipo: string): string {
  const tipos = {
    extra: 'Hora Extra',
    compensatoria: 'Hora Compensatória',
    sobreaviso: 'Sobreaviso',
    adicional_noturno: 'Adicional Noturno'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getTimeBankTypeColor(tipo: string): string {
  const cores = {
    extra: 'bg-orange-100 text-orange-800',
    compensatoria: 'bg-blue-100 text-blue-800',
    sobreaviso: 'bg-purple-100 text-purple-800',
    adicional_noturno: 'bg-gray-100 text-gray-800'
  };
  return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getTimeBankStatusLabel(status: string): string {
  const statusMap = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    negado: 'Negado',
    utilizado: 'Utilizado',
    expirado: 'Expirado'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getTimeBankStatusColor(status: string): string {
  const cores = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aprovado: 'bg-green-100 text-green-800',
    negado: 'bg-red-100 text-red-800',
    utilizado: 'bg-blue-100 text-blue-800',
    expirado: 'bg-gray-100 text-gray-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function formatHours(hours: number): string {
  const hoursInt = Math.floor(hours);
  const minutes = Math.round((hours - hoursInt) * 60);
  return `${hoursInt}h${minutes.toString().padStart(2, '0')}min`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DO BANCO DE HORAS
// =====================================================

export async function getEmployeeTimeBankBalance(
  employeeId: string,
  companyId: string
): Promise<{
  total_aprovado: number;
  total_utilizado: number;
  saldo_disponivel: number;
  por_tipo: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase.rpc('get_employee_time_bank_balance', {
      employee_id_param: employeeId,
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar saldo do banco de horas:', error);
      throw new Error(`Erro ao buscar saldo do banco de horas: ${error.message}`);
    }

    return data || {
      total_aprovado: 0,
      total_utilizado: 0,
      saldo_disponivel: 0,
      por_tipo: {}
    };
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

export async function approveTimeBankEntry(
  id: string,
  companyId: string,
  approvedBy: string,
  observacoes?: string
): Promise<TimeBank> {
  try {
    return await EntityService.update<TimeBank>({
      schema: 'rh',
      table: 'time_bank',
      companyId: companyId,
      id: id,
      data: {
        status: 'aprovado',
        aprovado_por: approvedBy,
        data_aprovacao: new Date().toISOString(),
        observacoes: observacoes
      }
    });
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}

export async function rejectTimeBankEntry(
  id: string,
  companyId: string,
  rejectedBy: string,
  observacoes?: string
): Promise<TimeBank> {
  try {
    return await EntityService.update<TimeBank>({
      schema: 'rh',
      table: 'time_bank',
      companyId: companyId,
      id: id,
      data: {
        status: 'negado',
        aprovado_por: rejectedBy,
        data_aprovacao: new Date().toISOString(),
        observacoes: observacoes
      }
    });
  } catch (error) {
    console.error('Erro no serviço de banco de horas:', error);
    throw error;
  }
}
