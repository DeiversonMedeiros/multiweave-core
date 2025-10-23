import { EntityService } from '@/services/generic/entityService';
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
    const filters: any = {};
    
    if (params.isActive !== undefined) {
      filters.is_active = params.isActive;
    }

    const result = await EntityService.list<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId: params.companyId,
      filters,
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    let data = result.data;

    // Aplicar filtro de busca no lado do cliente (já que EntityService não suporta ilike)
    if (params.search) {
      data = data.filter(schedule => 
        schedule.nome?.toLowerCase().includes(params.search!.toLowerCase())
      );
    }

    return data;
  },

  /**
   * Busca uma escala por ID
   */
  getById: async (id: string, companyId: string) => {
    const result = await EntityService.getById<WorkSchedule>('rh', 'work_schedules', id, companyId);
    
    if (!result) {
      throw new Error('Escala de trabalho não encontrada');
    }

    return result;
  },

  /**
   * Busca escalas ativas
   */
  getActive: async (companyId: string) => {
    const result = await EntityService.list<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId,
      filters: { is_active: true },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  // =====================================================
  // MUTAÇÕES
  // =====================================================

  /**
   * Cria uma nova escala de trabalho
   */
  create: async (schedule: WorkScheduleInsert, companyId: string) => {
    const result = await EntityService.create<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId,
      data: schedule
    });

    return result;
  },

  /**
   * Atualiza uma escala de trabalho
   */
  update: async (id: string, schedule: WorkScheduleUpdate, companyId: string) => {
    const result = await EntityService.update<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId,
      id,
      data: schedule
    });

    return result;
  },

  /**
   * Exclui uma escala de trabalho
   */
  delete: async (id: string, companyId: string) => {
    await EntityService.delete({
      schema: 'rh',
      table: 'work_schedules',
      companyId,
      id
    });
  },

  /**
   * Ativa/desativa uma escala de trabalho
   */
  toggleStatus: async (id: string, isActive: boolean, companyId: string) => {
    const result = await EntityService.update<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId,
      id,
      data: { is_active: isActive }
    });

    return result;
  },

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  /**
   * Valida se o nome da escala já existe
   */
  validateName: async (name: string, companyId: string, excludeId?: string) => {
    const filters: any = { nome: name };
    if (excludeId) {
      filters.id = { neq: excludeId };
    }

    const result = await EntityService.list<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId,
      filters
    });

    return result.data.length === 0;
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
    const result = await EntityService.list<WorkSchedule>({
      schema: 'rh',
      table: 'work_schedules',
      companyId
    });

    const data = result.data;

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
