// =====================================================
// SERVIÇO DE TURNOS DE TRABALHO (WORK SHIFTS)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
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
    let query = supabase
      .from('work_shifts')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('nome');

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.tipo_turno) {
      query = query.eq('tipo_turno', filters.tipo_turno);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar turnos de trabalho:', error);
      throw new Error(`Erro ao buscar turnos de trabalho: ${error.message}`);
    }

    return {
      data: data || [],
      totalCount: count || 0,
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
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      console.error('Erro ao buscar turno de trabalho:', error);
      throw new Error(`Erro ao buscar turno de trabalho: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de turno de trabalho:', error);
    throw error;
  }
}

export async function createWorkShift(
  workShiftData: WorkShiftCreateData
): Promise<WorkShift> {
  try {
    const { data, error } = await supabase
      .from('work_shifts')
      .insert([workShiftData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar turno de trabalho:', error);
      throw new Error(`Erro ao criar turno de trabalho: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de criação de turno:', error);
    throw error;
  }
}

export async function updateWorkShift(
  workShiftData: WorkShiftUpdateData
): Promise<WorkShift> {
  try {
    const { id, ...updateData } = workShiftData;

    const { data, error } = await supabase
      .from('work_shifts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar turno de trabalho:', error);
      throw new Error(`Erro ao atualizar turno de trabalho: ${error.message}`);
    }

    return data;
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
    const { error } = await supabase
      .from('work_shifts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Erro ao excluir turno de trabalho:', error);
      throw new Error(`Erro ao excluir turno de trabalho: ${error.message}`);
    }
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
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'ativo')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar turnos ativos:', error);
      throw new Error(`Erro ao buscar turnos ativos: ${error.message}`);
    }

    return data || [];
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
    const { data, error } = await supabase
      .from('work_shifts')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo_turno', tipoTurno)
      .eq('status', 'ativo')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar turnos por tipo:', error);
      throw new Error(`Erro ao buscar turnos por tipo: ${error.message}`);
    }

    return data || [];
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

