// =====================================================
// SERVIÇO DE TURNOS DE TRABALHO (WORK SHIFTS)
// =====================================================

import { EntityService } from '@/services/generic/entityService';
import { WorkShift } from '@/integrations/supabase/rh-types';

export interface WorkShiftFilters {
  status?: string;
  tipo_turno?: string;
  company_id?: string;
}

export interface WorkShiftCreateData {
  company_id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  hora_inicio: string;
  hora_fim: string;
  intervalo_inicio?: string;
  intervalo_fim?: string;
  horas_diarias?: number;
  dias_semana?: number[];
  tipo_turno?: 'normal' | 'noturno' | 'rotativo';
  tipo_escala?: 'fixa' | 'flexivel_6x1' | 'flexivel_5x2' | 'flexivel_4x3' | 'escala_12x36' | 'escala_24x48' | 'personalizada';
  dias_trabalho?: number;
  dias_folga?: number;
  ciclo_dias?: number;
  regras_clt?: Record<string, any>;
  template_escala?: boolean;
  tolerancia_entrada?: number;
  tolerancia_saida?: number;
  status?: 'ativo' | 'inativo';
}

export interface WorkShiftUpdateData extends Partial<WorkShiftCreateData> {
  id: string;
}

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getWorkShifts(
  companyId: string,
  filters: WorkShiftFilters = {}
): Promise<{ data: WorkShift[]; totalCount: number }> {
  try {
    const result = await EntityService.list<WorkShift>({
      schema: 'rh',
      table: 'work_shifts',
      companyId,
      filters: {
        status: filters.status,
        tipo_turno: filters.tipo_turno
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de turnos de trabalho:', error);
    throw error;
  }
}

export async function getWorkShiftById(
  id: string,
  companyId: string
): Promise<WorkShift | null> {
  try {
    return await EntityService.getById<WorkShift>('rh', 'work_shifts', id, companyId);
  } catch (error) {
    console.error('Erro no serviço de turno de trabalho:', error);
    throw error;
  }
}

export async function createWorkShift(
  workShiftData: WorkShiftCreateData
): Promise<WorkShift> {
  try {
    const { company_id, ...data } = workShiftData;
    return await EntityService.create<WorkShift>({
      schema: 'rh',
      table: 'work_shifts',
      companyId: company_id,
      data
    });
  } catch (error) {
    console.error('Erro no serviço de criação de turno:', error);
    throw error;
  }
}

export async function updateWorkShift(
  workShiftData: WorkShiftUpdateData
): Promise<WorkShift> {
  try {
    const { id, company_id, ...updateData } = workShiftData;
    
    return await EntityService.update<WorkShift>({
      schema: 'rh',
      table: 'work_shifts',
      companyId: company_id || '',
      id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de atualização de turno:', error);
    throw error;
  }
}

export async function deleteWorkShift(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'work_shifts',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de exclusão de turno:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export async function getActiveWorkShifts(companyId: string): Promise<WorkShift[]> {
  try {
    const result = await EntityService.list<WorkShift>({
      schema: 'rh',
      table: 'work_shifts',
      companyId,
      filters: { status: 'ativo' },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  } catch (error) {
    console.error('Erro no serviço de turnos ativos:', error);
    throw error;
  }
}

export async function getWorkShiftsByType(
  companyId: string,
  tipoTurno: string
): Promise<WorkShift[]> {
  try {
    const result = await EntityService.list<WorkShift>({
      schema: 'rh',
      table: 'work_shifts',
      companyId,
      filters: { 
        tipo_turno: tipoTurno,
        status: 'ativo'
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  } catch (error) {
    console.error('Erro no serviço de turnos por tipo:', error);
    throw error;
  }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

export function formatTime(time: string): string {
  // Formatar hora para exibição (HH:MM)
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

export function parseTime(time: string): string {
  // Converter hora para formato do banco
  return time;
}

export function getWeekDays(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
  ];
}

export function getShiftTypes(): { value: string; label: string }[] {
  return [
    { value: 'normal', label: 'Normal' },
    { value: 'noturno', label: 'Noturno' },
    { value: 'rotativo', label: 'Rotativo' },
  ];
}

