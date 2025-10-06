import { rhSupabase } from '@/integrations/supabase/client';
import { 
  Vacation, 
  VacationInsert, 
  VacationUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE FÉRIAS E LICENÇAS
// =====================================================

export const VacationsService = {
  // =====================================================
  // CONSULTAS
  // =====================================================

  /**
   * Lista férias e licenças
   */
  list: async (params: { 
    companyId: string; 
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
  }) => {
    let query = rhSupabase
      .schema('rh')
      .from('vacations')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('company_id', params.companyId)
      .order('start_date', { ascending: false });

    // Aplicar filtros
    if (params.employeeId) {
      query = query.eq('employee_id', params.employeeId);
    }
    
    if (params.startDate) {
      query = query.gte('start_date', params.startDate);
    }
    
    if (params.endDate) {
      query = query.lte('end_date', params.endDate);
    }
    
    if (params.status) {
      query = query.eq('status', params.status);
    }
    
    if (params.type) {
      query = query.eq('type', params.type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar férias e licenças: ${error.message}`);
    }

    return data as Vacation[];
  },

  /**
   * Busca férias por ID
   */
  getById: async (id: string) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar férias: ${error.message}`);
    }

    return data as Vacation;
  },

  /**
   * Busca férias pendentes de aprovação
   */
  getPendingApprovals: async (companyId: string) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar férias pendentes: ${error.message}`);
    }

    return data as Vacation[];
  },

  /**
   * Busca férias por funcionário
   */
  getByEmployee: async (employeeId: string, year?: number) => {
    let query = rhSupabase
      .schema('rh')
      .from('vacations')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (year) {
      query = query.gte('start_date', `${year}-01-01`)
                  .lte('start_date', `${year}-12-31`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar férias do funcionário: ${error.message}`);
    }

    return data as Vacation[];
  },

  // =====================================================
  // MUTAÇÕES
  // =====================================================

  /**
   * Cria nova férias/licença
   */
  create: async (vacation: VacationInsert) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .insert(vacation)
      .select(`
        *,
        employee:employees(*)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao criar férias: ${error.message}`);
    }

    return data as Vacation;
  },

  /**
   * Atualiza férias/licença
   */
  update: async (id: string, vacation: VacationUpdate) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .update(vacation)
      .eq('id', id)
      .select(`
        *,
        employee:employees(*)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar férias: ${error.message}`);
    }

    return data as Vacation;
  },

  /**
   * Exclui férias/licença
   */
  delete: async (id: string) => {
    const { error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir férias: ${error.message}`);
    }
  },

  /**
   * Aprova férias
   */
  approve: async (id: string, approvedBy: string, comments?: string) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .update({ 
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        comments: comments || null
      })
      .eq('id', id)
      .select(`
        *,
        employee:employees(*)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao aprovar férias: ${error.message}`);
    }

    return data as Vacation;
  },

  /**
   * Rejeita férias
   */
  reject: async (id: string, rejectedBy: string, reason: string) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .update({ 
        status: 'rejected',
        approved_by: rejectedBy,
        approved_at: new Date().toISOString(),
        comments: reason
      })
      .eq('id', id)
      .select(`
        *,
        employee:employees(*)
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao rejeitar férias: ${error.message}`);
    }

    return data as Vacation;
  },

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  /**
   * Calcula dias de férias disponíveis
   */
  calculateAvailableVacationDays: async (employeeId: string, year: number) => {
    // Buscar férias já tiradas no ano
    const vacations = await VacationsService.getByEmployee(employeeId, year);
    
    const usedDays = vacations
      .filter(v => v.type === 'vacation' && v.status === 'approved')
      .reduce((sum, v) => sum + (v.days || 0), 0);

    // 30 dias por ano (padrão CLT)
    const totalDays = 30;
    const availableDays = totalDays - usedDays;

    return Math.max(0, availableDays);
  },

  /**
   * Valida se as datas não conflitam
   */
  validateDateConflict: async (params: {
    employeeId: string;
    startDate: string;
    endDate: string;
    excludeId?: string;
  }) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .select('id, start_date, end_date')
      .eq('employee_id', params.employeeId)
      .in('status', ['pending', 'approved'])
      .neq('id', params.excludeId || '');

    if (error) {
      throw new Error(`Erro ao validar conflito de datas: ${error.message}`);
    }

    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    for (const vacation of data) {
      const vacationStart = new Date(vacation.start_date);
      const vacationEnd = new Date(vacation.end_date);

      // Verificar sobreposição
      if (
        (start >= vacationStart && start <= vacationEnd) ||
        (end >= vacationStart && end <= vacationEnd) ||
        (start <= vacationStart && end >= vacationEnd)
      ) {
        return {
          hasConflict: true,
          conflictingVacation: vacation
        };
      }
    }

    return { hasConflict: false };
  },

  /**
   * Busca estatísticas de férias
   */
  getStats: async (companyId: string, year: number) => {
    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .select('type, status, days, start_date')
      .eq('company_id', companyId)
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`);

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const stats = {
      total_requests: data.length,
      pending: data.filter(v => v.status === 'pending').length,
      approved: data.filter(v => v.status === 'approved').length,
      rejected: data.filter(v => v.status === 'rejected').length,
      total_vacation_days: data
        .filter(v => v.type === 'vacation' && v.status === 'approved')
        .reduce((sum, v) => sum + (v.days || 0), 0),
      total_leave_days: data
        .filter(v => v.type === 'leave' && v.status === 'approved')
        .reduce((sum, v) => sum + (v.days || 0), 0),
      by_month: data.reduce((acc, v) => {
        const month = new Date(v.start_date).getMonth() + 1;
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    };

    return stats;
  },

  /**
   * Busca próximas férias
   */
  getUpcomingVacations: async (companyId: string, days: number = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await rhSupabase
      .schema('rh')
      .from('vacations')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .lte('start_date', futureDate.toISOString().split('T')[0])
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar próximas férias: ${error.message}`);
    }

    return data as Vacation[];
  },
};

export default VacationsService;
