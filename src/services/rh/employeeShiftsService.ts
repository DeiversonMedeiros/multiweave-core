import { EntityService } from '@/services/generic/entityService';
import { EmployeeShift } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE TURNOS DE FUNCIONÁRIOS
// =====================================================

export const EmployeeShiftsService = {
  /**
   * Lista todos os turnos de funcionários de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<EmployeeShift>({
        schema: 'rh',
        table: 'employee_shifts',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar turnos de funcionários:', error);
      throw error;
    }
  },

  /**
   * Busca um turno de funcionário por ID
   */
  getById: async (id: string, companyId: string): Promise<EmployeeShift | null> => {
    try {
      const result = await EntityService.list<EmployeeShift>({
        schema: 'rh',
        table: 'employee_shifts',
        companyId: companyId,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar turno de funcionário:', error);
      throw error;
    }
  },

  /**
   * Cria um novo turno de funcionário
   */
  create: async (data: Partial<EmployeeShift>, companyId: string): Promise<EmployeeShift> => {
    try {
      return await EntityService.create<EmployeeShift>({
        schema: 'rh',
        table: 'employee_shifts',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar turno de funcionário:', error);
      throw error;
    }
  },

  /**
   * Atualiza um turno de funcionário
   */
  update: async (id: string, data: Partial<EmployeeShift>, companyId: string): Promise<EmployeeShift> => {
    try {
      return await EntityService.update<EmployeeShift>({
        schema: 'rh',
        table: 'employee_shifts',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar turno de funcionário:', error);
      throw error;
    }
  },

  /**
   * Remove um turno de funcionário
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'employee_shifts',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover turno de funcionário:', error);
      throw error;
    }
  }
};
