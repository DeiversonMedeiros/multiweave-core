import { EntityService } from '@/services/generic/entityService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface VacationFilters {
  employee_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: any;
}

export interface VacationCreateData {
  employee_id: string;
  data_inicio: string;
  data_fim: string;
  dias_ferias: number;
  tipo: 'integral' | 'fracionada';
  observacoes?: string;
  status?: string;
}

export interface VacationUpdateData {
  data_inicio?: string;
  data_fim?: string;
  dias_ferias?: number;
  tipo?: 'integral' | 'fracionada';
  observacoes?: string;
  status?: string;
}

// =====================================================
// SERVIÇO DE FÉRIAS
// =====================================================

export const VacationsService = {
  /**
   * Lista férias de um funcionário
   */
  getByEmployee: async (employeeId: string, companyId: string) => {
    const result = await EntityService.list({
      schema: 'rh',
      table: 'vacations',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'data_inicio',
      orderDirection: 'DESC'
    });

    return result.data;
  },

  /**
   * Lista próximas férias aprovadas
   */
  getUpcoming: async (employeeId: string, companyId: string) => {
    const result = await EntityService.list({
      schema: 'rh',
      table: 'vacations',
      companyId,
      filters: { 
        employee_id: employeeId,
        status: 'aprovado'
      },
      orderBy: 'data_inicio',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Lista férias pendentes
   */
  getPending: async (employeeId: string, companyId: string) => {
    const result = await EntityService.list({
      schema: 'rh',
      table: 'vacations',
      companyId,
      filters: { 
        employee_id: employeeId,
        status: 'pendente'
      },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    return result.data;
  }
};

// =====================================================
// FUNÇÕES EXPORTADAS PARA COMPATIBILIDADE
// =====================================================

/**
 * Lista férias
 */
export async function getVacations(companyId: string, filters: VacationFilters = {}) {
  const result = await EntityService.list({
    schema: 'rh',
    table: 'vacations',
    companyId,
    filters,
    orderBy: 'data_inicio',
    orderDirection: 'DESC'
  });

  return result.data;
}

/**
 * Busca férias por ID
 */
export async function getVacationById(id: string, companyId: string) {
  return await EntityService.getById('rh', 'vacations', id, companyId);
}

/**
 * Cria nova férias
 */
export async function createVacation(data: VacationCreateData, companyId: string) {
  return await EntityService.create({
    schema: 'rh',
    table: 'vacations',
    companyId,
    data
  });
}

/**
 * Atualiza férias
 */
export async function updateVacation(id: string, data: VacationUpdateData, companyId: string) {
  return await EntityService.update({
    schema: 'rh',
    table: 'vacations',
    companyId,
    id,
    data
  });
}

/**
 * Remove férias
 */
export async function deleteVacation(id: string, companyId: string) {
  return await EntityService.delete({
    schema: 'rh',
    table: 'vacations',
    companyId,
    id
  });
}

/**
 * Aprova férias
 */
export async function approveVacation(id: string, companyId: string) {
  return await EntityService.update({
    schema: 'rh',
    table: 'vacations',
    companyId,
    id,
    data: { status: 'aprovado' }
  });
}

/**
 * Rejeita férias
 */
export async function rejectVacation(id: string, companyId: string, motivo?: string) {
  return await EntityService.update({
    schema: 'rh',
    table: 'vacations',
    companyId,
    id,
    data: { 
      status: 'rejeitado',
      motivo_rejeicao: motivo
    }
  });
}

/**
 * Busca férias por funcionário
 */
export async function getEmployeeVacations(employeeId: string, companyId: string) {
  return await VacationsService.getByEmployee(employeeId, companyId);
}

/**
 * Busca férias pendentes
 */
export async function getPendingVacations(companyId: string) {
  const result = await EntityService.list({
    schema: 'rh',
    table: 'vacations',
    companyId,
    filters: { status: 'pendente' },
    orderBy: 'created_at',
    orderDirection: 'DESC'
  });

  return result.data;
}

/**
 * Busca estatísticas de férias
 */
export async function getVacationStats(companyId: string) {
  const [total, pendentes, aprovadas, rejeitadas] = await Promise.all([
    EntityService.list({ schema: 'rh', table: 'vacations', companyId }),
    EntityService.list({ schema: 'rh', table: 'vacations', companyId, filters: { status: 'pendente' } }),
    EntityService.list({ schema: 'rh', table: 'vacations', companyId, filters: { status: 'aprovado' } }),
    EntityService.list({ schema: 'rh', table: 'vacations', companyId, filters: { status: 'rejeitado' } })
  ]);

  return {
    total: total.data.length,
    pendentes: pendentes.data.length,
    aprovadas: aprovadas.data.length,
    rejeitadas: rejeitadas.data.length
  };
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Formata data para exibição
 * Corrige problema de timezone que faz a data aparecer um dia antes
 */
export function formatDate(date: string | Date): string {
  if (!date) return '-';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Se for string no formato YYYY-MM-DD, tratar como data local (sem timezone)
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '-';
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Retorna cor do badge para status
 */
export function getVacationStatusColor(status: string): string {
  switch (status) {
    case 'aprovado':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejeitado':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Retorna cor do badge para tipo
 */
export function getVacationTypeColor(tipo: string): string {
  switch (tipo) {
    case 'integral':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'fracionada':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Retorna label para status
 */
export function getVacationStatusLabel(status: string): string {
  switch (status) {
    case 'aprovado':
      return 'Aprovado';
    case 'pendente':
      return 'Pendente';
    case 'rejeitado':
      return 'Rejeitado';
    default:
      return status || 'N/A';
  }
}

/**
 * Retorna label para tipo
 */
export function getVacationTypeLabel(tipo: string): string {
  switch (tipo) {
    case 'integral':
      return 'Integral';
    case 'fracionada':
      return 'Fracionada';
    default:
      return tipo || 'N/A';
  }
}

/**
 * Calcula dias de férias
 */
export function calculateVacationDays(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
  
  const diffTime = fim.getTime() - inicio.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.max(0, diffDays);
}