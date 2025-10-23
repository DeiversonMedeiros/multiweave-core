import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface PeriodicExamFilters {
  employee_id?: string;
  tipo_exame?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: any;
}

export interface PeriodicExamCreateData {
  employee_id: string;
  tipo_exame: string;
  data_agendamento: string;
  data_vencimento?: string;
  status?: string;
  observacoes?: string;
}

export interface PeriodicExamUpdateData {
  tipo_exame?: string;
  data_agendamento?: string;
  data_vencimento?: string;
  status?: string;
  observacoes?: string;
}

// =====================================================
// SERVIÇO DE EXAMES PERIÓDICOS
// =====================================================

export const PeriodicExamsService = {
  /**
   * Lista exames de um funcionário
   */
  getByEmployee: async (employeeId: string, companyId: string) => {
    const result = await EntityService.list({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'data_agendamento',
      orderDirection: 'DESC'
    });

    return result.data;
  },

  /**
   * Lista exames pendentes
   */
  getPending: async (employeeId: string, companyId: string) => {
    const result = await EntityService.list({
      schema: 'rh',
      table: 'periodic_exams',
      companyId,
      filters: { 
        employee_id: employeeId,
        status: ['agendado', 'pendente']
      },
      orderBy: 'data_agendamento',
      orderDirection: 'ASC'
    });

    return result.data;
  }
};

// =====================================================
// FUNÇÕES EXPORTADAS PARA COMPATIBILIDADE
// =====================================================

/**
 * Lista exames periódicos
 */
export async function getPeriodicExams(companyId: string, filters: PeriodicExamFilters = {}) {
  console.log('🔍 [getPeriodicExams] Iniciando busca de exames periódicos');
  console.log('📊 [getPeriodicExams] CompanyId:', companyId);
  console.log('🔧 [getPeriodicExams] Filtros:', filters);

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Usar função RPC específica para exames periódicos
    console.log('🔍 [getPeriodicExams] Chamando RPC com parâmetros:', {
      p_company_id: companyId,
      p_employee_id: filters.employee_id && filters.employee_id !== 'all' ? filters.employee_id : null,
      p_tipo_exame: filters.tipo_exame && filters.tipo_exame !== 'all' ? filters.tipo_exame : null,
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_resultado: filters.resultado && filters.resultado !== 'all' ? filters.resultado : null,
      p_data_inicio: filters.start_date || null,
      p_data_fim: filters.end_date || null,
      p_limit: 100,
      p_offset: 0
    });
    
    const { data, error } = await supabase.rpc('get_periodic_exams', {
      p_company_id: companyId,
      p_employee_id: filters.employee_id && filters.employee_id !== 'all' ? filters.employee_id : null,
      p_tipo_exame: filters.tipo_exame && filters.tipo_exame !== 'all' ? filters.tipo_exame : null,
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_resultado: filters.resultado && filters.resultado !== 'all' ? filters.resultado : null,
      p_data_inicio: filters.start_date || null,
      p_data_fim: filters.end_date || null,
      p_limit: 100,
      p_offset: 0
    });

    console.log('✅ [getPeriodicExams] RPC result:', { data, error });

    if (error) {
      console.error('❌ [getPeriodicExams] Erro na função RPC:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [getPeriodicExams] Nenhum exame encontrado');
      return [];
    }

    console.log(`📋 [getPeriodicExams] Encontrados ${data.length} exames`);
    console.log('✅ [getPeriodicExams] Exames retornados:', data);
    
    return data;

  } catch (error) {
    console.error('❌ [getPeriodicExams] Erro ao buscar exames periódicos:', error);
    return [];
  }
}

/**
 * Busca exame por ID
 */
export async function getPeriodicExamById(id: string, companyId: string) {
  return await EntityService.getById('rh', 'periodic_exams', id, companyId);
}

/**
 * Cria novo exame
 */
export async function createPeriodicExam(data: PeriodicExamCreateData, companyId: string) {
  return await EntityService.create({
      schema: 'rh',
      table: 'periodic_exams',
    companyId,
    data
  });
}

/**
 * Atualiza exame
 */
export async function updatePeriodicExam(id: string, data: PeriodicExamUpdateData, companyId: string) {
  return await EntityService.update({
      schema: 'rh',
      table: 'periodic_exams',
    companyId,
    id,
    data
  });
}

/**
 * Remove exame
 */
export async function deletePeriodicExam(id: string, companyId: string) {
  return await EntityService.delete({
    schema: 'rh',
    table: 'periodic_exams',
    companyId,
    id
  });
}

/**
 * Busca exames de um funcionário
 */
export async function getEmployeeExams(employeeId: string, companyId: string) {
  return await PeriodicExamsService.getByEmployee(employeeId, companyId);
}

/**
 * Busca exames vencidos
 */
export async function getExpiredExams(companyId: string) {
  const result = await EntityService.list({
    schema: 'rh',
    table: 'periodic_exams',
    companyId,
    filters: { 
      status: ['agendado', 'pendente'],
      data_vencimento: new Date().toISOString().split('T')[0] // Hoje
    },
    orderBy: 'data_vencimento',
    orderDirection: 'ASC'
  });

  return result.data;
}

