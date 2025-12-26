import { EntityService } from '@/services/generic/entityService';
import { 
  Employee, 
  EmployeeInsert, 
  EmployeeUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE FUNCIONÁRIOS
// =====================================================

export const EmployeesService = {
  /**
   * Lista todos os funcionários de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId,
        filters: { status: 'ativo' }, // Restaurando filtro de status
        orderBy: 'nome',
        orderDirection: 'ASC',
        pageSize: 5000 // Aumentar limite para garantir que todos os funcionários sejam retornados
      });

      return result.data;
    } catch (error) {
      console.error('❌ Erro ao buscar funcionários:', error);
      return [];
    }
  },

  /**
   * Busca um funcionário por ID
   */
  getById: async (id: string, companyId: string): Promise<Employee | null> => {
    return await EntityService.getById<Employee>('rh', 'employees', id, companyId);
  },

  /**
   * Busca funcionário por user_id
   */
  getByUserId: async (userId: string, companyId: string): Promise<Employee | null> => {
    try {
      if (!userId || !companyId) {
        console.warn('User ID ou Company ID não fornecidos para buscar funcionário');
        return null;
      }

      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId,
        filters: { user_id: userId }
      });

      return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar funcionário por user_id:', error);
      return null;
    }
  },

  /**
   * Cria um novo funcionário
   */
  create: async (employee: EmployeeInsert, companyId: string): Promise<Employee> => {
    return await EntityService.create<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId,
      data: employee
    });
  },

  /**
   * Atualiza um funcionário
   */
  update: async (id: string, employee: EmployeeUpdate, companyId: string): Promise<Employee> => {
    return await EntityService.update<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId,
      id,
      data: employee
    });
  },

  /**
   * Remove um funcionário
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    return await EntityService.delete({
      schema: 'rh',
      table: 'employees',
      companyId,
      id
    });
  },

  /**
   * Busca funcionários ativos
   */
  getActive: async (companyId: string): Promise<Employee[]> => {
    const result = await EntityService.list<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId,
      filters: { status: 'ativo' },
      orderBy: 'nome',
      orderDirection: 'ASC',
      pageSize: 5000 // Aumentar limite para garantir que todos os funcionários sejam retornados
    });

    return result.data;
  },

  /**
   * Busca funcionários por departamento
   */
  getByDepartment: async (departmentId: string, companyId: string): Promise<Employee[]> => {
    const result = await EntityService.list<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId,
      filters: { departamento_id: departmentId },
      orderBy: 'nome',
      orderDirection: 'ASC',
      pageSize: 5000 // Aumentar limite para garantir que todos os funcionários sejam retornados
    });

    return result.data;
  },

  /**
   * Busca funcionários por cargo
   */
  getByPosition: async (positionId: string, companyId: string): Promise<Employee[]> => {
    const result = await EntityService.list<Employee>({
      schema: 'rh',
      table: 'employees',
      companyId,
      filters: { cargo_id: positionId },
      orderBy: 'nome',
      orderDirection: 'ASC',
      pageSize: 5000 // Aumentar limite para garantir que todos os funcionários sejam retornados
    });

    return result.data;
  }
};