import { EntityService, callSchemaFunction } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS
// =====================================================

export interface RestDaySchedule {
  id: string;
  employee_id: string;
  company_id: string;
  data_folga: string; // DATE format
  horas_descontar: number | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  employee?: {
    id: string;
    nome: string;
    matricula?: string;
  };
}

export interface RestDayScheduleInsert {
  employee_id: string;
  company_id: string;
  data_folga: string;
  horas_descontar?: number | null;
  observacoes?: string | null;
}

export interface RestDayScheduleFilters {
  employee_id?: string;
  company_id?: string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// SERVIÇO DE ESCALA DE FOLGA
// =====================================================

export const RestDayScheduleService = {
  /**
   * Lista todas as folgas de uma empresa com filtros
   */
  list: async (filters: RestDayScheduleFilters = {}): Promise<{
    data: RestDaySchedule[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    try {
      const result = await EntityService.list<RestDaySchedule>({
        schema: 'rh',
        table: 'rest_day_schedule',
        companyId: filters.company_id || '',
        filters: {
          ...(filters.employee_id && { employee_id: filters.employee_id }),
          ...(filters.data_inicio && { data_folga_gte: filters.data_inicio }),
          ...(filters.data_fim && { data_folga_lte: filters.data_fim }),
        },
        orderBy: 'data_folga',
        orderDirection: 'DESC',
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      });

      // Buscar dados dos funcionários usando EntityService (schema rh),
      // evitando dependência de view public.employees via REST
      const employeesMap = new Map<string, any>();
      const employeeIds = [...new Set(result.data.map(item => item.employee_id))];

      if (employeeIds.length > 0 && filters.company_id) {
        const employeesResult = await EntityService.list<any>({
          schema: 'rh',
          table: 'employees',
          companyId: filters.company_id,
          // Por enquanto buscamos todos os employees da empresa e montamos o mapa em memória.
          // Se necessário, podemos otimizar depois com filtro específico por IDs.
          filters: {},
          orderBy: 'nome',
          orderDirection: 'ASC',
          pageSize: 10000,
        });

        employeesResult.data.forEach(emp => {
          employeesMap.set(emp.id, emp);
        });
      }

      // Adicionar dados dos funcionários aos resultados
      const dataWithEmployees = result.data.map(item => ({
        ...item,
        employee: employeesMap.get(item.employee_id),
      }));

      return {
        data: dataWithEmployees,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error('Erro ao buscar escala de folga:', error);
      throw error;
    }
  },

  /**
   * Busca uma folga por ID
   */
  getById: async (id: string, companyId: string): Promise<RestDaySchedule | null> => {
    try {
      const result = await EntityService.getById({
        schema: 'rh',
        table: 'rest_day_schedule',
        companyId: companyId,
        id: id,
      });

      // Buscar dados do funcionário
      if (result && result.employee_id) {
        const employeesResult = await EntityService.list<any>({
          schema: 'rh',
          table: 'employees',
          companyId,
          filters: { id: result.employee_id },
          orderBy: 'nome',
          orderDirection: 'ASC',
          pageSize: 1,
        });

        const employee = employeesResult.data[0];

        if (employee) {
          return {
            ...result,
            employee,
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Erro ao buscar folga:', error);
      throw error;
    }
  },

  /**
   * Cria uma nova folga e desconta horas do banco de horas
   */
  create: async (
    data: RestDayScheduleInsert,
    userId?: string
  ): Promise<RestDaySchedule> => {
    try {
      // Chamar função do banco que cria a folga e desconta horas
      const result = await callSchemaFunction<string>(
        'rh',
        'create_rest_day_and_deduct_hours',
        {
          p_employee_id: data.employee_id,
          p_company_id: data.company_id,
          p_data_folga: data.data_folga,
          p_horas_descontar: data.horas_descontar || null,
          p_observacoes: data.observacoes || null,
          p_created_by: userId || null,
        }
      );

      if (!result) {
        throw new Error('Erro ao criar folga. A função do banco de dados pode não estar disponível.');
      }

      // Buscar o registro criado
      const restDay = await RestDayScheduleService.getById(result, data.company_id);

      if (!restDay) {
        throw new Error('Erro ao buscar folga criada');
      }

      return restDay;
    } catch (error) {
      console.error('Erro ao criar folga:', error);
      throw error;
    }
  },

  /**
   * Remove uma folga e reverte o débito no banco de horas
   */
  remove: async (id: string): Promise<boolean> => {
    try {
      // Chamar função do banco que remove a folga e reverte o débito
      await callSchemaFunction<boolean>(
        'rh',
        'remove_rest_day_and_revert_deduction',
        {
          p_rest_day_id: id,
        }
      );

      return true;
    } catch (error) {
      console.error('Erro ao remover folga:', error);
      throw error;
    }
  },

  /**
   * Busca folgas de um funcionário em um período
   */
  getByEmployeeAndPeriod: async (
    employeeId: string,
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<RestDaySchedule[]> => {
    try {
      const result = await RestDayScheduleService.list({
        employee_id: employeeId,
        company_id: companyId,
        data_inicio: startDate,
        data_fim: endDate,
        limit: 1000, // Buscar todas do período
      });

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar folgas do funcionário:', error);
      throw error;
    }
  },
};