/**
 * Busca exames por tipo
 */
export async function getExamsByType(tipoExame: string, companyId: string) {
  const result = await EntityService.list({
    schema: 'rh',
    table: 'periodic_exams',
    companyId,
    filters: { tipo_exame: tipoExame },
    orderBy: 'data_agendamento',
    orderDirection: 'DESC'
  });

  return result.data;
}

/**
 * Marca exame como concluído
 */
export async function markExamAsCompleted(id: string, companyId: string) {
  return await EntityService.update({
    schema: 'rh',
    table: 'periodic_exams',
    companyId,
    id,
    data: { status: 'concluido' }
  });
}

/**
 * Reagenda exame
 */
export async function rescheduleExam(id: string, novaData: string, companyId: string) {
  return await EntityService.update({
    schema: 'rh',
    table: 'periodic_exams',
    companyId,
    id,
    data: { 
      data_agendamento: novaData,
      status: 'agendado'
    }
  });
}

/**
 * Busca estatísticas de exames
 */
export async function getExamStats(companyId: string) {
  const [total, agendados, realizados, vencidos, cancelados, reagendados] = await Promise.all([
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { status: 'agendado' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { status: 'realizado' } }),
    getExpiredExams(companyId),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { status: 'cancelado' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { status: 'reagendado' } })
  ]);

  // Buscar exames por tipo
  const [admissionais, periodicos, demissionais, retorno_trabalho, mudanca_funcao, ambientais] = await Promise.all([
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { tipo_exame: 'admissional' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { tipo_exame: 'periodico' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { tipo_exame: 'demissional' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { tipo_exame: 'retorno_trabalho' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { tipo_exame: 'mudanca_funcao' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { tipo_exame: 'ambiental' } })
  ]);

  // Buscar exames por resultado
  const [aptos, inaptos, aptos_com_restricoes, pendentes] = await Promise.all([
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { resultado: 'apto' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { resultado: 'inapto' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { resultado: 'apto_com_restricoes' } }),
    EntityService.list({ schema: 'rh', table: 'periodic_exams', companyId, filters: { resultado: 'pendente' } })
  ]);

  // Calcular custos (assumindo que há um campo valor_exame)
  const totalCost = total.data.reduce((sum, exam) => sum + (exam.valor_exame || 0), 0);
  const paidExams = total.data.filter(exam => exam.pago === true).length;
  const unpaidExams = total.data.filter(exam => exam.pago === false).length;

  return {
    total_exams: total.data.length,
    by_status: {
      agendado: agendados.data.length,
      realizado: realizados.data.length,
      vencido: vencidos.length,
      cancelado: cancelados.data.length,
      reagendado: reagendados.data.length
    },
    by_type: {
      admissional: admissionais.data.length,
      periodico: periodicos.data.length,
      demissional: demissionais.data.length,
      retorno_trabalho: retorno_trabalho.data.length,
      mudanca_funcao: mudanca_funcao.data.length,
      ambiental: ambientais.data.length
    },
    by_result: {
      apto: aptos.data.length,
      inapto: inaptos.data.length,
      apto_com_restricoes: aptos_com_restricoes.data.length,
      pendente: pendentes.data.length
    },
    total_cost: totalCost,
    paid_exams: paidExams,
    unpaid_exams: unpaidExams
  };
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Formata data para exibição
 */
export function formatDate(date: string | Date): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata moeda para exibição
 */
export function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Retorna cor do badge para tipo de exame
 */
export function getExamTypeColor(tipo: string): string {
  switch (tipo) {
    case 'admissional':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'demissional':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'periodico':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'mudanca_funcao':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Retorna cor do badge para status
 */
export function getExamStatusColor(status: string): string {
  switch (status) {
    case 'agendado':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'concluido':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'vencido':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Retorna cor do badge para resultado
 */
export function getExamResultColor(resultado: string): string {
  switch (resultado) {
    case 'apto':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inapto':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'apto_com_restricoes':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'pendente':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Retorna label para tipo de exame
 */
export function getExamTypeLabel(tipo: string): string {
  switch (tipo) {
    case 'admissional':
      return 'Admissional';
    case 'demissional':
      return 'Demissional';
    case 'periodico':
      return 'Periódico';
    case 'mudanca_funcao':
      return 'Mudança de Função';
    default:
      return tipo || 'N/A';
  }
}

/**
 * Retorna label para status
 */
export function getExamStatusLabel(status: string): string {
  switch (status) {
    case 'agendado':
      return 'Agendado';
    case 'pendente':
      return 'Pendente';
    case 'concluido':
      return 'Concluído';
    case 'vencido':
      return 'Vencido';
    default:
      return status || 'N/A';
  }
}

/**
 * Retorna label para resultado
 */
export function getExamResultLabel(resultado: string): string {
  switch (resultado) {
    case 'apto':
      return 'Apto';
    case 'inapto':
      return 'Inapto';
    case 'apto_com_restricoes':
      return 'Apto com Restrições';
    case 'pendente':
      return 'Pendente';
    default:
      return resultado || 'N/A';
  }
}