import { rhSupabase } from '@/integrations/supabase/client';
import { 
  WorkSchedule, 
  WorkScheduleInsert, 
  WorkScheduleUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE ESCALAS DE TRABALHO
// =====================================================

export const WorkSchedulesService = {
  // =====================================================
  // CONSULTAS
  // =====================================================

  /**
   * Lista escalas de trabalho de uma empresa
   */
  list: async (params: { 
    companyId: string; 
    search?: string;
    isActive?: boolean;
  }) => {
    let query = rhSupabase
      .from('work_schedules')
      .select('*')
      .eq('company_id', params.companyId)
      .order('nome');

    // Aplicar filtros
    if (params.search) {
      query = query.ilike('nome', `%${params.search}%`);
    }
    
    if (params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar escalas de trabalho: ${error.message}`);
    }

    return data as WorkSchedule[];
  },

  /**
   * Busca uma escala por ID
   */
  getById: async (id: string) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar escala de trabalho: ${error.message}`);
    }

    return data as WorkSchedule;
  },

  /**
   * Busca escalas ativas
   */
  getActive: async (companyId: string) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('nome');

    if (error) {
      throw new Error(`Erro ao buscar escalas ativas: ${error.message}`);
    }

    return data as WorkSchedule[];
  },

  // =====================================================
  // MUTAÇÕES
  // =====================================================

  /**
   * Cria uma nova escala de trabalho
   */
  create: async (schedule: WorkScheduleInsert) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar escala de trabalho: ${error.message}`);
    }

    return data as WorkSchedule;
  },

  /**
   * Atualiza uma escala de trabalho
   */
  update: async (id: string, schedule: WorkScheduleUpdate) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .update(schedule)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar escala de trabalho: ${error.message}`);
    }

    return data as WorkSchedule;
  },

  /**
   * Exclui uma escala de trabalho
   */
  delete: async (id: string) => {
    const { error } = await rhSupabase
      .from('work_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir escala de trabalho: ${error.message}`);
    }
  },

  /**
   * Ativa/desativa uma escala de trabalho
   */
  toggleStatus: async (id: string, isActive: boolean) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao alterar status da escala: ${error.message}`);
    }

    return data as WorkSchedule;
  },

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  /**
   * Valida se o nome da escala já existe
   */
  validateName: async (name: string, companyId: string, excludeId?: string) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .select('id')
      .eq('nome', name)
      .eq('company_id', companyId)
      .neq('id', excludeId || '');

    if (error) {
      throw new Error(`Erro ao validar nome da escala: ${error.message}`);
    }

    return data.length === 0;
  },

  /**
   * Calcula horas de trabalho por dia
   */
  calculateDailyHours: (schedule: WorkSchedule) => {
    if (!schedule.horario_inicio || !schedule.horario_fim) {
      return 0;
    }

    const inicio = new Date(`2000-01-01T${schedule.horario_inicio}`);
    const fim = new Date(`2000-01-01T${schedule.horario_fim}`);
    
    let totalMinutes = (fim.getTime() - inicio.getTime()) / (1000 * 60);
    
    // Subtrair intervalo de almoço
    if (schedule.intervalo_almoco) {
      totalMinutes -= schedule.intervalo_almoco;
    }
    
    return totalMinutes / 60;
  },

  /**
   * Calcula horas de trabalho por semana
   */
  calculateWeeklyHours: (schedule: WorkSchedule) => {
    const dailyHours = WorkSchedulesService.calculateDailyHours(schedule);
    const workDays = schedule.dias_trabalho?.length || 5; // Default 5 dias
    return dailyHours * workDays;
  },

  /**
   * Verifica se um dia da semana é dia de trabalho
   */
  isWorkDay: (schedule: WorkSchedule, dayOfWeek: number) => {
    // dayOfWeek: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    return schedule.dias_trabalho?.includes(dayOfWeek) || false;
  },

  /**
   * Busca estatísticas das escalas
   */
  getStats: async (companyId: string) => {
    const { data, error } = await rhSupabase
      .from('work_schedules')
      .select('is_active, carga_horaria_semanal, dias_trabalho')
      .eq('company_id', companyId);

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const stats = {
      total: data.length,
      active: data.filter(s => s.is_active).length,
      inactive: data.filter(s => !s.is_active).length,
      avg_weekly_hours: data.length > 0 
        ? data.reduce((sum, s) => sum + (s.carga_horaria_semanal || 0), 0) / data.length 
        : 0,
      most_common_days: data.reduce((acc, s) => {
        s.dias_trabalho?.forEach(day => {
          acc[day] = (acc[day] || 0) + 1;
        });
        return acc;
      }, {} as Record<number, number>),
    };

    return stats;
  },
};

export default WorkSchedulesService;
