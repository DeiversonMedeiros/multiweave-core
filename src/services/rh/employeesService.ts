import { EntityService } from '@/services/generic/entityService';
import { 
  Employee, 
  EmployeeInsert, 
  EmployeeUpdate,
  EmployeeFilters
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE FUNCIONÁRIOS
// =====================================================

export const EmployeesService = {
  /**
   * Lista todos os funcionários de uma empresa
   */
  list: async (companyId: string, filters?: EmployeeFilters) => {
    try {
      // Preparar filtros para a busca
      const searchFilters: any = {};
      
      // Se houver filtro de status, aplicar
      if (filters?.status) {
        searchFilters.status = filters.status;
      }
      
      // Se houver busca por texto, aplicar
      if (filters?.search) {
        searchFilters.search = filters.search;
      }
      
      // Aplicar outros filtros
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (key !== 'search' && key !== 'status' && filters[key]) {
            searchFilters[key] = filters[key];
          }
        });
      }

      console.log('🔍 [EmployeesService.list] Buscando funcionários:', {
        companyId,
        filters: searchFilters,
        pageSize: 10000
      });

      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId,
        filters: searchFilters,
        orderBy: 'nome',
        orderDirection: 'ASC',
        pageSize: 10000 // Aumentar limite para garantir que todos os funcionários sejam retornados
      });

      console.log('✅ [EmployeesService.list] Resultado:', {
        dataCount: result.data.length,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

      // Retornar objeto com data e count para compatibilidade com a página
      return {
        data: result.data,
        count: result.totalCount
      };
    } catch (error) {
      console.error('❌ Erro ao buscar funcionários:', error);
      return {
        data: [],
        count: 0
      };
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