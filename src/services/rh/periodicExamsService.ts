// =====================================================
// SERVIÇO DE EXAMES PERIÓDICOS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { PeriodicExam, PeriodicExamCreateData, PeriodicExamUpdateData, PeriodicExamFilters } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getPeriodicExams(
  companyId: string,
  filters: PeriodicExamFilters = {}
): Promise<{ data: PeriodicExam[]; totalCount: number }> {
  try {
    const result = await EntityService.list<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      filters,
      orderBy: 'data_agendamento',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de exames periódicos:', error);
    throw error;
  }
}

export async function getPeriodicExamById(
  id: string,
  companyId: string
): Promise<PeriodicExam | null> {
  try {
    return await EntityService.getById<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de exames periódicos:', error);
    throw error;
  }
}

export async function createPeriodicExam(
  examData: PeriodicExamCreateData
): Promise<PeriodicExam> {
  try {
    return await EntityService.create<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId: examData.company_id,
      data: examData
    });
  } catch (error) {
    console.error('Erro no serviço de exames periódicos:', error);
    throw error;
  }
}

export async function updatePeriodicExam(
  examData: PeriodicExamUpdateData
): Promise<PeriodicExam> {
  try {
    const { id, company_id, ...updateData } = examData;

    return await EntityService.update<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de exames periódicos:', error);
    throw error;
  }
}

export async function deletePeriodicExam(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'periodic_exams',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de exames periódicos:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getExamTypeLabel(tipo: string): string {
  const tipos = {
    admissional: 'Admissional',
    periodico: 'Periódico',
    demissional: 'Demissional',
    retorno_trabalho: 'Retorno ao Trabalho',
    mudanca_funcao: 'Mudança de Função',
    ambiental: 'Ambiental'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getExamTypeColor(tipo: string): string {
  const cores = {
    admissional: 'bg-green-100 text-green-800',
    periodico: 'bg-blue-100 text-blue-800',
    demissional: 'bg-red-100 text-red-800',
    retorno_trabalho: 'bg-yellow-100 text-yellow-800',
    mudanca_funcao: 'bg-purple-100 text-purple-800',
    ambiental: 'bg-orange-100 text-orange-800'
  };
  return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getExamStatusLabel(status: string): string {
  const statusMap = {
    agendado: 'Agendado',
    realizado: 'Realizado',
    vencido: 'Vencido',
    cancelado: 'Cancelado',
    reagendado: 'Reagendado'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getExamStatusColor(status: string): string {
  const cores = {
    agendado: 'bg-blue-100 text-blue-800',
    realizado: 'bg-green-100 text-green-800',
    vencido: 'bg-red-100 text-red-800',
    cancelado: 'bg-gray-100 text-gray-800',
    reagendado: 'bg-yellow-100 text-yellow-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getExamResultLabel(resultado: string): string {
  const resultados = {
    apto: 'Apto',
    inapto: 'Inapto',
    apto_com_restricoes: 'Apto com Restrições',
    pendente: 'Pendente'
  };
  return resultados[resultado as keyof typeof resultados] || resultado;
}

export function getExamResultColor(resultado: string): string {
  const cores = {
    apto: 'bg-green-100 text-green-800',
    inapto: 'bg-red-100 text-red-800',
    apto_com_restricoes: 'bg-yellow-100 text-yellow-800',
    pendente: 'bg-gray-100 text-gray-800'
  };
  return cores[resultado as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DOS EXAMES PERIÓDICOS
// =====================================================

export async function getEmployeeExams(
  employeeId: string,
  companyId: string
): Promise<PeriodicExam[]> {
  try {
    const result = await EntityService.list<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'data_agendamento',
      orderDirection: 'DESC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar exames do funcionário:', error);
    throw error;
  }
}

export async function getExpiredExams(
  companyId: string,
  daysAhead: number = 30
): Promise<PeriodicExam[]> {
  try {
    const { data, error } = await supabase.rpc('get_expired_exams', {
      company_id_param: companyId,
      days_ahead_param: daysAhead
    });

    if (error) {
      console.error('Erro ao buscar exames vencidos:', error);
      throw new Error(`Erro ao buscar exames vencidos: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de exames periódicos:', error);
    throw error;
  }
}

export async function getExamsByType(
  companyId: string,
  tipoExame: string
): Promise<PeriodicExam[]> {
  try {
    const result = await EntityService.list<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      filters: { tipo_exame: tipoExame },
      orderBy: 'data_agendamento',
      orderDirection: 'DESC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar exames por tipo:', error);
    throw error;
  }
}

export async function markExamAsCompleted(
  id: string,
  companyId: string,
  dataRealizacao: string,
  resultado: string,
  observacoes?: string
): Promise<PeriodicExam> {
  try {
    return await EntityService.update<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId: companyId,
      id: id,
      data: {
        status: 'realizado',
        data_realizacao: dataRealizacao,
        resultado: resultado,
        observacoes: observacoes
      }
    });
  } catch (error) {
    console.error('Erro ao marcar exame como realizado:', error);
    throw error;
  }
}

export async function rescheduleExam(
  id: string,
  companyId: string,
  novaDataAgendamento: string,
  observacoes?: string
): Promise<PeriodicExam> {
  try {
    return await EntityService.update<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId: companyId,
      id: id,
      data: {
        status: 'reagendado',
        data_agendamento: novaDataAgendamento,
        observacoes: observacoes
      }
    });
  } catch (error) {
    console.error('Erro ao reagendar exame:', error);
    throw error;
  }
}

export async function getExamStats(companyId: string) {
  try {
    const result = await EntityService.list<PeriodicExam>({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      filters: {},
      orderBy: 'data_agendamento',
      orderDirection: 'DESC'
    });

    const exams = result.data;
    const stats = {
      total_exams: exams.length,
      by_status: {
        agendado: exams.filter(exam => exam.status === 'agendado').length,
        realizado: exams.filter(exam => exam.status === 'realizado').length,
        vencido: exams.filter(exam => exam.status === 'vencido').length,
        cancelado: exams.filter(exam => exam.status === 'cancelado').length,
        reagendado: exams.filter(exam => exam.status === 'reagendado').length
      },
      by_type: {
        admissional: exams.filter(exam => exam.tipo_exame === 'admissional').length,
        periodico: exams.filter(exam => exam.tipo_exame === 'periodico').length,
        demissional: exams.filter(exam => exam.tipo_exame === 'demissional').length,
        retorno_trabalho: exams.filter(exam => exam.tipo_exame === 'retorno_trabalho').length,
        mudanca_funcao: exams.filter(exam => exam.tipo_exame === 'mudanca_funcao').length,
        ambiental: exams.filter(exam => exam.tipo_exame === 'ambiental').length
      },
      by_result: {
        apto: exams.filter(exam => exam.resultado === 'apto').length,
        inapto: exams.filter(exam => exam.resultado === 'inapto').length,
        apto_com_restricoes: exams.filter(exam => exam.resultado === 'apto_com_restricoes').length,
        pendente: exams.filter(exam => exam.resultado === 'pendente').length
      },
      total_cost: exams.reduce((sum, exam) => sum + (exam.custo || 0), 0),
      paid_exams: exams.filter(exam => exam.pago).length,
      unpaid_exams: exams.filter(exam => !exam.pago).length
    };

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos exames:', error);
    throw error;
  }
}
