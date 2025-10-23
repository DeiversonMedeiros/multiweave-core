import { EntityService } from '@/services/generic/entityService';
import { 
  Position, 
  PositionInsert, 
  PositionUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface PositionFilters {
  nome?: string;
  is_active?: boolean;
  [key: string]: any;
}

// =====================================================
// SERVIÇO DE CARGOS
// =====================================================

export const PositionsService = {
  /**
   * Lista todos os cargos de uma empresa
   */
  list: async (companyId: string) => {
    const result = await EntityService.list<Position>({
      schema: 'rh',
      table: 'positions',
      companyId,
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Busca um cargo por ID
   */
  getById: async (id: string, companyId: string): Promise<Position | null> => {
    return await EntityService.getById<Position>('rh', 'positions', id, companyId);
  },

  /**
   * Cria um novo cargo
   */
  create: async (position: PositionInsert, companyId: string): Promise<Position> => {
    return await EntityService.create<Position>({
      schema: 'rh',
      table: 'positions',
      companyId,
      data: position
    });
  },

  /**
   * Atualiza um cargo
   */
  update: async (id: string, position: PositionUpdate, companyId: string): Promise<Position> => {
    return await EntityService.update<Position>({
      schema: 'rh',
      table: 'positions',
      companyId,
      id,
      data: position
    });
  },

  /**
   * Remove um cargo
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    return await EntityService.delete({
      schema: 'rh',
      table: 'positions',
      companyId,
      id
    });
  },

  /**
   * Busca cargos ativos
   */
  getActive: async (companyId: string): Promise<Position[]> => {
    const result = await EntityService.list<Position>({
      schema: 'rh',
      table: 'positions',
      companyId,
      filters: { is_active: true },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Ativa/desativa cargo
   */
  toggleStatus: async (id: string, isActive: boolean, companyId: string): Promise<Position> => {
    return await EntityService.update<Position>({
      schema: 'rh',
      table: 'positions',
      companyId,
      id,
      data: { is_active: isActive }
    });
  }
};

// =====================================================
// FUNÇÕES EXPORTADAS PARA COMPATIBILIDADE
// =====================================================

/**
 * Lista cargos com filtros
 */
export async function getPositions(companyId: string, filters: PositionFilters = {}) {
  const result = await EntityService.list<Position>({
    schema: 'rh',
    table: 'positions',
    companyId,
    filters,
    orderBy: 'nome',
    orderDirection: 'ASC'
  });

  return result.data;
}

/**
 * Busca cargo por ID
 */
export async function getPositionById(id: string, companyId: string) {
  return await PositionsService.getById(id, companyId);
}

/**
 * Cria cargo
 */
export async function createPosition(data: PositionInsert, companyId: string) {
  return await PositionsService.create(data, companyId);
}

/**
 * Atualiza cargo
 */
export async function updatePosition(id: string, data: PositionUpdate, companyId: string) {
  return await PositionsService.update(id, data, companyId);
}

/**
 * Remove cargo
 */
export async function deletePosition(id: string, companyId: string) {
  return await PositionsService.delete(id, companyId);
}

/**
 * Busca cargos ativos
 */
export async function getActivePositions(companyId: string) {
  return await PositionsService.getActive(companyId);
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
 * Retorna cor do badge para status
 */
export function getPositionStatusColor(isActive: boolean): string {
  return isActive 
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200';
}

/**
 * Retorna label para status
 */
export function getPositionStatusLabel(isActive: boolean): string {
  return isActive ? 'Ativo' : 'Inativo';
}