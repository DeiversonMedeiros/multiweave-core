import { supabase } from '@/integrations/supabase/client';
import { 
  Employee, 
  EmployeeInsert, 
  EmployeeUpdate, 
  EmployeeFilters 
} from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// SERVIÇO DE FUNCIONÁRIOS
// =====================================================

export const EmployeesService = {
  /**
   * Lista todos os funcionários de uma empresa
   */
  list: async (params: { 
    companyId: string; 
    filters?: EmployeeFilters;
    page?: number;
    pageSize?: number;
  }) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: params.companyId,
        filters: params.filters || {},
        orderBy: 'nome',
        orderDirection: 'ASC'
      });

      return {
        data: result.data,
        totalCount: result.totalCount
      };
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      throw error;
    }
  },

  /**
   * Busca um funcionário por ID
   */
  getById: async (id: string, companyId: string): Promise<Employee | null> => {
    try {
      return await EntityService.getById<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      throw error;
    }
  },

  /**
   * Cria um novo funcionário
   */
  create: async (employee: EmployeeInsert): Promise<Employee> => {
    try {
      return await EntityService.create<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: employee.company_id,
        data: employee
      });
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      throw error;
    }
  },

  /**
   * Atualiza um funcionário
   */
  update: async (id: string, employee: EmployeeUpdate, companyId: string): Promise<Employee> => {
    try {
      return await EntityService.update<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        id: id,
        data: employee
      });
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      throw error;
    }
  },

  /**
   * Remove um funcionário
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      throw error;
    }
  },

  /**
   * Busca funcionários ativos
   */
  getActive: async (companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { status: 'ativo' },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários ativos:', error);
      throw error;
    }
  },

  /**
   * Busca funcionários por departamento
   */
  getByDepartment: async (departmentId: string, companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { departamento_id: departmentId },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários por departamento:', error);
      throw error;
    }
  },

  /**
   * Busca funcionários por cargo
   */
  getByPosition: async (positionId: string, companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { cargo_id: positionId },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários por cargo:', error);
      throw error;
    }
  },

  /**
   * Busca funcionário por CPF
   */
  getByCpf: async (cpf: string, companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { cpf: cpf },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar funcionário por CPF:', error);
      throw error;
    }
  },

  /**
   * Busca funcionário por matrícula
   */
  getByMatricula: async (matricula: string, companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { matricula: matricula },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar funcionário por matrícula:', error);
      throw error;
    }
  },

  /**
   * Estatísticas dos funcionários
   */
  getStats: async (companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: {},
        orderBy: 'nome',
        orderDirection: 'ASC'
      });

      const employees = result.data;
      const stats = {
        total: employees.length,
        ativos: employees.filter(emp => emp.status === 'ativo').length,
        inativos: employees.filter(emp => emp.status === 'inativo').length,
        por_departamento: employees.reduce((acc, emp) => {
          acc[emp.departamento_id || 'sem_departamento'] = (acc[emp.departamento_id || 'sem_departamento'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        por_cargo: employees.reduce((acc, emp) => {
          acc[emp.cargo_id || 'sem_cargo'] = (acc[emp.cargo_id || 'sem_cargo'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  /**
   * Alterna status do funcionário
   */
  toggleStatus: async (id: string, status: 'ativo' | 'inativo', companyId: string) => {
    try {
      return await EntityService.update<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        id: id,
        data: { status }
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      throw error;
    }
  },

  /**
   * Valida CPF único
   */
  validateCpf: async (cpf: string, companyId: string, excludeId?: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { cpf: cpf },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });

      const employee = result.data.find(emp => emp.id !== excludeId);
      return !employee; // Retorna true se não encontrou (CPF válido)
    } catch (error) {
      console.error('Erro ao validar CPF:', error);
      throw error;
    }
  },

  /**
   * Valida matrícula única
   */
  validateMatricula: async (matricula: string, companyId: string, excludeId?: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { matricula: matricula },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });

      const employee = result.data.find(emp => emp.id !== excludeId);
      return !employee; // Retorna true se não encontrou (matrícula válida)
    } catch (error) {
      console.error('Erro ao validar matrícula:', error);
      throw error;
    }
  },

  /**
   * Gera próxima matrícula
   */
  generateNextMatricula: async (companyId: string) => {
    try {
      const result = await EntityService.list<Employee>({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: {},
        orderBy: 'matricula',
        orderDirection: 'DESC'
      });

      const employees = result.data;
      const lastMatricula = employees[0]?.matricula;
      
      if (!lastMatricula) {
        return '001';
      }

      const nextNumber = parseInt(lastMatricula) + 1;
      return nextNumber.toString().padStart(3, '0');
    } catch (error) {
      console.error('Erro ao gerar próxima matrícula:', error);
      throw error;
    }
  }
};